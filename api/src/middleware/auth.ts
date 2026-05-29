import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { query } from '../db/connection.js'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET env var is required. Set it in .env.docker or docker-compose.')
  process.exit(1)
}

export interface AuthUser {
  userId: string
  rol: string
  nombre: string
  email: string
  jti?: string
  iat?: number
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Token requerido' })
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser

    if ((decoded as any).type === 'refresh') {
      return res.status(401).json({ error: 'Use refresh token endpoint for token rotation' })
    }

    if (decoded.userId) {
      const invalidated = await isUserInvalidated(decoded.userId, decoded.jti)
      if (invalidated) {
        return res.status(401).json({ error: 'Sesion invalidada' })
      }
    }

    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'Token invalido o expirado' })
  }
}

export async function isUserInvalidated(userId: string, jti?: string): Promise<boolean> {
  try {
    const userResult = await query(
      "SELECT id FROM token_blacklist WHERE user_id = $1 AND token_jti LIKE 'user-deleted-%'",
      [userId]
    )
    if (userResult.rows.length > 0) return true

    if (jti) {
      const tokenResult = await query('SELECT id FROM token_blacklist WHERE token_jti = $1', [jti])
      if (tokenResult.rows.length > 0) return true
    }

    return false
  } catch {
    return false
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' })
  }
  if (req.user.rol !== 'Admin') {
    return res.status(403).json({ error: 'Se requiere rol Admin' })
  }
  next()
}

export function generateToken(user: { id: string; rol: string; nombre: string; email: string }): string {
  const jti = crypto.randomUUID()
  return jwt.sign(
    { userId: user.id, rol: user.rol, nombre: user.nombre, email: user.email, jti },
    JWT_SECRET,
    { expiresIn: '30m' }
  )
}

export function generateRefreshToken(user: { id: string; rol: string; nombre: string; email: string }): string {
  const jti = crypto.randomUUID()
  return jwt.sign(
    { userId: user.id, rol: user.rol, nombre: user.nombre, email: user.email, type: 'refresh', jti },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export async function blacklistAllUserTokens(userId: string): Promise<void> {
  try {
    await query(
      `INSERT INTO token_blacklist (user_id, token_jti) VALUES ($1, $2)`,
      [userId, `user-deleted-${userId}`]
    )
    await query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`,
      [userId]
    )
  } catch (error) {
    console.error('Failed to blacklist user tokens:', (error as Error).message)
    throw error
  }
}

export async function blacklistToken(userId: string, jti: string): Promise<void> {
  try {
    await query(
      `INSERT INTO token_blacklist (user_id, token_jti) VALUES ($1, $2)`,
      [userId, jti]
    )
  } catch (error) {
    console.error('Failed to blacklist token:', (error as Error).message)
    throw error
  }
}

export async function saveRefreshToken(userId: string, jti: string, expiresAt: Date): Promise<void> {
  try {
    await query(
      `INSERT INTO refresh_tokens (user_id, token_jti, expires_at) VALUES ($1, $2, $3)`,
      [userId, jti, expiresAt]
    )
  } catch (error) {
    console.error('Failed to save refresh token:', (error as Error).message)
  }
}

export async function isRefreshTokenValid(jti: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT id FROM refresh_tokens WHERE token_jti = $1 AND revoked = FALSE AND expires_at > NOW()`,
      [jti]
    )
    return result.rows.length > 0
  } catch {
    return false
  }
}

export async function revokeRefreshToken(jti: string): Promise<void> {
  try {
    await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE token_jti = $1`, [jti])
  } catch (error) {
    console.error('Failed to revoke refresh token:', (error as Error).message)
  }
}

export { JWT_SECRET }
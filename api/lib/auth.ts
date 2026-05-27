import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'gantt-bi-epem-jwt-secret-2026'

export interface AuthUser {
  userId: string
  rol: string
  nombre: string
  email: string
}

export function verifyAuth(request: NextRequest): AuthUser | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader

  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser
  } catch {
    return null
  }
}

export function requireAuth(request: NextRequest): AuthUser | NextResponse {
  const user = verifyAuth(request)
  if (!user) {
    return NextResponse.json({ error: 'Token requerido o invalido' }, { status: 401 })
  }
  return user
}

export function requireAdmin(user: AuthUser): NextResponse | null {
  if (user.rol !== 'Admin') {
    return NextResponse.json({ error: 'Se requiere rol Admin' }, { status: 403 })
  }
  return null
}

export function generateToken(user: { id: string; rol: string; nombre: string; email: string }): string {
  const jti = crypto.randomUUID()
  return jwt.sign(
    { userId: user.id, rol: user.rol, nombre: user.nombre, email: user.email, jti },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
}

export { JWT_SECRET }
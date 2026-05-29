import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../db/connection.js'
import { authMiddleware, requireAdmin, generateToken, generateRefreshToken, blacklistAllUserTokens, blacklistToken, isRefreshTokenValid, saveRefreshToken, revokeRefreshToken } from '../middleware/auth.js'
import { validateUUID, validateEmail } from '../middleware/validators.js'

const router = Router()

const VALID_ROLES = ['Admin', 'Usuario']

const DUMMY_HASH = '$2b$10$000000000000000000000uQ9MxY0Zz0Z3qZ5y7R8G9a0b1c2d3e4f'

const PASSWORD_MIN_LENGTH = 8

router.post('/login', async (req, res) => {
  try {
    const { usuario, password } = req.body
    if (!usuario || !password) {
      return res.status(400).json({ error: 'Usuario y password son requeridos' })
    }

    const result = await query('SELECT id, nombre, email, avatar, color, rol, password, fecha_creacion, ultimo_acceso, debe_cambiar_password FROM users WHERE LOWER(nombre) = LOWER($1) OR email = $1', [usuario])

    if (result.rows.length === 0) {
      await bcrypt.compare(password, DUMMY_HASH)
      return res.status(401).json({ error: 'Credenciales invalidas' })
    }

    const user = result.rows[0]
    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales invalidas' })
    }

    await query('UPDATE users SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1', [user.id])

    const token = generateToken({ id: user.id, rol: user.rol, nombre: user.nombre, email: user.email })
    const refreshToken = generateRefreshToken({ id: user.id, rol: user.rol, nombre: user.nombre, email: user.email })
    const refreshTokenJti = (jwt.decode(refreshToken) as any).jti
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await saveRefreshToken(user.id, refreshTokenJti, refreshTokenExpiry)

    const { password: _, ...userWithoutPassword } = user
    res.json({ ...userWithoutPassword, token, refreshToken })
  } catch (error) {
    console.error('Error during login:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// Token refresh (authenticated) - rotates both access and refresh tokens
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId
    const oldJti = req.user!.jti

    const result = await query(
      'SELECT id, nombre, email, avatar, color, rol, fecha_creacion, ultimo_acceso, debe_cambiar_password FROM users WHERE id = $1',
      [userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = result.rows[0]
    const newAccessToken = generateToken({ id: user.id, rol: user.rol, nombre: user.nombre, email: user.email })
    const newRefreshToken = generateRefreshToken({ id: user.id, rol: user.rol, nombre: user.nombre, email: user.email })

    const refreshTokenJti = (jwt.decode(newRefreshToken) as any).jti
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await saveRefreshToken(userId, refreshTokenJti, refreshTokenExpiry)

    if (oldJti) {
      await blacklistToken(userId, oldJti)
    }

    await query('UPDATE users SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1', [userId])

    res.json({ user, token: newAccessToken, refreshToken: newRefreshToken })
  } catch (error) {
    console.error('Error refreshing token:', error)
    res.status(500).json({ error: 'Failed to refresh token' })
  }
})

// Change password (authenticated - same user or admin)
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user!.userId

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' })
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ error: `New password must be at least ${PASSWORD_MIN_LENGTH} characters` })
    }

    const result = await query('SELECT id, nombre, email, avatar, color, rol, password, debe_cambiar_password FROM users WHERE id = $1', [userId])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = result.rows[0]
    const validPassword = await bcrypt.compare(currentPassword, user.password)

    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await query(
      'UPDATE users SET password = $1, debe_cambiar_password = FALSE WHERE id = $2',
      [hashedPassword, userId]
    )

    if (req.user!.jti) {
      await blacklistToken(userId, req.user!.jti)
    }

    const updatedToken = generateToken({ id: userId, rol: user.rol, nombre: user.nombre, email: user.email })

    res.json({ message: 'Password changed successfully', token: updatedToken })
  } catch (error) {
    console.error('Error changing password:', error)
    res.status(500).json({ error: 'Failed to change password' })
  }
})

// Get all users (authenticated)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 100, offset = 0, search } = req.query
    let sql = `SELECT id, nombre, email, avatar, color, rol, fecha_creacion, ultimo_acceso, debe_cambiar_password FROM users WHERE 1=1`
    const params: unknown[] = []
    let paramCount = 0

    if (search) {
      paramCount++
      params.push(`%${search}%`)
      sql += ` AND (nombre ILIKE $${paramCount} OR email ILIKE $${paramCount})`
    }

    sql += ' ORDER BY nombre'

    paramCount++
    params.push(Number(limit))
    sql += ` LIMIT $${paramCount}`

    paramCount++
    params.push(Number(offset))
    sql += ` OFFSET $${paramCount}`

    const result = await query(sql, params)
    const countResult = await query('SELECT COUNT(*) FROM users', [])
    const total = parseInt(countResult.rows[0].count)

    res.json({
      data: result.rows,
      total,
      limit: Number(limit),
      offset: Number(offset)
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// Get user by ID (authenticated)
router.get('/:id', authMiddleware, validateUUID('id'), async (req, res) => {
  try {
    const result = await query('SELECT id, nombre, email, avatar, color, rol, fecha_creacion, ultimo_acceso, debe_cambiar_password FROM users WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching user:', error)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// Create user (admin only)
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { nombre, email, rol, password } = req.body

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` })
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    if (nombre.trim().length < 2 || nombre.length > 255) {
      return res.status(400).json({ error: 'Name must be between 2 and 255 characters' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const avatar = nombre.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
    const colors = ['#4f46e5', '#7c3aed', '#059669', '#dc2626', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899']
    const color = colors[Math.floor(Math.random() * colors.length)]

    const result = await query(
      `INSERT INTO users (nombre, email, avatar, color, rol, password, debe_cambiar_password) 
       VALUES ($1, $2, $3, $4, $5, $6, TRUE) 
       RETURNING id, nombre, email, avatar, color, rol, fecha_creacion`,
      [nombre.trim(), email.toLowerCase().trim(), avatar, color, rol || 'Usuario', hashedPassword]
    )

    res.status(201).json(result.rows[0])
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' })
    }
    console.error('Error creating user:', error)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

// Update user (admin only)
router.put('/:id', authMiddleware, requireAdmin, validateUUID('id'), async (req, res) => {
  try {
    const { nombre, email, rol, password } = req.body
    const updates: string[] = []
    const values: unknown[] = []
    let paramCount = 1

    if (nombre) {
      if (nombre.trim().length < 2 || nombre.length > 255) {
        return res.status(400).json({ error: 'Name must be between 2 and 255 characters' })
      }
      updates.push(`nombre = $${paramCount++}`)
      values.push(nombre.trim())
    }
    if (email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' })
      }
      updates.push(`email = $${paramCount++}`)
      values.push(email.toLowerCase().trim())
    }
    if (rol && !VALID_ROLES.includes(rol)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` })
    }
    if (rol) {
      updates.push(`rol = $${paramCount++}`)
      values.push(rol)
    }
    if (password) {
      if (password.length < PASSWORD_MIN_LENGTH) {
        return res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` })
      }
      updates.push(`password = $${paramCount++}`)
      values.push(await bcrypt.hash(password, 10))
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    values.push(req.params.id)
    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} 
       RETURNING id, nombre, email, avatar, color, rol, fecha_creacion`,
      values
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (password) {
      await blacklistAllUserTokens(req.params.id)
    }

    res.json(result.rows[0])
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' })
    }
    console.error('Error updating user:', error)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

// Reset user password (admin only) - sets debe_cambiar_password=TRUE
router.put('/:id/reset-password', authMiddleware, requireAdmin, validateUUID('id'), async (req, res) => {
  try {
    const { password } = req.body
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await query(
      'UPDATE users SET password = $1, debe_cambiar_password = TRUE WHERE id = $2 RETURNING id, nombre, email, rol, debe_cambiar_password',
      [hashedPassword, req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    await blacklistAllUserTokens(req.params.id)

    res.json({ ...result.rows[0], message: 'Password reset. User must change on next login.' })
  } catch (error) {
    console.error('Error resetting password:', error)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

// Delete user (admin only)
router.delete('/:id', authMiddleware, requireAdmin, validateUUID('id'), async (req, res) => {
  try {
    if (req.params.id === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' })
    }

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    await blacklistAllUserTokens(req.params.id)

    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

export default router
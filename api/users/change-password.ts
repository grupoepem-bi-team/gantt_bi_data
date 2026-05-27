import { NextRequest, NextResponse } from 'next/server'
import { sql } from '../lib/db'
import { requireAuth } from '../lib/auth'
import bcrypt from 'bcryptjs'
import { generateToken } from '../lib/auth'

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { currentPassword, newPassword } = await request.json()
    const userId = authResult.userId

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
    }

    const result = await sql('SELECT * FROM users WHERE id = $1', [userId])
    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = result[0]
    const validPassword = await bcrypt.compare(currentPassword, user.password)
    if (!validPassword) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await sql(
      'UPDATE users SET password = $1, debe_cambiar_password = FALSE WHERE id = $2',
      [hashedPassword, userId]
    )

    const updatedToken = generateToken({ id: userId, rol: user.rol, nombre: user.nombre, email: user.email })

    return NextResponse.json({ message: 'Password changed successfully', token: updatedToken })
  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
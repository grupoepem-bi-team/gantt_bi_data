import { NextRequest, NextResponse } from 'next/server'
import { sql } from '../lib/db'
import { generateToken } from '../lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { usuario, password } = await request.json()

    if (!usuario || !password) {
      return NextResponse.json({ error: 'Usuario y password son requeridos' }, { status: 400 })
    }

    const result = await sql('SELECT * FROM users WHERE nombre ILIKE $1 OR email = $1', [usuario])

    if (result.length === 0) {
      return NextResponse.json({ error: 'Credenciales invalidas' }, { status: 401 })
    }

    const user = result[0]
    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) {
      return NextResponse.json({ error: 'Credenciales invalidas' }, { status: 401 })
    }

    await sql('UPDATE users SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1', [user.id])

    const token = generateToken({ id: user.id, rol: user.rol, nombre: user.nombre, email: user.email })
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({ ...userWithoutPassword, token })
  } catch (error) {
    console.error('Error during login:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
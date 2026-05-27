import { NextRequest, NextResponse } from 'next/server'
import { sql } from '../lib/db'
import { requireAuth, requireAdmin } from '../lib/auth'

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '100'
    const offset = searchParams.get('offset') || '0'
    const search = searchParams.get('search')

    let queryStr = `SELECT id, nombre, email, avatar, color, rol, fecha_creacion, ultimo_acceso, debe_cambiar_password FROM users WHERE 1=1`
    const params: any[] = []
    let paramCount = 0

    if (search) {
      paramCount++
      params.push(`%${search}%`)
      queryStr += ` AND (nombre ILIKE $${paramCount} OR email ILIKE $${paramCount})`
    }

    queryStr += ' ORDER BY nombre'

    paramCount++
    params.push(Number(limit))
    queryStr += ` LIMIT $${paramCount}`

    paramCount++
    params.push(Number(offset))
    queryStr += ` OFFSET $${paramCount}`

    const result = await sql(queryStr, params)
    const countResult = await sql('SELECT COUNT(*) FROM users')
    const total = parseInt(countResult[0].count as string)

    return NextResponse.json({ data: result, total, limit: Number(limit), offset: Number(offset) })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const adminResult = requireAdmin(authResult)
  if (adminResult) return adminResult

  try {
    const { nombre, email, rol, password } = await request.json()

    if (!nombre || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const avatar = nombre.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
    const colors = ['#4f46e5', '#7c3aed', '#059669', '#dc2626', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899']
    const color = colors[Math.floor(Math.random() * colors.length)]

    const result = await sql(
      `INSERT INTO users (nombre, email, avatar, color, rol, password, debe_cambiar_password) 
       VALUES ($1, $2, $3, $4, $5, $6, TRUE) 
       RETURNING id, nombre, email, avatar, color, rol, fecha_creacion`,
      [nombre, email, avatar, color, rol || 'Usuario', hashedPassword]
    )

    return NextResponse.json(result[0], { status: 201 })
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
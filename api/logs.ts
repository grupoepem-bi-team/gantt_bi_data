import { NextRequest, NextResponse } from 'next/server'
import { sql } from './lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '100'
    const offset = searchParams.get('offset') || '0'

    const result = await sql(
      `SELECT * FROM activity_logs ORDER BY fecha DESC LIMIT $1 OFFSET $2`,
      [Number(limit), Number(offset)]
    )
    return NextResponse.json({ data: result, total: result.length })
  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user_id, accion, detalle } = await request.json()
    const result = await sql(
      `INSERT INTO activity_logs (user_id, accion, detalle) VALUES ($1, $2, $3) RETURNING *`,
      [user_id, accion, detalle]
    )
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error('Error creating log:', error)
    return NextResponse.json({ error: 'Failed to create log' }, { status: 500 })
  }
}
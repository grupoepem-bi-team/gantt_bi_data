import { NextRequest, NextResponse } from 'next/server'
import { sql } from './lib/db'

export async function GET() {
  try {
    const result = await sql('SELECT * FROM gantt_rows ORDER BY orden')
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching rows:', error)
    return NextResponse.json({ error: 'Failed to fetch rows' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { label, orden } = await request.json()
    if (!label) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 })
    }

    const result = await sql(
      'INSERT INTO gantt_rows (label, orden) VALUES ($1, $2) RETURNING *',
      [label, orden || 0]
    )
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error('Error creating row:', error)
    return NextResponse.json({ error: 'Failed to create row' }, { status: 500 })
  }
}
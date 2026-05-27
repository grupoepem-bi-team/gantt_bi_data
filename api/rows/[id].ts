import { NextRequest, NextResponse } from 'next/server'
import { sql } from '../lib/db'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { label, orden } = await request.json()
    const result = await sql(
      'UPDATE gantt_rows SET label = COALESCE($1, label), orden = COALESCE($2, orden) WHERE id = $3 RETURNING *',
      [label, orden, params.id]
    )
    if (result.length === 0) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 })
    }
    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error updating row:', error)
    return NextResponse.json({ error: 'Failed to update row' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const countResult = await sql(
      'SELECT COUNT(*) as count FROM gantt_items WHERE row_id = $1',
      [params.id]
    )
    const itemCount = parseInt(countResult[0].count as string)

    if (itemCount > 0) {
      return NextResponse.json({ error: 'Cannot delete row with tasks', itemCount }, { status: 400 })
    }

    const result = await sql('DELETE FROM gantt_rows WHERE id = $1 RETURNING id', [params.id])
    if (result.length === 0) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 })
    }
    return NextResponse.json({ message: 'Row deleted successfully' })
  } catch (error) {
    console.error('Error deleting row:', error)
    return NextResponse.json({ error: 'Failed to delete row' }, { status: 500 })
  }
}
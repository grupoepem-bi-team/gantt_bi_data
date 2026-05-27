import { NextRequest, NextResponse } from 'next/server'
import { sql } from '../lib/db'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { label, row_id, time_start, time_end, progress, color } = await request.json()
    const result = await sql(
      `UPDATE gantt_items SET 
        label = COALESCE($1, label),
        row_id = COALESCE($2, row_id),
        time_start = COALESCE($3, time_start),
        time_end = COALESCE($4, time_end),
        progress = COALESCE($5, progress),
        color = COALESCE($6, color)
       WHERE id = $7 RETURNING *`,
      [label, row_id, time_start, time_end, progress, color, params.id]
    )

    if (result.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error updating item:', error)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await sql('DELETE FROM gantt_item_assignments WHERE item_id = $1', [params.id])
    const result = await sql('DELETE FROM gantt_items WHERE id = $1 RETURNING id', [params.id])

    if (result.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
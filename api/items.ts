import { NextRequest, NextResponse } from 'next/server'
import { sql } from './lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const row_id = searchParams.get('row_id')
    const assigned_user_id = searchParams.get('assigned_user_id')
    const search = searchParams.get('search')
    const created_by = searchParams.get('created_by')

    let queryStr = `SELECT * FROM gantt_items WHERE 1=1`
    const params: any[] = []
    let paramCount = 0

    if (row_id) {
      paramCount++
      params.push(row_id)
      queryStr += ` AND row_id = $${paramCount}`
    }

    if (assigned_user_id) {
      paramCount++
      params.push(assigned_user_id)
      queryStr += ` AND id IN (SELECT item_id FROM gantt_item_assignments WHERE user_id = $${paramCount})`
    }

    if (created_by) {
      paramCount++
      params.push(created_by)
      queryStr += ` AND created_by = $${paramCount}`
    }

    if (search) {
      paramCount++
      params.push(`%${search}%`)
      queryStr += ` AND label ILIKE $${paramCount}`
    }

    queryStr += ' ORDER BY time_start'
    const result = await sql(queryStr, params)

    const itemsWithAssignments = await Promise.all(result.map(async (item: any) => {
      const assignments = await sql(
        'SELECT user_id FROM gantt_item_assignments WHERE item_id = $1',
        [item.id]
      )
      return {
        ...item,
        assignedUserIds: assignments.map((a: any) => a.user_id),
        assignedUserId: assignments[0]?.user_id || null
      }
    }))

    return NextResponse.json({ data: itemsWithAssignments, total: itemsWithAssignments.length })
  } catch (error) {
    console.error('Error fetching items:', error)
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const item = await request.json()
    const id = item.id || uuidv4()

    await sql(
      `INSERT INTO gantt_items (id, row_id, label, time_start, time_end, progress, color, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, item.rowId, item.label, item.time.start, item.time.end, item.progress || 0, item.color || '#2563eb', item.createdBy]
    )

    if (item.assignedUserIds && item.assignedUserIds.length > 0) {
      for (const userId of item.assignedUserIds) {
        await sql(
          'INSERT INTO gantt_item_assignments (item_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, userId]
        )
      }
    }

    const result = await sql('SELECT * FROM gantt_items WHERE id = $1', [id])
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error('Error creating item:', error)
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }
}
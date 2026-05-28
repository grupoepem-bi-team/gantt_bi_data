import { Router } from 'express'
import { query, getClient } from '../db/connection.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'
import { validateUUID } from '../middleware/validators.js'

const router = Router()

const ALLOWED_ITEM_FIELDS = new Set([
  'label', 'row_id', 'time_start', 'time_end', 'progress', 'assigned_user_id', 'created_by'
])

async function getItemAssignments(itemIds: string[]): Promise<Map<string, string[]>> {
  if (itemIds.length === 0) return new Map()
  const placeholders = itemIds.map((_, i) => `$${i + 1}`).join(',')
  const result = await query(
    `SELECT item_id, user_id FROM gantt_item_assignments WHERE item_id IN (${placeholders})`,
    itemIds
  )
  const map = new Map<string, string[]>()
  for (const row of result.rows) {
    const list = map.get(row.item_id) || []
    list.push(row.user_id)
    map.set(row.item_id, list)
  }
  return map
}

async function setItemAssignments(itemId: string, userIds: string[]) {
  await query('DELETE FROM gantt_item_assignments WHERE item_id = $1', [itemId])
  if (userIds.length > 0) {
    const values = userIds.map((_, i) => `($1, $${i + 2})`).join(', ')
    await query(
      `INSERT INTO gantt_item_assignments (item_id, user_id) VALUES ${values} ON CONFLICT DO NOTHING`,
      [itemId, ...userIds]
    )
  }
}

// Get all items with pagination, filters, and search (authenticated)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      row_id,
      assigned_user_id,
      progress_min,
      progress_max,
      date_from,
      date_to,
      search,
      limit = 100,
      offset = 0
    } = req.query

    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500)
    const safeOffset = Math.max(Number(offset) || 0, 0)

    if (search && String(search).length > 100) {
      return res.status(400).json({ error: 'Search query too long' })
    }

    let sql = 'SELECT * FROM gantt_items WHERE 1=1'
    const params: unknown[] = []
    let paramCount = 0

    if (row_id) {
      paramCount++
      params.push(row_id)
      sql += ` AND row_id = $${paramCount}`
    }

    if (assigned_user_id) {
      paramCount++
      params.push(assigned_user_id)
      sql += ` AND (assigned_user_id = $${paramCount} OR id IN (SELECT item_id FROM gantt_item_assignments WHERE user_id = $${paramCount}))`
    }

    if (progress_min !== undefined) {
      const val = Number(progress_min)
      if (isNaN(val)) return res.status(400).json({ error: 'progress_min must be a number' })
      paramCount++
      params.push(val)
      sql += ` AND progress >= $${paramCount}`
    }

    if (progress_max !== undefined) {
      const val = Number(progress_max)
      if (isNaN(val)) return res.status(400).json({ error: 'progress_max must be a number' })
      paramCount++
      params.push(val)
      sql += ` AND progress <= $${paramCount}`
    }

    if (date_from) {
      const d = new Date(String(date_from))
      if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid date_from format' })
      paramCount++
      params.push(String(date_from))
      sql += ` AND time_start >= $${paramCount}`
    }

    if (date_to) {
      const d = new Date(String(date_to))
      if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid date_to format' })
      paramCount++
      params.push(String(date_to))
      sql += ` AND time_end <= $${paramCount}`
    }

    if (search) {
      paramCount++
      params.push(`%${search}%`)
      sql += ` AND label ILIKE $${paramCount}`
    }

    sql += ' ORDER BY time_start'

    paramCount++
    params.push(safeLimit)
    sql += ` LIMIT $${paramCount}`

    paramCount++
    params.push(safeOffset)
    sql += ` OFFSET $${paramCount}`

    const result = await query(sql, params)

    const countResult = await query('SELECT COUNT(*) FROM gantt_items WHERE 1=1', [])
    const total = parseInt(countResult.rows[0].count)

    const itemIds = result.rows.map((r: any) => r.id)
    const assignmentsMap = await getItemAssignments(itemIds)

    const items = result.rows.map((row: any) => ({
      ...row,
      assigned_user_ids: assignmentsMap.get(row.id) || []
    }))

    res.json({
      data: items,
      total,
      limit: safeLimit,
      offset: safeOffset
    })
  } catch (error) {
    console.error('Error fetching items:', error)
    res.status(500).json({ error: 'Failed to fetch items' })
  }
})

// Bulk create items (admin only)
router.post('/bulk', authMiddleware, requireAdmin, async (req, res) => {
  const client = await getClient()
  try {
    const { items } = req.body

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' })
    }

    if (items.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 items per bulk operation' })
    }

    await client.query('BEGIN')

    const createdItems = []
    for (const item of items) {
      const { label, row_id, time_start, time_end, progress, assigned_user_id, created_by, assigned_user_ids } = item

      if (!label || !row_id || !time_start || !time_end) {
        continue
      }

      if (new Date(time_end) <= new Date(time_start)) {
        continue
      }

      if (label.length > 255) {
        continue
      }

      const result = await client.query(
        `INSERT INTO gantt_items (label, row_id, time_start, time_end, progress, assigned_user_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [label, row_id, time_start, time_end, progress || 0, assigned_user_id || null, created_by || req.user!.userId]
      )

      const inserted = result.rows[0]
      const userIds = assigned_user_ids || (assigned_user_id ? [assigned_user_id] : [])
      if (userIds.length > 0) {
        await client.query('DELETE FROM gantt_item_assignments WHERE item_id = $1', [inserted.id])
        for (const uid of userIds) {
          await client.query(
            'INSERT INTO gantt_item_assignments (item_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [inserted.id, uid]
          )
        }
      }
      inserted.assigned_user_ids = userIds
      createdItems.push(inserted)
    }

    await client.query('COMMIT')
    res.status(201).json({ data: createdItems })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error bulk creating items:', error)
    res.status(500).json({ error: 'Failed to bulk create items' })
  } finally {
    client.release()
  }
})

// Bulk update items (admin only)
router.put('/bulk', authMiddleware, requireAdmin, async (req, res) => {
  const client = await getClient()
  try {
    const { updates } = req.body

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array is required' })
    }

    if (updates.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 updates per bulk operation' })
    }

    await client.query('BEGIN')

    const updatedItems = []
    for (const update of updates) {
      const { id, assigned_user_ids, ...fields } = update
      if (!id) continue

      const setClauses: string[] = []
      const values: unknown[] = [id]
      let paramCount = 1

      for (const [key, value] of Object.entries(fields)) {
        if (!ALLOWED_ITEM_FIELDS.has(key) || value === undefined) continue
        paramCount++
        setClauses.push(`${key} = $${paramCount}`)
        values.push(value)
      }

      if (setClauses.length > 0) {
        setClauses.push('fecha_actualizacion = CURRENT_TIMESTAMP')
        values[0] = id
        const result = await client.query(
          `UPDATE gantt_items SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
          values
        )
        if (result.rows.length > 0) {
          updatedItems.push(result.rows[0])
        }
      }
    }

    await client.query('COMMIT')

    const itemIds = updatedItems.map((item: any) => item.id)
    const assignmentsMap = await getItemAssignments(itemIds)

    const items = updatedItems.map((item: any) => ({
      ...item,
      assigned_user_ids: assignmentsMap.get(item.id) || []
    }))

    res.json({ data: items })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error bulk updating items:', error)
    res.status(500).json({ error: 'Failed to bulk update items' })
  } finally {
    client.release()
  }
})

// Export CSV (authenticated)
router.get('/export/csv', authMiddleware, async (req, res) => {
  try {
    const result = await query('SELECT * FROM gantt_items ORDER BY time_start')
    const itemIds = result.rows.map((r: any) => r.id)
    const assignmentsMap = await getItemAssignments(itemIds)

    const items = result.rows.map((row: any) => ({
      ...row,
      assigned_user_ids: assignmentsMap.get(row.id) || []
    }))

    res.json({ data: items })
  } catch (error) {
    console.error('Error exporting items:', error)
    res.status(500).json({ error: 'Failed to export items' })
  }
})

// Create item (authenticated)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { label, row_id, time_start, time_end, progress, assigned_user_id, assigned_user_ids } = req.body

    if (!label || !row_id || !time_start || !time_end) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (label.length > 255) {
      return res.status(400).json({ error: 'Label must be at most 255 characters' })
    }

    if (new Date(time_end) <= new Date(time_start)) {
      return res.status(400).json({ error: 'time_end must be after time_start' })
    }

    const rowCheck = await query('SELECT id FROM gantt_rows WHERE id = $1', [row_id])
    if (rowCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Row not found' })
    }

    const result = await query(
      `INSERT INTO gantt_items (label, row_id, time_start, time_end, progress, assigned_user_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [label, row_id, time_start, time_end, progress || 0, assigned_user_id || null, req.user!.userId]
    )

    const inserted = result.rows[0]
    const userIds = assigned_user_ids || (assigned_user_id ? [assigned_user_id] : [])
    if (userIds.length > 0) {
      await setItemAssignments(inserted.id, userIds)
    }
    inserted.assigned_user_ids = userIds

    res.status(201).json(inserted)
  } catch (error) {
    console.error('Error creating item:', error)
    res.status(500).json({ error: 'Failed to create item' })
  }
})

// Update item (owner or admin)
router.put('/:id', authMiddleware, validateUUID('id'), async (req, res) => {
  try {
    const itemId = req.params.id
    const userId = req.user!.userId
    const isAdmin = req.user!.rol === 'Admin'

    if (!isAdmin) {
      const ownerCheck = await query('SELECT created_by FROM gantt_items WHERE id = $1', [itemId])
      if (ownerCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found' })
      }
      if (ownerCheck.rows[0].created_by !== userId) {
        return res.status(403).json({ error: 'Solo puedes editar tus propias tareas' })
      }
    }

    const { assigned_user_ids, ...rawFields } = req.body
    if (!isAdmin) delete rawFields.created_by

    if (rawFields.time_start && rawFields.time_end) {
      if (new Date(rawFields.time_end) <= new Date(rawFields.time_start)) {
        return res.status(400).json({ error: 'time_end must be after time_start' })
      }
    }

    const updates: string[] = []
    const values: unknown[] = []
    let paramCount = 1

    for (const [key, value] of Object.entries(rawFields)) {
      if (!ALLOWED_ITEM_FIELDS.has(key) || value === undefined) continue
      updates.push(`${key} = $${paramCount++}`)
      values.push(value)
    }

    if (updates.length > 0) {
      updates.push(`fecha_actualizacion = CURRENT_TIMESTAMP`)
      values.push(itemId)
      const result = await query(
        `UPDATE gantt_items SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found' })
      }

      if (assigned_user_ids !== undefined) {
        await setItemAssignments(itemId, assigned_user_ids)
      }

      const assignmentsMap = await getItemAssignments([itemId])
      result.rows[0].assigned_user_ids = assignmentsMap.get(itemId) || []

      return res.json(result.rows[0])
    }

    if (assigned_user_ids !== undefined) {
      await setItemAssignments(itemId, assigned_user_ids)
      const result = await query('SELECT * FROM gantt_items WHERE id = $1', [itemId])
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found' })
      }
      const assignmentsMap = await getItemAssignments([itemId])
      result.rows[0].assigned_user_ids = assignmentsMap.get(itemId) || []
      return res.json(result.rows[0])
    }

    return res.status(400).json({ error: 'No fields to update' })
  } catch (error) {
    console.error('Error updating item:', error)
    res.status(500).json({ error: 'Failed to update item' })
  }
})

// Delete item (owner or admin)
router.delete('/:id', authMiddleware, validateUUID('id'), async (req, res) => {
  try {
    const itemId = req.params.id
    const userId = req.user!.userId
    const isAdmin = req.user!.rol === 'Admin'

    if (!isAdmin) {
      const ownerCheck = await query('SELECT created_by FROM gantt_items WHERE id = $1', [itemId])
      if (ownerCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found' })
      }
      if (ownerCheck.rows[0].created_by !== userId) {
        return res.status(403).json({ error: 'Solo puedes eliminar tus propias tareas' })
      }
    }

    const result = await query('DELETE FROM gantt_items WHERE id = $1 RETURNING id', [itemId])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' })
    }
    res.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Error deleting item:', error)
    res.status(500).json({ error: 'Failed to delete item' })
  }
})

// Get dependencies for item (authenticated)
router.get('/:id/dependencies', authMiddleware, validateUUID('id'), async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM gantt_dependencies WHERE from_item_id = $1 OR to_item_id = $1',
      [req.params.id]
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching dependencies:', error)
    res.status(500).json({ error: 'Failed to fetch dependencies' })
  }
})

export default router
import { Router } from 'express'
import { query } from '../db/connection.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/item/:itemId', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query
    const result = await query(
      `SELECT h.*, u.nombre as user_nombre
       FROM gantt_items_history h
       LEFT JOIN users u ON h.user_id = u.id
       WHERE h.item_id = $1
       ORDER BY h.fecha DESC
       LIMIT $2 OFFSET $3`,
      [req.params.itemId, limit, offset]
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching history:', error)
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { item_id, user_id, accion, cambios } = req.body

    if (!item_id || !user_id || !accion) {
      return res.status(400).json({ error: 'item_id, user_id and accion are required' })
    }

    const result = await query(
      `INSERT INTO gantt_items_history (item_id, user_id, accion, cambios)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [item_id, user_id, accion, cambios ? JSON.stringify(cambios) : null]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating history:', error)
    res.status(500).json({ error: 'Failed to create history' })
  }
})

router.get('/recent', authMiddleware, async (req, res) => {
  try {
    const { limit = 20 } = req.query
    const result = await query(
      `SELECT h.*, i.label as item_label, u.nombre as user_nombre
       FROM gantt_items_history h
       LEFT JOIN gantt_items i ON h.item_id = i.id
       LEFT JOIN users u ON h.user_id = u.id
       ORDER BY h.fecha DESC
       LIMIT $1`,
      [limit]
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching recent history:', error)
    res.status(500).json({ error: 'Failed to fetch recent history' })
  }
})

export default router
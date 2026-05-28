import { Router } from 'express'
import { query } from '../db/connection.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0, unread_only = false } = req.query
    let sql = `SELECT * FROM notifications WHERE user_id = $1`
    const params: any[] = [req.params.userId]

    if (unread_only === 'true') {
      sql += ` AND leida = FALSE`
    }

    sql += ` ORDER BY fecha_creacion DESC LIMIT $2 OFFSET $3`
    params.push(limit, offset)

    const result = await query(sql, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

router.get('/user/:userId/unread-count', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND leida = FALSE',
      [req.params.userId]
    )
    res.json({ count: parseInt(result.rows[0].count) })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    res.status(500).json({ error: 'Failed to fetch unread count' })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { user_id, tipo, titulo, mensaje, link } = req.body

    if (!user_id || !tipo || !titulo) {
      return res.status(400).json({ error: 'user_id, tipo and titulo are required' })
    }

    const result = await query(
      `INSERT INTO notifications (user_id, tipo, titulo, mensaje, link)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, tipo, titulo, mensaje, link]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating notification:', error)
    res.status(500).json({ error: 'Failed to create notification' })
  }
})

router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `UPDATE notifications SET leida = TRUE, fecha_leida = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error marking notification as read:', error)
    res.status(500).json({ error: 'Failed to mark as read' })
  }
})

router.put('/user/:userId/read-all', authMiddleware, async (req, res) => {
  try {
    await query(
      `UPDATE notifications SET leida = TRUE, fecha_leida = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND leida = FALSE`,
      [req.params.userId]
    )
    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    console.error('Error marking all as read:', error)
    res.status(500).json({ error: 'Failed to mark all as read' })
  }
})

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM notifications WHERE id = $1 RETURNING id',
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    res.json({ message: 'Notification deleted' })
  } catch (error) {
    console.error('Error deleting notification:', error)
    res.status(500).json({ error: 'Failed to delete notification' })
  }
})

export default router
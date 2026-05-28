import { Router } from 'express'
import { query } from '../db/connection.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/item/:itemId', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query
    const result = await query(
      `SELECT c.*, u.nombre as user_nombre, u.avatar as user_avatar, u.color as user_color
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.item_id = $1
       ORDER BY c.fecha_creacion DESC
       LIMIT $2 OFFSET $3`,
      [req.params.itemId, limit, offset]
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching comments:', error)
    res.status(500).json({ error: 'Failed to fetch comments' })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { item_id, user_id, contenido } = req.body

    if (!item_id || !user_id || !contenido) {
      return res.status(400).json({ error: 'item_id, user_id and contenido are required' })
    }

    const result = await query(
      `INSERT INTO comments (item_id, user_id, contenido)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [item_id, user_id, contenido]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating comment:', error)
    res.status(500).json({ error: 'Failed to create comment' })
  }
})

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { contenido } = req.body

    if (!contenido) {
      return res.status(400).json({ error: 'contenido is required' })
    }

    const result = await query(
      `UPDATE comments SET contenido = $1, fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [contenido, req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating comment:', error)
    res.status(500).json({ error: 'Failed to update comment' })
  }
})

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM comments WHERE id = $1 RETURNING id',
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' })
    }

    res.json({ message: 'Comment deleted' })
  } catch (error) {
    console.error('Error deleting comment:', error)
    res.status(500).json({ error: 'Failed to delete comment' })
  }
})

export default router
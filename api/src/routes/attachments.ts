import { Router } from 'express'
import { query } from '../db/connection.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/item/:itemId', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*, u.nombre as user_nombre, u.avatar as user_avatar
       FROM attachments a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.item_id = $1
       ORDER BY a.fecha_creacion DESC`,
      [req.params.itemId]
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching attachments:', error)
    res.status(500).json({ error: 'Failed to fetch attachments' })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { item_id, user_id, nombre, tipo, url, tamano_bytes } = req.body

    if (!item_id || !user_id || !nombre || !url) {
      return res.status(400).json({ error: 'item_id, user_id, nombre and url are required' })
    }

    const result = await query(
      `INSERT INTO attachments (item_id, user_id, nombre, tipo, url, tamano_bytes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [item_id, user_id, nombre, tipo, url, tamano_bytes || 0]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating attachment:', error)
    res.status(500).json({ error: 'Failed to create attachment' })
  }
})

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM attachments WHERE id = $1 RETURNING id',
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' })
    }

    res.json({ message: 'Attachment deleted' })
  } catch (error) {
    console.error('Error deleting attachment:', error)
    res.status(500).json({ error: 'Failed to delete attachment' })
  }
})

export default router
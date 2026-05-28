import { Router } from 'express'
import { query } from '../db/connection.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT t.*, u.nombre as created_by_nombre
       FROM tags t
       LEFT JOIN users u ON t.created_by = u.id
       ORDER BY t.nombre`
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching tags:', error)
    res.status(500).json({ error: 'Failed to fetch tags' })
  }
})

router.get('/item/:itemId', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT t.* FROM tags t
       INNER JOIN item_tags it ON t.id = it.tag_id
       WHERE it.item_id = $1
       ORDER BY t.nombre`,
      [req.params.itemId]
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching item tags:', error)
    res.status(500).json({ error: 'Failed to fetch item tags' })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { nombre, color, created_by } = req.body

    if (!nombre) {
      return res.status(400).json({ error: 'nombre is required' })
    }

    const result = await query(
      `INSERT INTO tags (nombre, color, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nombre, color || '#6366f1', created_by]
    )

    res.status(201).json(result.rows[0])
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Tag already exists' })
    }
    console.error('Error creating tag:', error)
    res.status(500).json({ error: 'Failed to create tag' })
  }
})

router.post('/item/:itemId', authMiddleware, async (req, res) => {
  try {
    const { tag_id } = req.body

    if (!tag_id) {
      return res.status(400).json({ error: 'tag_id is required' })
    }

    await query(
      `INSERT INTO item_tags (item_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.params.itemId, tag_id]
    )

    res.status(201).json({ message: 'Tag added to item' })
  } catch (error) {
    console.error('Error adding tag to item:', error)
    res.status(500).json({ error: 'Failed to add tag to item' })
  }
})

router.delete('/item/:itemId/tag/:tagId', authMiddleware, async (req, res) => {
  try {
    await query(
      'DELETE FROM item_tags WHERE item_id = $1 AND tag_id = $2',
      [req.params.itemId, req.params.tagId]
    )
    res.json({ message: 'Tag removed from item' })
  } catch (error) {
    console.error('Error removing tag from item:', error)
    res.status(500).json({ error: 'Failed to remove tag' })
  }
})

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM tags WHERE id = $1 RETURNING id',
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' })
    }

    res.json({ message: 'Tag deleted' })
  } catch (error) {
    console.error('Error deleting tag:', error)
    res.status(500).json({ error: 'Failed to delete tag' })
  }
})

export default router
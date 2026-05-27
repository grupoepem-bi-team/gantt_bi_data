import { Router } from 'express'
import { query } from '../db/connection.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'
import { validateUUID } from '../middleware/validators.js'

const router = Router()

// Get all rows (authenticated)
router.get('/', authMiddleware, async (_req, res) => {
  try {
    const result = await query('SELECT * FROM gantt_rows ORDER BY orden')
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching rows:', error)
    res.status(500).json({ error: 'Failed to fetch rows' })
  }
})

// Create row (admin only)
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { label, orden } = req.body
    if (!label || label.trim().length === 0) {
      return res.status(400).json({ error: 'Label is required' })
    }
    if (label.length > 255) {
      return res.status(400).json({ error: 'Label must be at most 255 characters' })
    }
    
    const result = await query(
      'INSERT INTO gantt_rows (label, orden) VALUES ($1, $2) RETURNING *',
      [label.trim(), orden || 0]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating row:', error)
    res.status(500).json({ error: 'Failed to create row' })
  }
})

// Update row (admin only)
router.put('/:id', authMiddleware, requireAdmin, validateUUID('id'), async (req, res) => {
  try {
    const { label, orden } = req.body
    if (label !== undefined && label.trim().length === 0) {
      return res.status(400).json({ error: 'Label cannot be empty' })
    }
    if (label !== undefined && label.length > 255) {
      return res.status(400).json({ error: 'Label must be at most 255 characters' })
    }
    const result = await query(
      'UPDATE gantt_rows SET label = COALESCE($1, label), orden = COALESCE($2, orden) WHERE id = $3 RETURNING *',
      [label?.trim() || null, orden ?? null, req.params.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Row not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating row:', error)
    res.status(500).json({ error: 'Failed to update row' })
  }
})

// Get items count for a row (authenticated)
router.get('/:id/items-count', authMiddleware, validateUUID('id'), async (req, res) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM gantt_items WHERE row_id = $1',
      [req.params.id]
    )
    res.json({ count: parseInt(result.rows[0].count) })
  } catch (error) {
    console.error('Error counting row items:', error)
    res.status(500).json({ error: 'Failed to count row items' })
  }
})

// Delete row (admin only)
router.delete('/:id', authMiddleware, requireAdmin, validateUUID('id'), async (req, res) => {
  try {
    const countResult = await query(
      'SELECT COUNT(*) as count FROM gantt_items WHERE row_id = $1',
      [req.params.id]
    )
    const itemCount = parseInt(countResult.rows[0].count)
    
    if (itemCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete row with tasks', 
        itemCount 
      })
    }
    
    const result = await query('DELETE FROM gantt_rows WHERE id = $1 RETURNING id', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Row not found' })
    }
    res.json({ message: 'Row deleted successfully' })
  } catch (error) {
    console.error('Error deleting row:', error)
    res.status(500).json({ error: 'Failed to delete row' })
  }
})

export default router
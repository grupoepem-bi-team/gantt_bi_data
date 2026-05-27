import { Router } from 'express'
import { query } from '../db/connection.js'

const router = Router()

// Get all dependencies
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT d.*,
             f.label as from_item_label,
             t.label as to_item_label
      FROM gantt_dependencies d
      LEFT JOIN gantt_items f ON d.from_item_id = f.id
      LEFT JOIN gantt_items t ON d.to_item_id = t.id
      ORDER BY d.id
    `)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching dependencies:', error)
    res.status(500).json({ error: 'Failed to fetch dependencies' })
  }
})

// Create dependency
router.post('/', async (req, res) => {
  try {
    const { from_item_id, to_item_id } = req.body

    if (!from_item_id || !to_item_id) {
      return res.status(400).json({ error: 'from_item_id and to_item_id are required' })
    }

    if (from_item_id === to_item_id) {
      return res.status(400).json({ error: 'Cannot create dependency to itself' })
    }

    const result = await query(
      `INSERT INTO gantt_dependencies (from_item_id, to_item_id)
       VALUES ($1, $2)
       RETURNING *`,
      [from_item_id, to_item_id]
    )

    res.status(201).json(result.rows[0])
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Dependency already exists' })
    }
    console.error('Error creating dependency:', error)
    res.status(500).json({ error: 'Failed to create dependency' })
  }
})

// Delete dependency
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM gantt_dependencies WHERE id = $1 RETURNING id',
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dependency not found' })
    }

    res.json({ message: 'Dependency deleted successfully' })
  } catch (error) {
    console.error('Error deleting dependency:', error)
    res.status(500).json({ error: 'Failed to delete dependency' })
  }
})

export default router
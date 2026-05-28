import { Router } from 'express'
import { query } from '../db/connection.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, u.nombre as created_by_nombre,
              (SELECT COUNT(*) FROM gantt_rows WHERE project_id = p.id) as row_count
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       ORDER BY p.fecha_creacion DESC`
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching projects:', error)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, u.nombre as created_by_nombre
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = $1`,
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching project:', error)
    res.status(500).json({ error: 'Failed to fetch project' })
  }
})

router.get('/:id/rows', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM gantt_rows WHERE project_id = $1 ORDER BY orden',
      [req.params.id]
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching project rows:', error)
    res.status(500).json({ error: 'Failed to fetch project rows' })
  }
})

router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, color, fecha_inicio, fecha_fin, created_by } = req.body

    if (!nombre) {
      return res.status(400).json({ error: 'nombre is required' })
    }

    const result = await query(
      `INSERT INTO projects (nombre, descripcion, color, fecha_inicio, fecha_fin, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [nombre, descripcion, color || '#6366f1', fecha_inicio, fecha_fin, created_by]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating project:', error)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

router.put('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, color, fecha_inicio, fecha_fin, estado } = req.body
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 0

    if (nombre !== undefined) {
      paramCount++
      updates.push(`nombre = $${paramCount}`)
      values.push(nombre)
    }
    if (descripcion !== undefined) {
      paramCount++
      updates.push(`descripcion = $${paramCount}`)
      values.push(descripcion)
    }
    if (color !== undefined) {
      paramCount++
      updates.push(`color = $${paramCount}`)
      values.push(color)
    }
    if (fecha_inicio !== undefined) {
      paramCount++
      updates.push(`fecha_inicio = $${paramCount}`)
      values.push(fecha_inicio)
    }
    if (fecha_fin !== undefined) {
      paramCount++
      updates.push(`fecha_fin = $${paramCount}`)
      values.push(fecha_fin)
    }
    if (estado !== undefined) {
      paramCount++
      updates.push(`estado = $${paramCount}`)
      values.push(estado)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    updates.push(`fecha_actualizacion = CURRENT_TIMESTAMP`)
    values.push(req.params.id)

    const result = await query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramCount + 1} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating project:', error)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM projects WHERE id = $1 RETURNING id',
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json({ message: 'Project deleted' })
  } catch (error) {
    console.error('Error deleting project:', error)
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

export default router
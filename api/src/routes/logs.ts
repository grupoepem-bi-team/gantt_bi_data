import { Router } from 'express'
import { query } from '../db/connection.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// Get all logs with pagination and filtering (authenticated)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { usuario_id, limit = 50, offset = 0 } = req.query
    let sql = 'SELECT * FROM activity_logs WHERE 1=1'
    let countSql = 'SELECT COUNT(*) FROM activity_logs WHERE 1=1'
    const params: unknown[] = []
    let paramCount = 0

    if (usuario_id) {
      paramCount++
      params.push(usuario_id)
      sql += ` AND usuario_id = $${paramCount}`
      countSql += ` AND usuario_id = $${paramCount}`
    }

    sql += ' ORDER BY fecha DESC'

    paramCount++
    params.push(Number(limit) > 200 ? 200 : Number(limit))
    sql += ` LIMIT $${paramCount}`

    paramCount++
    params.push(Number(offset))
    sql += ` OFFSET $${paramCount}`

    const result = await query(sql, params)
    const countParams = params.slice(0, paramCount - 2)
    const countResult = await query(countSql, countParams)
    const total = parseInt(countResult.rows[0].count)

    res.json({
      data: result.rows,
      total,
      limit: Number(limit),
      offset: Number(offset)
    })
  } catch (error) {
    console.error('Error fetching logs:', error)
    res.status(500).json({ error: 'Failed to fetch logs' })
  }
})

// Create log entry (authenticated - uses token user info)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { accion, descripcion, target_id, target_nombre } = req.body
    
    if (!accion) {
      return res.status(400).json({ error: 'Accion is required' })
    }
    
    if (accion.length > 50) {
      return res.status(400).json({ error: 'Accion must be at most 50 characters' })
    }
    
    const usuario_id = req.user!.userId
    const usuario_nombre = req.user!.nombre
    
    const result = await query(
      `INSERT INTO activity_logs (usuario_id, usuario_nombre, accion, descripcion, target_id, target_nombre) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [usuario_id, usuario_nombre, accion, descripcion, target_id, target_nombre]
    )
    
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating log:', error)
    res.status(500).json({ error: 'Failed to create log' })
  }
})

export default router
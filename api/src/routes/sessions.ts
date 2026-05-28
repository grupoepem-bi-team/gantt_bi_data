import { Router } from 'express'
import { query } from '../db/connection.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'

const router = Router()

router.get('/user/:userId', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, token, ip_address, user_agent, fecha_creacion, fecha_expiracion, fecha_ultimo_acceso, activo
       FROM sessions WHERE user_id = $1 ORDER BY fecha_creacion DESC`,
      [req.params.userId]
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    res.status(500).json({ error: 'Failed to fetch sessions' })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { user_id, token, ip_address, user_agent, fecha_expiracion } = req.body

    if (!user_id || !token) {
      return res.status(400).json({ error: 'user_id and token are required' })
    }

    const result = await query(
      `INSERT INTO sessions (user_id, token, ip_address, user_agent, fecha_expiracion)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, token, ip_address, user_agent, fecha_expiracion]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating session:', error)
    res.status(500).json({ error: 'Failed to create session' })
  }
})

router.put('/:id/last-access', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `UPDATE sessions SET fecha_ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating session:', error)
    res.status(500).json({ error: 'Failed to update session' })
  }
})

router.put('/:id/deactivate', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `UPDATE sessions SET activo = FALSE WHERE id = $1 RETURNING *`,
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    res.json({ message: 'Session deactivated' })
  } catch (error) {
    console.error('Error deactivating session:', error)
    res.status(500).json({ error: 'Failed to deactivate session' })
  }
})

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM sessions WHERE id = $1 RETURNING id',
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    res.json({ message: 'Session deleted' })
  } catch (error) {
    console.error('Error deleting session:', error)
    res.status(500).json({ error: 'Failed to delete session' })
  }
})

router.delete('/user/:userId/all', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM sessions WHERE user_id = $1', [req.params.userId])
    res.json({ message: 'All sessions deleted for user' })
  } catch (error) {
    console.error('Error deleting sessions:', error)
    res.status(500).json({ error: 'Failed to delete sessions' })
  }
})

export default router
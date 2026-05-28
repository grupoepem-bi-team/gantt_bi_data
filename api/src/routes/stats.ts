import { Router } from 'express'
import { query } from '../db/connection.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, async (req, res) => {
  try {
    const totalItemsResult = await query('SELECT COUNT(*) FROM gantt_items')
    const totalItems = parseInt(totalItemsResult.rows[0].count)

    const inProgressResult = await query(
      'SELECT COUNT(*) FROM gantt_items WHERE progress > 0 AND progress < 100'
    )
    const inProgress = parseInt(inProgressResult.rows[0].count)

    const completedResult = await query(
      'SELECT COUNT(*) FROM gantt_items WHERE progress = 100'
    )
    const completed = parseInt(completedResult.rows[0].count)

    const notStartedResult = await query(
      'SELECT COUNT(*) FROM gantt_items WHERE progress = 0'
    )
    const notStarted = parseInt(notStartedResult.rows[0].count)

    const itemsByUserResult = await query(`
      SELECT u.nombre, COUNT(i.id) as task_count, AVG(i.progress) as avg_progress
      FROM users u
      LEFT JOIN gantt_items i ON u.id = i.assigned_user_id
      GROUP BY u.id, u.nombre
      ORDER BY task_count DESC
    `)

    const itemsByRowResult = await query(`
      SELECT r.label, COUNT(i.id) as task_count, AVG(i.progress) as avg_progress
      FROM gantt_rows r
      LEFT JOIN gantt_items i ON r.id = i.row_id
      GROUP BY r.id, r.label
      ORDER BY r.orden
    `)

    const recentActivityResult = await query(`
      SELECT * FROM activity_logs
      ORDER BY fecha DESC
      LIMIT 10
    `)

    const totalUsersResult = await query('SELECT COUNT(*) FROM users')
    const totalUsers = parseInt(totalUsersResult.rows[0].count)

    const overdueResult = await query(`
      SELECT COUNT(*) FROM gantt_items
      WHERE time_end < CURRENT_TIMESTAMP AND progress < 100
    `)
    const overdue = parseInt(overdueResult.rows[0].count)

    res.json({
      total_items: totalItems,
      in_progress: inProgress,
      completed,
      not_started: notStarted,
      overdue,
      total_users: totalUsers,
      items_by_user: itemsByUserResult.rows,
      items_by_row: itemsByRowResult.rows,
      recent_activity: recentActivityResult.rows
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

export default router
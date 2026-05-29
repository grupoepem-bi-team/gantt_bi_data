import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { initDB } from './db/init.js'
import { DbRateLimitStore, cleanup as rateLimitCleanup } from './db/rate-limit-store.js'
import usersRouter from './routes/users.js'
import rowsRouter from './routes/rows.js'
import itemsRouter from './routes/items.js'
import logsRouter from './routes/logs.js'
import dependenciesRouter from './routes/dependencies.js'
import projectsRouter from './routes/projects.js'
import tagsRouter from './routes/tags.js'
import commentsRouter from './routes/comments.js'
import attachmentsRouter from './routes/attachments.js'
import historyRouter from './routes/history.js'
import notificationsRouter from './routes/notifications.js'
import sessionsRouter from './routes/sessions.js'
import statsRouter from './routes/stats.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  process.env.CORS_ORIGIN
].filter((origin): origin is string => typeof origin === 'string' && origin.length > 0)

if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  console.error('FATAL: CORS_ORIGIN environment variable is required in production')
  process.exit(1)
}

app.use(helmet())

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))

app.use(express.json({ limit: '1mb' }))

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: new DbRateLimitStore('login')
})

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo mas tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: new DbRateLimitStore('api')
})

app.use('/api/users/login', loginLimiter)
app.use('/api/users/change-password', loginLimiter)
app.use('/api', apiLimiter)

app.use('/api/users', usersRouter)
app.use('/api/rows', rowsRouter)
app.use('/api/items', itemsRouter)
app.use('/api/logs', logsRouter)
app.use('/api/dependencies', dependenciesRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/tags', tagsRouter)
app.use('/api/comments', commentsRouter)
app.use('/api/attachments', attachmentsRouter)
app.use('/api/history', historyRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/stats', statsRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Gantt API running on port ${PORT}`)
    initDB()
    setInterval(() => {
      rateLimitCleanup().catch(() => {})
    }, 60 * 60 * 1000)
  })
}

export default app
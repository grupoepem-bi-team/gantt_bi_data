import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { initDB } from './db/init.js'
import usersRouter from './routes/users.js'
import rowsRouter from './routes/rows.js'
import itemsRouter from './routes/items.js'
import logsRouter from './routes/logs.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  process.env.CORS_ORIGIN
].filter(Boolean)

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}))

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true
}))

app.use(express.json({ limit: '1mb' }))

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
})

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo mas tarde.' },
  standardHeaders: true,
  legacyHeaders: false
})

app.use('/api/users/login', loginLimiter)
app.use('/api', apiLimiter)

app.use('/api/users', usersRouter)
app.use('/api/rows', rowsRouter)
app.use('/api/items', itemsRouter)
app.use('/api/logs', logsRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Gantt API running on port ${PORT}`)
  initDB()
})

export default app
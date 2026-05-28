import type { VercelRequest, VercelResponse } from '@vercel/node'
import app from './src/index.js'
import { initDB } from './src/db/init.js'

initDB()

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res)
}
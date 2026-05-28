import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required')
  process.exit(1)
}

export async function query(text: string, params?: unknown[]) {
  const result = await pool.query(text, params)
  return result
}

export async function getClient() {
  const client = await pool.connect()
  return client
}
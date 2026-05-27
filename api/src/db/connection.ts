import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://gantt_user:gantt_password@localhost:5432/gantt_db',
})

export async function query(text: string, params?: unknown[]) {
  const result = await pool.query(text, params)
  return result
}

export async function getClient() {
  const client = await pool.connect()
  return client
}
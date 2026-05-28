import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set. Connection will fail.')
}

export async function query(text: string, params?: unknown[]) {
  const result = await pool.query(text, params)
  return result
}

export async function getClient() {
  const client = await pool.connect()
  return client
}
import { query } from './connection.js'

class DbRateLimitStore {
  prefix: string

  constructor(prefix: string = '') {
    this.prefix = prefix ? `${prefix}:` : ''
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const dbKey = this.getKey(key)
    const now = new Date()
    const fifteenMinutes = 15 * 60 * 1000

    const result = await query(
      'SELECT count, expires_at FROM rate_limits WHERE key = $1',
      [dbKey]
    )

    if (result.rows.length === 0) {
      const expiresAt = new Date(now.getTime() + fifteenMinutes)
      await query(
        'INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, 1, $2)',
        [dbKey, expiresAt]
      )
      return { totalHits: 1, resetTime: expiresAt }
    }

    const record = result.rows[0] as { count: number; expires_at: Date }
    const recordExpires = new Date(record.expires_at)

    if (recordExpires < now) {
      const expiresAt = new Date(now.getTime() + fifteenMinutes)
      await query(
        'UPDATE rate_limits SET count = 1, expires_at = $2 WHERE key = $1',
        [dbKey, expiresAt]
      )
      return { totalHits: 1, resetTime: expiresAt }
    }

    const newCount = record.count + 1
    await query(
      'UPDATE rate_limits SET count = $2 WHERE key = $1',
      [dbKey, newCount]
    )
    return { totalHits: newCount, resetTime: recordExpires }
  }

  async decrement(key: string): Promise<void> {
    const dbKey = this.getKey(key)
    await query(
      'UPDATE rate_limits SET count = GREATEST(count - 1, 0) WHERE key = $1',
      [dbKey]
    )
  }

  async resetKey(key: string): Promise<void> {
    const dbKey = this.getKey(key)
    await query('DELETE FROM rate_limits WHERE key = $1', [dbKey])
  }

  async resetAll(): Promise<void> {
    await query('DELETE FROM rate_limits')
  }
}

async function cleanup() {
  try {
    await query('DELETE FROM rate_limits WHERE expires_at < NOW()')
  } catch {}
}

export { DbRateLimitStore, cleanup }
export default DbRateLimitStore
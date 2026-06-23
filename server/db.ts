import 'dotenv/config'
import postgres from 'postgres'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL requerida en .env')

export const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 10 })

export async function initDb(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id        SERIAL PRIMARY KEY,
      username  TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS plays (
      id         TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      data       JSONB NOT NULL,
      synced_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_plays_user ON plays(user_id)`
  console.log('[db] Schema listo')
}

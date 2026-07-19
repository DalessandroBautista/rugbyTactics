import 'dotenv/config'
import postgres from 'postgres'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL requerida en .env')

export const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 10 })

export async function initDb(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id        SERIAL PRIMARY KEY,
      username  TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE users ALTER COLUMN username DROP NOT NULL`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ`
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower
    ON users(LOWER(email)) WHERE email IS NOT NULL
  `
  await sql`
    CREATE TABLE IF NOT EXISTS email_verification_challenges (
      id          TEXT PRIMARY KEY,
      email       TEXT NOT NULL,
      purpose     TEXT NOT NULL CHECK (purpose IN ('register', 'login', 'reset')),
      code_digest TEXT NOT NULL,
      expires_at  TIMESTAMPTZ NOT NULL,
      attempts    INTEGER NOT NULL DEFAULT 0,
      consumed_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE email_verification_challenges ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`
  await sql`
    CREATE INDEX IF NOT EXISTS idx_auth_challenges_email_purpose_created
    ON email_verification_challenges(email, purpose, created_at DESC)
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
  await sql`
    CREATE TABLE IF NOT EXISTS playlists (
      id         TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      data       JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id)`
  await sql`
    CREATE TABLE IF NOT EXISTS play_proposals (
      id               TEXT PRIMARY KEY,
      playlist_id      TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
      play_id           TEXT NOT NULL,
      owner_user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      proposer_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      base_data         JSONB NOT NULL,
      proposed_data     JSONB NOT NULL,
      message           TEXT,
      status            TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'rejected')),
      summary           JSONB NOT NULL,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at       TIMESTAMPTZ
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_proposals_owner_status
    ON play_proposals(owner_user_id, status, created_at DESC)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_proposals_proposer
    ON play_proposals(proposer_user_id, created_at DESC)
  `
  console.log('[db] Schema listo')
}

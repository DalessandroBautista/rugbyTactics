import { sql } from '../db.js'
import type {
  AuthChallenge,
  AuthRepository,
  AuthUserRecord,
  VerificationPurpose,
} from '../services/authService.js'

interface UserRow {
  id: number
  email: string
  password_hash: string
  session_version: number
}

interface ChallengeRow {
  id: string
  email: string
  purpose: VerificationPurpose
  code_digest: string
  expires_at: Date
  attempts: number
  consumed_at: Date | null
  created_at: Date
}

function mapUser(row: UserRow): AuthUserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    sessionVersion: row.session_version,
  }
}

function mapChallenge(row: ChallengeRow): AuthChallenge {
  return {
    id: row.id,
    email: row.email,
    purpose: row.purpose,
    codeDigest: row.code_digest,
    expiresAt: row.expires_at,
    attempts: row.attempts,
    consumedAt: row.consumed_at,
    createdAt: row.created_at,
  }
}

export class PostgresAuthRepository implements AuthRepository {
  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const rows = await sql<UserRow[]>`
      SELECT id, email, password_hash, session_version
      FROM users WHERE LOWER(email) = ${email} LIMIT 1
    `
    return rows[0] ? mapUser(rows[0]) : null
  }

  async findUserById(id: number): Promise<AuthUserRecord | null> {
    const rows = await sql<UserRow[]>`
      SELECT id, email, password_hash, session_version
      FROM users WHERE id = ${id} LIMIT 1
    `
    return rows[0] ? mapUser(rows[0]) : null
  }

  async createUser(email: string, passwordHash: string): Promise<AuthUserRecord> {
    const [row] = await sql<UserRow[]>`
      INSERT INTO users (email, password_hash, email_verified_at)
      VALUES (${email}, ${passwordHash}, NOW())
      RETURNING id, email, password_hash, session_version
    `
    return mapUser(row)
  }

  async updatePassword(userId: number, passwordHash: string): Promise<AuthUserRecord> {
    const [row] = await sql<UserRow[]>`
      UPDATE users
      SET password_hash = ${passwordHash}, session_version = session_version + 1
      WHERE id = ${userId}
      RETURNING id, email, password_hash, session_version
    `
    return mapUser(row)
  }

  async countRecentChallenges(
    email: string,
    purpose: VerificationPurpose,
    since: Date,
  ): Promise<number> {
    const [row] = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM email_verification_challenges
      WHERE email = ${email} AND purpose = ${purpose} AND created_at >= ${since}
    `
    return Number(row.count)
  }

  async invalidateActiveChallenges(email: string, purpose: VerificationPurpose): Promise<void> {
    await sql`
      UPDATE email_verification_challenges SET consumed_at = NOW()
      WHERE email = ${email} AND purpose = ${purpose} AND consumed_at IS NULL
    `
  }

  async createChallenge(challenge: AuthChallenge): Promise<void> {
    await sql`
      INSERT INTO email_verification_challenges
        (id, email, purpose, code_digest, expires_at, attempts, consumed_at, created_at)
      VALUES (
        ${challenge.id}, ${challenge.email}, ${challenge.purpose}, ${challenge.codeDigest},
        ${challenge.expiresAt}, ${challenge.attempts}, ${challenge.consumedAt}, ${challenge.createdAt}
      )
    `
  }

  async findChallenge(id: string): Promise<AuthChallenge | null> {
    const rows = await sql<ChallengeRow[]>`
      SELECT id, email, purpose, code_digest, expires_at, attempts, consumed_at, created_at
      FROM email_verification_challenges WHERE id = ${id} LIMIT 1
    `
    return rows[0] ? mapChallenge(rows[0]) : null
  }

  async incrementChallengeAttempts(id: string): Promise<void> {
    await sql`
      UPDATE email_verification_challenges SET attempts = attempts + 1 WHERE id = ${id}
    `
  }

  async consumeChallenge(id: string, consumedAt: Date): Promise<void> {
    await sql`
      UPDATE email_verification_challenges SET consumed_at = ${consumedAt} WHERE id = ${id}
    `
  }

  async claimCompletedFlow(id: string, completedAt: Date): Promise<boolean> {
    const rows = await sql<{ id: string }[]>`
      UPDATE email_verification_challenges
      SET completed_at = ${completedAt}
      WHERE id = ${id} AND consumed_at IS NOT NULL AND completed_at IS NULL
      RETURNING id
    `
    return rows.length === 1
  }
}

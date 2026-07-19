import { createHmac, timingSafeEqual } from 'crypto'
import argon2 from 'argon2'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase()
  if (normalized.length > 254 || !EMAIL_PATTERN.test(normalized)) {
    throw new Error('Email inválido')
  }
  return normalized
}

export function digestVerificationCode(
  code: string,
  challengeId: string,
  secret: string,
): string {
  return createHmac('sha256', secret).update(`${challengeId}:${code}`).digest('hex')
}

export function verifyVerificationCode(
  code: string,
  challengeId: string,
  secret: string,
  digest: string,
): boolean {
  const candidate = Buffer.from(digestVerificationCode(code, challengeId, secret), 'hex')
  const expected = Buffer.from(digest, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  })
}

export async function verifyPassword(digest: string, password: string): Promise<boolean> {
  return argon2.verify(digest, password)
}

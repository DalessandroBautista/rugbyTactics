// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  digestVerificationCode,
  hashPassword,
  normalizeEmail,
  verifyPassword,
  verifyVerificationCode,
} from './authSecurity.js'

describe('authSecurity', () => {
  it('normalizes valid email addresses', () => {
    expect(normalizeEmail('  Coach@Example.COM ')).toBe('coach@example.com')
  })

  it('rejects malformed email addresses', () => {
    expect(() => normalizeEmail('not-an-email')).toThrow('Email inválido')
  })

  it('hashes verification codes without storing the code', () => {
    const digest = digestVerificationCode('123456', 'challenge-1', 'secret')

    expect(digest).not.toContain('123456')
    expect(verifyVerificationCode('123456', 'challenge-1', 'secret', digest)).toBe(true)
    expect(verifyVerificationCode('654321', 'challenge-1', 'secret', digest)).toBe(false)
  })

  it('hashes passwords with Argon2id and verifies them', async () => {
    const digest = await hashPassword('una contraseña segura')

    expect(digest).toMatch(/^\$argon2id\$/)
    expect(await verifyPassword(digest, 'una contraseña segura')).toBe(true)
    expect(await verifyPassword(digest, 'otra contraseña')).toBe(false)
  })
})

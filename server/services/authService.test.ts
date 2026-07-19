// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './authSecurity.js'
import {
  AuthService,
  type AuthChallenge,
  type AuthRepository,
  type AuthUserRecord,
  type VerificationPurpose,
} from './authService.js'

class MemoryAuthRepository implements AuthRepository {
  users: AuthUserRecord[] = []
  challenges: AuthChallenge[] = []
  completedFlows = new Set<string>()

  async findUserByEmail(email: string) {
    return this.users.find(user => user.email === email) ?? null
  }

  async findUserById(id: number) {
    return this.users.find(user => user.id === id) ?? null
  }

  async createUser(email: string, passwordHash: string) {
    const user = { id: this.users.length + 1, email, passwordHash, sessionVersion: 1 }
    this.users.push(user)
    return user
  }

  async updatePassword(userId: number, passwordHash: string) {
    const user = this.users.find(candidate => candidate.id === userId)!
    user.passwordHash = passwordHash
    user.sessionVersion += 1
    return user
  }

  async countRecentChallenges(email: string, purpose: VerificationPurpose, since: Date) {
    return this.challenges.filter(challenge =>
      challenge.email === email &&
      challenge.purpose === purpose &&
      challenge.createdAt >= since
    ).length
  }

  async invalidateActiveChallenges(email: string, purpose: VerificationPurpose) {
    for (const challenge of this.challenges) {
      if (challenge.email === email && challenge.purpose === purpose && !challenge.consumedAt) {
        challenge.consumedAt = new Date(0)
      }
    }
  }

  async createChallenge(challenge: AuthChallenge) {
    this.challenges.push(challenge)
  }

  async findChallenge(id: string) {
    return this.challenges.find(challenge => challenge.id === id) ?? null
  }

  async incrementChallengeAttempts(id: string) {
    const challenge = this.challenges.find(candidate => candidate.id === id)!
    challenge.attempts += 1
  }

  async consumeChallenge(id: string, consumedAt: Date) {
    const challenge = this.challenges.find(candidate => candidate.id === id)!
    challenge.consumedAt = consumedAt
  }

  async claimCompletedFlow(id: string) {
    if (this.completedFlows.has(id)) return false
    this.completedFlows.add(id)
    return true
  }
}

describe('AuthService', () => {
  let repository: MemoryAuthRepository
  let sent: Array<{ email: string; code: string; purpose: VerificationPurpose }>
  let service: AuthService
  let now: Date

  beforeEach(() => {
    repository = new MemoryAuthRepository()
    now = new Date('2026-07-18T12:00:00.000Z')
    sent = []
    service = new AuthService({
      repository,
      mailer: { sendCode: async (email, code, purpose) => { sent.push({ email, code, purpose }) } },
      codeSecret: 'code-secret',
      jwtSecret: 'jwt-secret',
      codeGenerator: () => '123456',
      now: () => now,
    })
  })

  it('registers a verified email and returns a session', async () => {
    const request = await service.requestCode(' Coach@Example.com ', 'register')
    expect(sent).toEqual([{ email: 'coach@example.com', code: '123456', purpose: 'register' }])

    const verified = await service.verifyCode(request.challengeId, '123456', 'register')
    expect(verified.flowToken).toEqual(expect.any(String))

    const result = await service.completeRegistration(verified.flowToken!, 'una contraseña segura')
    expect(result.user.email).toBe('coach@example.com')
    expect(result.token).toEqual(expect.any(String))
    expect(await verifyPassword(repository.users[0].passwordHash, 'una contraseña segura')).toBe(true)
  })

  it('logs an existing user in with a password', async () => {
    repository.users.push({
      id: 7,
      email: 'coach@example.com',
      passwordHash: await hashPassword('una contraseña segura'),
      sessionVersion: 1,
    })

    const result = await service.loginWithPassword('coach@example.com', 'una contraseña segura')

    expect(result.user).toEqual({ id: 7, email: 'coach@example.com' })
    expect(result.token).toEqual(expect.any(String))
  })

  it('does not send a login code for an unknown account', async () => {
    const result = await service.requestCode('missing@example.com', 'login')

    expect(result.challengeId).toEqual(expect.any(String))
    expect(sent).toEqual([])
  })

  it('limits code requests to five per fifteen minutes', async () => {
    for (let index = 0; index < 5; index += 1) {
      await service.requestCode('coach@example.com', 'register')
      now = new Date(now.getTime() + 61_000)
    }

    await expect(service.requestCode('coach@example.com', 'register'))
      .rejects.toMatchObject({ status: 429 })
  })

  it('requires one minute between code requests', async () => {
    await service.requestCode('coach@example.com', 'register')
    now = new Date(now.getTime() + 59_000)
    await expect(service.requestCode('coach@example.com', 'register'))
      .rejects.toMatchObject({ status: 429 })
  })

  it('resets the password and increments the session version', async () => {
    repository.users.push({
      id: 3,
      email: 'coach@example.com',
      passwordHash: await hashPassword('contraseña anterior'),
      sessionVersion: 1,
    })
    const request = await service.requestCode('coach@example.com', 'reset')
    const verified = await service.verifyCode(request.challengeId, '123456', 'reset')

    const result = await service.completePasswordReset(verified.flowToken!, 'contraseña completamente nueva')

    expect(repository.users[0].sessionVersion).toBe(2)
    expect(await verifyPassword(repository.users[0].passwordHash, 'contraseña completamente nueva')).toBe(true)
    expect(result.token).toEqual(expect.any(String))
    await expect(service.completePasswordReset(verified.flowToken!, 'otra contraseña completamente nueva'))
      .rejects.toMatchObject({ status: 401 })
  })
})

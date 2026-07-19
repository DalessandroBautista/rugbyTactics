import { randomInt, randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'
import {
  digestVerificationCode,
  hashPassword,
  normalizeEmail,
  verifyPassword,
  verifyVerificationCode,
} from './authSecurity.js'

export type VerificationPurpose = 'register' | 'login' | 'reset'

export interface AuthUserRecord {
  id: number
  email: string
  passwordHash: string
  sessionVersion: number
}

export interface AuthChallenge {
  id: string
  email: string
  purpose: VerificationPurpose
  codeDigest: string
  expiresAt: Date
  attempts: number
  consumedAt: Date | null
  createdAt: Date
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>
  findUserById(id: number): Promise<AuthUserRecord | null>
  createUser(email: string, passwordHash: string): Promise<AuthUserRecord>
  updatePassword(userId: number, passwordHash: string): Promise<AuthUserRecord>
  countRecentChallenges(email: string, purpose: VerificationPurpose, since: Date): Promise<number>
  invalidateActiveChallenges(email: string, purpose: VerificationPurpose): Promise<void>
  createChallenge(challenge: AuthChallenge): Promise<void>
  findChallenge(id: string): Promise<AuthChallenge | null>
  incrementChallengeAttempts(id: string): Promise<void>
  consumeChallenge(id: string, consumedAt: Date): Promise<void>
  claimCompletedFlow(id: string, completedAt: Date): Promise<boolean>
}

export interface AuthMailer {
  sendCode(email: string, code: string, purpose: VerificationPurpose): Promise<void>
}

interface AuthServiceOptions {
  repository: AuthRepository
  mailer: AuthMailer
  codeSecret: string
  jwtSecret: string
  codeGenerator?: () => string
  now?: () => Date
}

interface FlowPayload {
  type: 'flow'
  purpose: 'register' | 'reset'
  email: string
  challengeId: string
}

export class AuthServiceError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
  }
}

export class AuthService {
  private readonly repository: AuthRepository
  private readonly mailer: AuthMailer
  private readonly codeSecret: string
  private readonly jwtSecret: string
  private readonly codeGenerator: () => string
  private readonly now: () => Date

  constructor(options: AuthServiceOptions) {
    this.repository = options.repository
    this.mailer = options.mailer
    this.codeSecret = options.codeSecret
    this.jwtSecret = options.jwtSecret
    this.codeGenerator = options.codeGenerator ?? (() => randomInt(0, 1_000_000).toString().padStart(6, '0'))
    this.now = options.now ?? (() => new Date())
  }

  async requestCode(emailInput: string, purpose: VerificationPurpose): Promise<{ challengeId: string }> {
    const email = normalizeEmail(emailInput)
    const now = this.now()
    const lastMinute = await this.repository.countRecentChallenges(
      email,
      purpose,
      new Date(now.getTime() - 60_000),
    )
    if (lastMinute > 0) throw new AuthServiceError('Esperá un minuto antes de pedir otro código.', 429)
    const since = new Date(now.getTime() - 15 * 60_000)
    const recent = await this.repository.countRecentChallenges(email, purpose, since)
    if (recent >= 5) throw new AuthServiceError('Demasiados códigos solicitados. Intentá más tarde.', 429)

    await this.repository.invalidateActiveChallenges(email, purpose)
    const id = randomUUID()
    const code = this.codeGenerator()
    const challenge: AuthChallenge = {
      id,
      email,
      purpose,
      codeDigest: digestVerificationCode(code, id, this.codeSecret),
      expiresAt: new Date(now.getTime() + 10 * 60_000),
      attempts: 0,
      consumedAt: null,
      createdAt: now,
    }
    await this.repository.createChallenge(challenge)

    const user = await this.repository.findUserByEmail(email)
    const eligible = purpose === 'register' ? user === null : user !== null
    if (eligible) await this.mailer.sendCode(email, code, purpose)

    return { challengeId: id }
  }

  async verifyCode(
    challengeId: string,
    code: string,
    purpose: VerificationPurpose,
  ): Promise<{ flowToken?: string; token?: string; user?: { id: number; email: string } }> {
    const challenge = await this.repository.findChallenge(challengeId)
    const now = this.now()
    const invalid = !challenge ||
      challenge.purpose !== purpose ||
      challenge.consumedAt !== null ||
      challenge.expiresAt <= now ||
      challenge.attempts >= 5
    if (invalid) throw new AuthServiceError('Código inválido o vencido', 401)

    if (!verifyVerificationCode(code, challenge.id, this.codeSecret, challenge.codeDigest)) {
      await this.repository.incrementChallengeAttempts(challenge.id)
      throw new AuthServiceError('Código inválido o vencido', 401)
    }

    const user = await this.repository.findUserByEmail(challenge.email)
    const eligible = purpose === 'register' ? user === null : user !== null
    if (!eligible) throw new AuthServiceError('Código inválido o vencido', 401)

    await this.repository.consumeChallenge(challenge.id, now)
    if (purpose === 'login') return this.createSession(user!)

    const flowToken = jwt.sign({
      type: 'flow',
      purpose,
      email: challenge.email,
      challengeId: challenge.id,
    } satisfies FlowPayload, this.jwtSecret, { expiresIn: '5m' })
    return { flowToken }
  }

  async completeRegistration(
    flowToken: string,
    password: string,
  ): Promise<{ token: string; user: { id: number; email: string } }> {
    const flow = this.verifyFlowToken(flowToken, 'register')
    this.validatePassword(password)
    if (await this.repository.findUserByEmail(flow.email)) {
      throw new AuthServiceError('Ese email ya está registrado', 409)
    }
    if (!(await this.repository.claimCompletedFlow(flow.challengeId, this.now()))) {
      throw new AuthServiceError('Solicitud inválida o vencida', 401)
    }
    const user = await this.repository.createUser(flow.email, await hashPassword(password))
    return this.createSession(user)
  }

  async loginWithPassword(
    emailInput: string,
    password: string,
  ): Promise<{ token: string; user: { id: number; email: string } }> {
    const email = normalizeEmail(emailInput)
    const user = await this.repository.findUserByEmail(email)
    if (!user || !(await verifyPassword(user.passwordHash, password))) {
      throw new AuthServiceError('Email o contraseña incorrectos', 401)
    }
    return this.createSession(user)
  }

  async completePasswordReset(
    flowToken: string,
    password: string,
  ): Promise<{ token: string; user: { id: number; email: string } }> {
    const flow = this.verifyFlowToken(flowToken, 'reset')
    this.validatePassword(password)
    const user = await this.repository.findUserByEmail(flow.email)
    if (!user) throw new AuthServiceError('Solicitud inválida o vencida', 401)
    if (!(await this.repository.claimCompletedFlow(flow.challengeId, this.now()))) {
      throw new AuthServiceError('Solicitud inválida o vencida', 401)
    }
    const updated = await this.repository.updatePassword(user.id, await hashPassword(password))
    return this.createSession(updated)
  }

  private verifyFlowToken(token: string, purpose: 'register' | 'reset'): FlowPayload {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as FlowPayload
      if (payload.type !== 'flow' || payload.purpose !== purpose) throw new Error('invalid flow')
      return payload
    } catch {
      throw new AuthServiceError('Solicitud inválida o vencida', 401)
    }
  }

  private validatePassword(password: string): void {
    if (password.length < 10 || password.length > 128) {
      throw new AuthServiceError('La contraseña debe tener entre 10 y 128 caracteres', 400)
    }
  }

  private createSession(user: AuthUserRecord): {
    token: string
    user: { id: number; email: string }
  } {
    const token = jwt.sign({
      type: 'session',
      userId: user.id,
      email: user.email,
      sessionVersion: user.sessionVersion,
    }, this.jwtSecret, { expiresIn: '30d' })
    return { token, user: { id: user.id, email: user.email } }
  }
}

import 'dotenv/config'
import { Router, type Request, type Response } from 'express'
import { requireAuth, type AuthRequest } from '../middleware/auth.js'
import { PostgresAuthRepository } from '../repositories/authRepository.js'
import {
  AuthService,
  AuthServiceError,
  type VerificationPurpose,
} from '../services/authService.js'
import { createMailService } from '../services/mailService.js'

interface AuthApi {
  requestCode(email: string, purpose: VerificationPurpose): Promise<{ challengeId: string }>
  verifyCode(
    challengeId: string,
    code: string,
    purpose: VerificationPurpose,
  ): Promise<{ flowToken?: string; token?: string; user?: { id: number; email: string } }>
  completeRegistration(
    flowToken: string,
    password: string,
  ): Promise<{ token: string; user: { id: number; email: string } }>
  loginWithPassword(
    email: string,
    password: string,
  ): Promise<{ token: string; user: { id: number; email: string } }>
  completePasswordReset(
    flowToken: string,
    password: string,
  ): Promise<{ token: string; user: { id: number; email: string } }>
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AuthServiceError(`${label} es requerido`, 400)
  }
  return value
}

function endpoint(
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response) => void {
  return (req, res) => {
    handler(req, res).catch(error => {
      if (error instanceof AuthServiceError) {
        res.status(error.status).json({ error: error.message })
        return
      }
      console.error('[auth] Error inesperado:', error instanceof Error ? error.message : error)
      res.status(500).json({ error: 'Error interno de autenticación' })
    })
  }
}

export function createAuthRouter(service: AuthApi): Router {
  const router = Router()

  const requestCode = (purpose: VerificationPurpose) => endpoint(async (req, res) => {
    const email = requiredString(req.body?.email, 'Email')
    const result = await service.requestCode(email, purpose)
    res.status(202).json({ ...result, message: 'Si corresponde, enviamos un código.' })
  })

  const verifyCode = (purpose: VerificationPurpose) => endpoint(async (req, res) => {
    const challengeId = requiredString(req.body?.challengeId, 'challengeId')
    const code = requiredString(req.body?.code, 'Código')
    const result = await service.verifyCode(challengeId, code, purpose)
    res.json(result)
  })

  router.post('/register/code', requestCode('register'))
  router.post('/register/verify', verifyCode('register'))
  router.post('/register/complete', endpoint(async (req, res) => {
    const flowToken = requiredString(req.body?.flowToken, 'flowToken')
    const password = requiredString(req.body?.password, 'Contraseña')
    const result = await service.completeRegistration(flowToken, password)
    res.status(201).json(result)
  }))

  router.post('/login/password', endpoint(async (req, res) => {
    const email = requiredString(req.body?.email, 'Email')
    const password = requiredString(req.body?.password, 'Contraseña')
    res.json(await service.loginWithPassword(email, password))
  }))
  router.post('/login/code', requestCode('login'))
  router.post('/login/verify', verifyCode('login'))

  router.post('/reset/code', requestCode('reset'))
  router.post('/reset/verify', verifyCode('reset'))
  router.post('/reset/complete', endpoint(async (req, res) => {
    const flowToken = requiredString(req.body?.flowToken, 'flowToken')
    const password = requiredString(req.body?.password, 'Contraseña')
    res.json(await service.completePasswordReset(flowToken, password))
  }))

  return router
}

const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) throw new Error('JWT_SECRET requerido en .env')
const codeSecret = process.env.AUTH_CODE_SECRET
if (!codeSecret && process.env.NODE_ENV === 'production') {
  throw new Error('AUTH_CODE_SECRET requerido en producción')
}
const authService = new AuthService({
  repository: new PostgresAuthRepository(),
  mailer: createMailService(),
  codeSecret: codeSecret ?? jwtSecret,
  jwtSecret,
})

export const authRouter = createAuthRouter(authService)
authRouter.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: { id: req.userId, email: req.email } })
})

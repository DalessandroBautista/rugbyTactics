import 'dotenv/config'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import jwt from 'jsonwebtoken'
import { PostgresAuthRepository } from '../repositories/authRepository.js'
import type { AuthUserRecord } from '../services/authService.js'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET requerido en .env')

export interface AuthRequest extends Request {
  userId?: number
  email?: string
}

interface SessionPayload {
  type: 'session'
  userId: number
  email: string
  sessionVersion: number
}

interface AuthLookup {
  findUserById(id: number): Promise<AuthUserRecord | null>
}

export function createRequireAuth(options: {
  jwtSecret: string
  findUserById: AuthLookup['findUserById']
}): RequestHandler {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const auth = req.headers.authorization
    if (!auth?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No autorizado' })
      return
    }

    try {
      const payload = jwt.verify(auth.slice(7), options.jwtSecret) as SessionPayload
      if (payload.type !== 'session') throw new Error('Tipo de token inválido')
      const user = await options.findUserById(payload.userId)
      if (!user || user.sessionVersion !== payload.sessionVersion || user.email !== payload.email) {
        throw new Error('Sesión revocada')
      }
      req.userId = user.id
      req.email = user.email
      next()
    } catch {
      res.status(401).json({ error: 'Token inválido, revocado o expirado' })
    }
  }
}

const repository = new PostgresAuthRepository()
export const requireAuth = createRequireAuth({
  jwtSecret: JWT_SECRET,
  findUserById: id => repository.findUserById(id),
})

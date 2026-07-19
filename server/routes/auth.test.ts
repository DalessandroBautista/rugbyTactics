// @vitest-environment node
import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { AuthServiceError } from '../services/authService.js'
import { createAuthRouter } from './auth.js'

function createApp(overrides: Record<string, unknown> = {}) {
  const service = {
    requestCode: vi.fn().mockResolvedValue({ challengeId: 'challenge-1' }),
    verifyCode: vi.fn().mockResolvedValue({ flowToken: 'flow-token' }),
    completeRegistration: vi.fn().mockResolvedValue({
      token: 'session-token',
      user: { id: 1, email: 'coach@example.com' },
    }),
    loginWithPassword: vi.fn().mockResolvedValue({
      token: 'session-token',
      user: { id: 1, email: 'coach@example.com' },
    }),
    completePasswordReset: vi.fn().mockResolvedValue({
      token: 'session-token',
      user: { id: 1, email: 'coach@example.com' },
    }),
    ...overrides,
  }
  const app = express()
  app.use(express.json())
  app.use('/auth', createAuthRouter(service))
  return { app, service }
}

describe('auth routes', () => {
  it('requests a registration code with a generic accepted response', async () => {
    const { app, service } = createApp()

    const response = await request(app)
      .post('/auth/register/code')
      .send({ email: 'coach@example.com' })

    expect(response.status).toBe(202)
    expect(response.body).toEqual({ challengeId: 'challenge-1', message: 'Si corresponde, enviamos un código.' })
    expect(service.requestCode).toHaveBeenCalledWith('coach@example.com', 'register')
  })

  it('completes registration after code verification', async () => {
    const { app, service } = createApp()
    const verified = await request(app)
      .post('/auth/register/verify')
      .send({ challengeId: 'challenge-1', code: '123456' })
    const completed = await request(app)
      .post('/auth/register/complete')
      .send({ flowToken: verified.body.flowToken, password: 'una contraseña segura' })

    expect(verified.status).toBe(200)
    expect(completed.status).toBe(201)
    expect(completed.body.token).toBe('session-token')
    expect(service.completeRegistration).toHaveBeenCalledWith('flow-token', 'una contraseña segura')
  })

  it('maps operational auth errors to their HTTP status', async () => {
    const { app } = createApp({
      loginWithPassword: vi.fn().mockRejectedValue(new AuthServiceError('Email o contraseña incorrectos', 401)),
    })

    const response = await request(app)
      .post('/auth/login/password')
      .send({ email: 'coach@example.com', password: 'incorrecta' })

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Email o contraseña incorrectos' })
  })
})

// @vitest-environment node
import express from 'express'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createRequireAuth, type AuthRequest } from './auth.js'

function appFor(sessionVersion: number) {
  const app = express()
  const requireAuth = createRequireAuth({
    jwtSecret: 'test-secret',
    findUserById: async () => ({
      id: 4,
      email: 'coach@example.com',
      passwordHash: 'unused',
      sessionVersion,
    }),
  })
  app.get('/private', requireAuth, (req: AuthRequest, res) => {
    res.json({ userId: req.userId, email: req.email })
  })
  return app
}

describe('requireAuth', () => {
  it('accepts a session whose version matches the user', async () => {
    const token = jwt.sign({
      type: 'session',
      userId: 4,
      email: 'coach@example.com',
      sessionVersion: 2,
    }, 'test-secret')

    const response = await request(appFor(2))
      .get('/private')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ userId: 4, email: 'coach@example.com' })
  })

  it('rejects a session after its version changes', async () => {
    const token = jwt.sign({
      type: 'session',
      userId: 4,
      email: 'coach@example.com',
      sessionVersion: 1,
    }, 'test-secret')

    const response = await request(appFor(2))
      .get('/private')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(401)
  })
})

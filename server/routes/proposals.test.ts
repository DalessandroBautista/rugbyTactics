// @vitest-environment node
import express, { type NextFunction, type Response } from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import type { AuthRequest } from '../middleware/auth.js'
import { ProposalServiceError } from '../services/proposalService.js'
import { createProposalsRouter } from './proposals.js'

const authenticated = (req: AuthRequest, _res: Response, next: NextFunction) => {
  req.userId = 20
  next()
}

function appFor(overrides: Record<string, unknown> = {}) {
  const service = {
    submit: vi.fn().mockResolvedValue({ id: 'proposal-1', status: 'pending' }),
    inbox: vi.fn().mockResolvedValue([]),
    mine: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue({ id: 'proposal-1' }),
    accept: vi.fn().mockResolvedValue({ id: 'proposal-1', status: 'accepted' }),
    reject: vi.fn().mockResolvedValue({ id: 'proposal-1', status: 'rejected' }),
    ...overrides,
  }
  const app = express()
  app.use(express.json())
  app.use('/proposals', createProposalsRouter(service, authenticated))
  return { app, service }
}

describe('proposal routes', () => {
  it('creates a proposal for the authenticated collaborator', async () => {
    const { app, service } = appFor()
    const payload = {
      listId: 'list-1',
      playId: 'play-1',
      baseData: { id: 'play-1' },
      proposedData: { id: 'play-1', name: 'Cambio' },
    }

    const response = await request(app).post('/proposals').send(payload)

    expect(response.status).toBe(201)
    expect(response.body.id).toBe('proposal-1')
    expect(service.submit).toHaveBeenCalledWith(20, payload)
  })

  it('returns conflict details when accepting over a changed original', async () => {
    const { app } = appFor({
      accept: vi.fn().mockRejectedValue(new ProposalServiceError(
        'Tu jugada cambió',
        409,
        true,
        { id: 'play-1', name: 'Actual' },
      )),
    })

    const response = await request(app)
      .post('/proposals/proposal-1/accept')
      .send({ override: false })

    expect(response.status).toBe(409)
    expect(response.body).toMatchObject({ conflict: true, currentData: { name: 'Actual' } })
  })
})

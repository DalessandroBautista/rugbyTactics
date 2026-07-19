import { Router, type RequestHandler, type Response } from 'express'
import { requireAuth, type AuthRequest } from '../middleware/auth.js'
import { PostgresProposalRepository } from '../repositories/proposalRepository.js'
import {
  ProposalService,
  ProposalServiceError,
  type PlayProposalRecord,
  type SubmitProposalInput,
} from '../services/proposalService.js'

interface ProposalApi {
  submit(userId: number, input: SubmitProposalInput): Promise<PlayProposalRecord>
  inbox(userId: number): Promise<PlayProposalRecord[]>
  mine(userId: number): Promise<PlayProposalRecord[]>
  get(userId: number, id: string): Promise<PlayProposalRecord>
  accept(userId: number, id: string, override: boolean): Promise<PlayProposalRecord>
  reject(userId: number, id: string): Promise<PlayProposalRecord>
}

function endpoint(
  handler: (req: AuthRequest, res: Response) => Promise<void>,
): RequestHandler {
  return (req: AuthRequest, res) => {
    handler(req, res).catch(error => {
      if (error instanceof ProposalServiceError) {
        res.status(error.status).json({
          error: error.message,
          ...(error.conflict ? { conflict: true, currentData: error.currentData } : {}),
        })
        return
      }
      console.error('[proposals] Error inesperado:', error instanceof Error ? error.message : error)
      res.status(500).json({ error: 'Error interno de propuestas' })
    })
  }
}

export function createProposalsRouter(service: ProposalApi, auth: RequestHandler): Router {
  const router = Router()
  router.use(auth)

  router.post('/', endpoint(async (req, res) => {
    const proposal = await service.submit(req.userId!, req.body as SubmitProposalInput)
    res.status(201).json(proposal)
  }))
  router.get('/inbox', endpoint(async (req, res) => {
    res.json(await service.inbox(req.userId!))
  }))
  router.get('/mine', endpoint(async (req, res) => {
    res.json(await service.mine(req.userId!))
  }))
  router.get('/:id', endpoint(async (req, res) => {
    res.json(await service.get(req.userId!, String(req.params.id)))
  }))
  router.post('/:id/accept', endpoint(async (req, res) => {
    res.json(await service.accept(req.userId!, String(req.params.id), req.body?.override === true))
  }))
  router.post('/:id/reject', endpoint(async (req, res) => {
    res.json(await service.reject(req.userId!, String(req.params.id)))
  }))

  return router
}

export const proposalsRouter = createProposalsRouter(
  new ProposalService({ repository: new PostgresProposalRepository() }),
  requireAuth,
)

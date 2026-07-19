// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ProposalService,
  type PlayProposalRecord,
  type ProposalRepository,
} from './proposalService.js'

const basePlay = {
  id: 'play-1',
  name: 'Salida',
  category: 'Ataque',
  players: [{ id: 1, x: 10, y: 20, trajectory: [] }],
  ball: { x: 10, y: 20, trajectory: [] },
  tags: ['salida'],
}

class MemoryProposalRepository implements ProposalRepository {
  proposals: PlayProposalRecord[] = []
  ownerPlay: Record<string, unknown> = structuredClone(basePlay)
  playlistPlay: Record<string, unknown> = structuredClone(basePlay)

  async findPlaylistPlay(listId: string, playId: string) {
    return listId === 'list-1' && playId === 'play-1'
      ? { ownerUserId: 10, play: this.playlistPlay }
      : null
  }

  async createProposal(proposal: PlayProposalRecord) {
    this.proposals.push(proposal)
  }

  async findProposal(id: string) {
    return this.proposals.find(proposal => proposal.id === id) ?? null
  }

  async listInbox(ownerUserId: number) {
    return this.proposals.filter(proposal => proposal.ownerUserId === ownerUserId)
  }

  async listMine(proposerUserId: number) {
    return this.proposals.filter(proposal => proposal.proposerUserId === proposerUserId)
  }

  async findOwnerPlay(ownerUserId: number, playId: string) {
    return ownerUserId === 10 && playId === 'play-1' ? this.ownerPlay : null
  }

  async acceptProposal(proposal: PlayProposalRecord, reviewedAt: Date) {
    this.ownerPlay = structuredClone(proposal.proposedData)
    this.playlistPlay = structuredClone(proposal.proposedData)
    proposal.status = 'accepted'
    proposal.reviewedAt = reviewedAt
  }

  async rejectProposal(proposal: PlayProposalRecord, reviewedAt: Date) {
    proposal.status = 'rejected'
    proposal.reviewedAt = reviewedAt
  }
}

describe('ProposalService', () => {
  let repository: MemoryProposalRepository
  let service: ProposalService

  beforeEach(() => {
    repository = new MemoryProposalRepository()
    service = new ProposalService({ repository, now: () => new Date('2026-07-18T12:00:00Z') })
  })

  it('creates a proposal for the owner of a shared playlist play', async () => {
    const changed = { ...structuredClone(basePlay), name: 'Salida corta' }

    const proposal = await service.submit(20, {
      listId: 'list-1',
      playId: 'play-1',
      baseData: basePlay,
      proposedData: changed,
      message: 'Probemos una variante',
    })

    expect(proposal.ownerUserId).toBe(10)
    expect(proposal.proposerUserId).toBe(20)
    expect(proposal.status).toBe('pending')
    expect(proposal.summary.metadata).toContain('Nombre')
  })

  it('prevents the owner from proposing changes to their own play', async () => {
    await expect(service.submit(10, {
      listId: 'list-1',
      playId: 'play-1',
      baseData: basePlay,
      proposedData: basePlay,
    })).rejects.toMatchObject({ status: 400 })
  })

  it('detects owner changes before accepting and requires an override', async () => {
    const proposal = await service.submit(20, {
      listId: 'list-1',
      playId: 'play-1',
      baseData: basePlay,
      proposedData: { ...structuredClone(basePlay), name: 'Propuesta' },
    })
    repository.ownerPlay = { ...structuredClone(basePlay), name: 'Cambio del dueño' }

    await expect(service.accept(10, proposal.id, false))
      .rejects.toMatchObject({ status: 409, conflict: true })

    const accepted = await service.accept(10, proposal.id, true)
    expect(accepted.status).toBe('accepted')
    expect(repository.ownerPlay.name).toBe('Propuesta')
  })

  it('allows only the owner to reject a pending proposal', async () => {
    const proposal = await service.submit(20, {
      listId: 'list-1',
      playId: 'play-1',
      baseData: basePlay,
      proposedData: { ...structuredClone(basePlay), name: 'Propuesta' },
    })

    await expect(service.reject(99, proposal.id)).rejects.toMatchObject({ status: 403 })
    expect((await service.reject(10, proposal.id)).status).toBe('rejected')
  })

  it('keeps inbox, sent proposals and details private', async () => {
    const proposal = await service.submit(20, {
      listId: 'list-1',
      playId: 'play-1',
      baseData: basePlay,
      proposedData: { ...structuredClone(basePlay), name: 'Propuesta' },
    })

    expect(await service.inbox(10)).toHaveLength(1)
    expect(await service.mine(20)).toHaveLength(1)
    expect((await service.get(20, proposal.id)).id).toBe(proposal.id)
    await expect(service.get(99, proposal.id)).rejects.toMatchObject({ status: 403 })
  })
})

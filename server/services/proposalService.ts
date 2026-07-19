export type ProposalStatus = 'pending' | 'accepted' | 'rejected'

export interface ProposalSummary {
  metadata: string[]
  playersMoved: number
  trajectoriesChanged: number
  ballChanged: boolean
  tacticalElementsChanged: boolean
}

export interface PlayProposalRecord {
  id: string
  playlistId: string
  playId: string
  ownerUserId: number
  proposerUserId: number
  proposerEmail?: string
  baseData: Record<string, unknown>
  proposedData: Record<string, unknown>
  message: string | null
  status: ProposalStatus
  summary: ProposalSummary
  createdAt: Date
  reviewedAt: Date | null
}

export interface SubmitProposalInput {
  listId: string
  playId: string
  baseData: Record<string, unknown>
  proposedData: Record<string, unknown>
  message?: string
}

export interface ProposalRepository {
  findPlaylistPlay(listId: string, playId: string): Promise<{
    ownerUserId: number
    play: Record<string, unknown>
  } | null>
  createProposal(proposal: PlayProposalRecord): Promise<void>
  findProposal(id: string): Promise<PlayProposalRecord | null>
  listInbox(ownerUserId: number): Promise<PlayProposalRecord[]>
  listMine(proposerUserId: number): Promise<PlayProposalRecord[]>
  findOwnerPlay(ownerUserId: number, playId: string): Promise<Record<string, unknown> | null>
  acceptProposal(proposal: PlayProposalRecord, reviewedAt: Date): Promise<void>
  rejectProposal(proposal: PlayProposalRecord, reviewedAt: Date): Promise<void>
}

export class ProposalServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly conflict = false,
    public readonly currentData?: Record<string, unknown>,
  ) {
    super(message)
  }
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function summarizePlayChanges(
  base: Record<string, unknown>,
  proposed: Record<string, unknown>,
): ProposalSummary {
  const metadataFields: Array<[string, string]> = [
    ['name', 'Nombre'],
    ['description', 'Descripción'],
    ['category', 'Categoría'],
    ['tags', 'Etiquetas'],
    ['duration', 'Duración'],
  ]
  const metadata = metadataFields
    .filter(([field]) => !same(base[field], proposed[field]))
    .map(([, label]) => label)

  const basePlayers = Array.isArray(base.players) ? base.players as Array<Record<string, unknown>> : []
  const proposedPlayers = Array.isArray(proposed.players) ? proposed.players as Array<Record<string, unknown>> : []
  const proposedById = new Map(proposedPlayers.map(player => [player.id, player]))
  let playersMoved = 0
  let trajectoriesChanged = 0
  for (const player of basePlayers) {
    const changed = proposedById.get(player.id)
    if (!changed) continue
    if (player.x !== changed.x || player.y !== changed.y || player.orientation !== changed.orientation) {
      playersMoved += 1
    }
    if (!same(player.trajectory, changed.trajectory)) trajectoriesChanged += 1
  }

  return {
    metadata,
    playersMoved,
    trajectoriesChanged,
    ballChanged: !same(base.ball, proposed.ball),
    tacticalElementsChanged: ['zones', 'overlayImage', 'speechBubbles']
      .some(field => !same(base[field], proposed[field])),
  }
}

export class ProposalService {
  private readonly repository: ProposalRepository
  private readonly now: () => Date

  constructor(options: { repository: ProposalRepository; now?: () => Date }) {
    this.repository = options.repository
    this.now = options.now ?? (() => new Date())
  }

  async submit(userId: number, input: SubmitProposalInput): Promise<PlayProposalRecord> {
    const source = await this.repository.findPlaylistPlay(input.listId, input.playId)
    if (!source) throw new ProposalServiceError('La jugada compartida ya no existe', 404)
    if (source.ownerUserId === userId) {
      throw new ProposalServiceError('No podés proponerte cambios a vos mismo', 400)
    }
    if (
      input.baseData?.id !== input.playId ||
      input.proposedData?.id !== input.playId ||
      (input.message?.length ?? 0) > 500
    ) {
      throw new ProposalServiceError('Propuesta inválida', 400)
    }

    const proposal: PlayProposalRecord = {
      id: randomUUID(),
      playlistId: input.listId,
      playId: input.playId,
      ownerUserId: source.ownerUserId,
      proposerUserId: userId,
      baseData: structuredClone(input.baseData),
      proposedData: structuredClone(input.proposedData),
      message: input.message?.trim() || null,
      status: 'pending',
      summary: summarizePlayChanges(input.baseData, input.proposedData),
      createdAt: this.now(),
      reviewedAt: null,
    }
    await this.repository.createProposal(proposal)
    return proposal
  }

  async accept(ownerId: number, id: string, override: boolean): Promise<PlayProposalRecord> {
    const proposal = await this.requirePendingOwnerProposal(ownerId, id)
    const current = await this.repository.findOwnerPlay(ownerId, proposal.playId)
    if (current && !same(current, proposal.baseData) && !override) {
      throw new ProposalServiceError(
        'Tu jugada cambió desde que se creó la propuesta',
        409,
        true,
        current,
      )
    }
    const reviewedAt = this.now()
    await this.repository.acceptProposal(proposal, reviewedAt)
    return { ...proposal, status: 'accepted', reviewedAt }
  }

  async reject(ownerId: number, id: string): Promise<PlayProposalRecord> {
    const proposal = await this.requirePendingOwnerProposal(ownerId, id)
    const reviewedAt = this.now()
    await this.repository.rejectProposal(proposal, reviewedAt)
    return { ...proposal, status: 'rejected', reviewedAt }
  }

  inbox(ownerId: number): Promise<PlayProposalRecord[]> {
    return this.repository.listInbox(ownerId)
  }

  mine(proposerId: number): Promise<PlayProposalRecord[]> {
    return this.repository.listMine(proposerId)
  }

  async get(userId: number, id: string): Promise<PlayProposalRecord> {
    const proposal = await this.repository.findProposal(id)
    if (!proposal) throw new ProposalServiceError('Propuesta no encontrada', 404)
    if (proposal.ownerUserId !== userId && proposal.proposerUserId !== userId) {
      throw new ProposalServiceError('Sin permiso', 403)
    }
    return proposal
  }

  private async requirePendingOwnerProposal(ownerId: number, id: string): Promise<PlayProposalRecord> {
    const proposal = await this.repository.findProposal(id)
    if (!proposal) throw new ProposalServiceError('Propuesta no encontrada', 404)
    if (proposal.ownerUserId !== ownerId) throw new ProposalServiceError('Sin permiso', 403)
    if (proposal.status !== 'pending') throw new ProposalServiceError('La propuesta ya fue resuelta', 409)
    return proposal
  }
}
import { randomUUID } from 'crypto'

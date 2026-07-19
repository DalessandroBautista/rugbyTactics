import { sql } from '../db.js'
import type {
  PlayProposalRecord,
  ProposalRepository,
  ProposalStatus,
  ProposalSummary,
} from '../services/proposalService.js'

interface ProposalRow {
  id: string
  playlist_id: string
  play_id: string
  owner_user_id: number
  proposer_user_id: number
  proposer_email?: string
  base_data: Record<string, unknown>
  proposed_data: Record<string, unknown>
  message: string | null
  status: ProposalStatus
  summary: ProposalSummary
  created_at: Date
  reviewed_at: Date | null
}

function mapProposal(row: ProposalRow): PlayProposalRecord {
  return {
    id: row.id,
    playlistId: row.playlist_id,
    playId: row.play_id,
    ownerUserId: row.owner_user_id,
    proposerUserId: row.proposer_user_id,
    proposerEmail: row.proposer_email,
    baseData: row.base_data,
    proposedData: row.proposed_data,
    message: row.message,
    status: row.status,
    summary: row.summary,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  }
}

export class PostgresProposalRepository implements ProposalRepository {
  async findPlaylistPlay(listId: string, playId: string) {
    const rows = await sql<{ owner_user_id: number; data: Array<Record<string, unknown>> }[]>`
      SELECT user_id AS owner_user_id, data FROM playlists WHERE id = ${listId} LIMIT 1
    `
    if (!rows[0]) return null
    const play = rows[0].data.find(candidate => candidate.id === playId)
    return play ? { ownerUserId: rows[0].owner_user_id, play } : null
  }

  async createProposal(proposal: PlayProposalRecord): Promise<void> {
    await sql`
      INSERT INTO play_proposals (
        id, playlist_id, play_id, owner_user_id, proposer_user_id,
        base_data, proposed_data, message, status, summary, created_at
      ) VALUES (
        ${proposal.id}, ${proposal.playlistId}, ${proposal.playId},
        ${proposal.ownerUserId}, ${proposal.proposerUserId},
        ${sql.json(JSON.parse(JSON.stringify(proposal.baseData)))}, ${sql.json(JSON.parse(JSON.stringify(proposal.proposedData)))},
        ${proposal.message}, ${proposal.status}, ${sql.json(JSON.parse(JSON.stringify(proposal.summary)))},
        ${proposal.createdAt}
      )
    `
  }

  async findProposal(id: string): Promise<PlayProposalRecord | null> {
    const rows = await sql<ProposalRow[]>`
      SELECT p.*, u.email AS proposer_email
      FROM play_proposals p
      JOIN users u ON u.id = p.proposer_user_id
      WHERE p.id = ${id}
      LIMIT 1
    `
    return rows[0] ? mapProposal(rows[0]) : null
  }

  async listInbox(ownerUserId: number): Promise<PlayProposalRecord[]> {
    const rows = await sql<ProposalRow[]>`
      SELECT p.*, u.email AS proposer_email
      FROM play_proposals p
      JOIN users u ON u.id = p.proposer_user_id
      WHERE p.owner_user_id = ${ownerUserId}
      ORDER BY (p.status = 'pending') DESC, p.created_at DESC
    `
    return rows.map(mapProposal)
  }

  async listMine(proposerUserId: number): Promise<PlayProposalRecord[]> {
    const rows = await sql<ProposalRow[]>`
      SELECT p.*, u.email AS proposer_email
      FROM play_proposals p
      JOIN users u ON u.id = p.proposer_user_id
      WHERE p.proposer_user_id = ${proposerUserId}
      ORDER BY p.created_at DESC
    `
    return rows.map(mapProposal)
  }

  async findOwnerPlay(ownerUserId: number, playId: string): Promise<Record<string, unknown> | null> {
    const rows = await sql<{ data: Record<string, unknown> }[]>`
      SELECT data FROM plays WHERE user_id = ${ownerUserId} AND id = ${playId} LIMIT 1
    `
    return rows[0]?.data ?? null
  }

  async acceptProposal(proposal: PlayProposalRecord, reviewedAt: Date): Promise<void> {
    await sql.begin(async tx => {
      await tx`
        UPDATE plays SET data = ${tx.json(JSON.parse(JSON.stringify(proposal.proposedData)))}, synced_at = NOW()
        WHERE user_id = ${proposal.ownerUserId} AND id = ${proposal.playId}
      `
      await tx`
        UPDATE playlists
        SET data = (
          SELECT COALESCE(
            jsonb_agg(
              CASE WHEN item->>'id' = ${proposal.playId}
                THEN ${tx.json(JSON.parse(JSON.stringify(proposal.proposedData)))}::jsonb
                ELSE item
              END ORDER BY ordinality
            ),
            '[]'::jsonb
          )
          FROM jsonb_array_elements(data) WITH ORDINALITY AS entries(item, ordinality)
        ), updated_at = NOW()
        WHERE id = ${proposal.playlistId} AND user_id = ${proposal.ownerUserId}
      `
      await tx`
        UPDATE play_proposals SET status = 'accepted', reviewed_at = ${reviewedAt}
        WHERE id = ${proposal.id} AND status = 'pending'
      `
    })
  }

  async rejectProposal(proposal: PlayProposalRecord, reviewedAt: Date): Promise<void> {
    await sql`
      UPDATE play_proposals SET status = 'rejected', reviewed_at = ${reviewedAt}
      WHERE id = ${proposal.id} AND status = 'pending'
    `
  }
}

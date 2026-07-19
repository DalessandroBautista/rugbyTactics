import type { Play, PlaylistMeta, PublicPlaylist } from '../types'

const BASE = '/api'

function token(): string | null {
  return localStorage.getItem('tr_token')
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const t = token()
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string; conflict?: boolean; currentData?: Play }
    throw new ApiError(body.error ?? `HTTP ${res.status}`, res.status, body)
  }
  return res.json() as Promise<T>
}

export interface AuthUser { id: number; email: string }
export interface AuthSession { token: string; user: AuthUser }
export class ApiError extends Error {
  constructor(message: string, public status: number, public body: { conflict?: boolean; currentData?: Play }) {
    super(message)
  }
}

export interface PlayProposal {
  id: string
  playlistId: string
  playId: string
  proposerEmail?: string
  baseData: Play
  proposedData: Play
  message: string | null
  status: 'pending' | 'accepted' | 'rejected'
  summary: { metadata: string[]; playersMoved: number; trajectoriesChanged: number; ballChanged: boolean; tacticalElementsChanged: boolean }
  createdAt: string
}

export const api = {
  requestRegisterCode: (email: string) =>
    req<{ challengeId: string; message: string }>('/auth/register/code', {
      method: 'POST', body: JSON.stringify({ email }),
    }),

  verifyRegisterCode: (challengeId: string, code: string) =>
    req<{ flowToken: string }>('/auth/register/verify', {
      method: 'POST', body: JSON.stringify({ challengeId, code }),
    }),

  completeRegistration: (flowToken: string, password: string) =>
    req<AuthSession>('/auth/register/complete', {
      method: 'POST', body: JSON.stringify({ flowToken, password }),
    }),

  login: (email: string, password: string) =>
    req<AuthSession>('/auth/login/password', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),

  requestLoginCode: (email: string) =>
    req<{ challengeId: string; message: string }>('/auth/login/code', {
      method: 'POST', body: JSON.stringify({ email }),
    }),

  verifyLoginCode: (challengeId: string, code: string) =>
    req<AuthSession>('/auth/login/verify', {
      method: 'POST', body: JSON.stringify({ challengeId, code }),
    }),

  requestResetCode: (email: string) =>
    req<{ challengeId: string; message: string }>('/auth/reset/code', {
      method: 'POST', body: JSON.stringify({ email }),
    }),

  verifyResetCode: (challengeId: string, code: string) =>
    req<{ flowToken: string }>('/auth/reset/verify', {
      method: 'POST', body: JSON.stringify({ challengeId, code }),
    }),

  completePasswordReset: (flowToken: string, password: string) =>
    req<AuthSession>('/auth/reset/complete', {
      method: 'POST', body: JSON.stringify({ flowToken, password }),
    }),

  me: () => req<{ user: AuthUser }>('/auth/me'),

  syncPlays: (plays: Play[]) =>
    req<Play[]>('/plays/sync', {
      method: 'POST', body: JSON.stringify({ plays }),
    }),

  // ── Listas de reproducción ────────────────────────────────────────────────
  listPlaylists: () => req<PlaylistMeta[]>('/playlists'),

  createPlaylist: (name: string, plays: Play[]) =>
    req<{ id: string }>('/playlists', {
      method: 'POST', body: JSON.stringify({ name, plays }),
    }),

  updatePlaylist: (id: string, updates: { name?: string; plays?: Play[] }) =>
    req<{ ok: true }>(`/playlists/${id}`, {
      method: 'PUT', body: JSON.stringify(updates),
    }),

  deletePlaylist: (id: string) =>
    req<{ ok: true }>(`/playlists/${id}`, { method: 'DELETE' }),

  /** Pública: no requiere sesión — es lo que abre quien recibe el link. */
  getPublicPlaylist: (id: string) => req<PublicPlaylist>(`/public/playlists/${id}`),

  getPlaylist: (id: string) => req<PublicPlaylist>(`/playlists/${id}`),

  submitProposal: (input: { listId: string; playId: string; baseData: Play; proposedData: Play; message?: string }) =>
    req<PlayProposal>('/proposals', { method: 'POST', body: JSON.stringify(input) }),
  proposalInbox: () => req<PlayProposal[]>('/proposals/inbox'),
  myProposals: () => req<PlayProposal[]>('/proposals/mine'),
  acceptProposal: (id: string, override = false) => req<PlayProposal>(`/proposals/${id}/accept`, {
    method: 'POST', body: JSON.stringify({ override }),
  }),
  rejectProposal: (id: string) => req<PlayProposal>(`/proposals/${id}/reject`, { method: 'POST' }),
}

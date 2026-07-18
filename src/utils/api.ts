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
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export interface AuthUser { id: number; username: string }

export const api = {
  register: (username: string, password: string) =>
    req<{ token: string; user: AuthUser }>('/auth/register', {
      method: 'POST', body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    req<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ username, password }),
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
}

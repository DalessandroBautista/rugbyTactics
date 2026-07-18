import { Router } from 'express'
import { randomBytes } from 'crypto'
import { sql } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'

// Token corto apto para URL (ej. "kX3n9aQz") — id público de la lista
function newToken(): string {
  return randomBytes(6).toString('base64url')
}

// ── Rutas del dueño (requieren sesión) ──────────────────────────────────────
export const playlistsRouter = Router()
playlistsRouter.use(requireAuth)

// GET /api/playlists — listas del usuario (sin las jugadas, solo metadata)
playlistsRouter.get('/', async (req: AuthRequest, res) => {
  const rows = await sql<{ id: string; name: string; count: number; updated_at: string }[]>`
    SELECT id, name, jsonb_array_length(data) AS count, updated_at
    FROM playlists WHERE user_id = ${req.userId!} ORDER BY updated_at DESC
  `
  res.json(rows.map(r => ({ id: r.id, name: r.name, count: Number(r.count), updatedAt: r.updated_at })))
})

// POST /api/playlists — crea una lista con un snapshot de las jugadas
playlistsRouter.post('/', async (req: AuthRequest, res) => {
  const { name, plays } = req.body ?? {}
  if (typeof name !== 'string' || !name.trim() || !Array.isArray(plays) || plays.length === 0) {
    res.status(400).json({ error: 'name y plays (no vacío) son requeridos' })
    return
  }
  const id = newToken()
  await sql`
    INSERT INTO playlists (id, user_id, name, data)
    VALUES (${id}, ${req.userId!}, ${name.trim()}, ${sql.json(plays)})
  `
  res.json({ id })
})

// PUT /api/playlists/:id — actualiza nombre y/o re-snapshotea las jugadas
playlistsRouter.put('/:id', async (req: AuthRequest, res) => {
  const { name, plays } = req.body ?? {}
  const updated = await sql<{ id: string }[]>`
    UPDATE playlists SET
      name = COALESCE(${typeof name === 'string' && name.trim() ? name.trim() : null}, name),
      data = COALESCE(${Array.isArray(plays) && plays.length > 0 ? sql.json(plays) : null}, data),
      updated_at = NOW()
    WHERE id = ${req.params.id} AND user_id = ${req.userId!}
    RETURNING id
  `
  if (updated.length === 0) {
    res.status(404).json({ error: 'Lista no encontrada' })
    return
  }
  res.json({ ok: true })
})

// DELETE /api/playlists/:id
playlistsRouter.delete('/:id', async (req: AuthRequest, res) => {
  const deleted = await sql<{ id: string }[]>`
    DELETE FROM playlists WHERE id = ${req.params.id} AND user_id = ${req.userId!} RETURNING id
  `
  if (deleted.length === 0) {
    res.status(404).json({ error: 'Lista no encontrada' })
    return
  }
  res.json({ ok: true })
})

// ── Ruta pública (solo lectura, sin sesión) ─────────────────────────────────
export const publicPlaylistsRouter = Router()

// GET /api/public/playlists/:id — lo que abre quien recibe el link
publicPlaylistsRouter.get('/:id', async (req, res) => {
  const rows = await sql<{ id: string; name: string; data: unknown }[]>`
    SELECT id, name, data FROM playlists WHERE id = ${req.params.id}
  `
  if (rows.length === 0) {
    res.status(404).json({ error: 'Lista no encontrada' })
    return
  }
  res.json({ id: rows[0].id, name: rows[0].name, plays: rows[0].data })
})

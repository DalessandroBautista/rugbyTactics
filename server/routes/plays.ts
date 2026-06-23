import { Router } from 'express'
import { sql } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'

export const playsRouter = Router()
playsRouter.use(requireAuth)

// GET /api/plays — todas las jugadas del usuario
playsRouter.get('/', async (req: AuthRequest, res) => {
  const rows = await sql<{ data: unknown }[]>`
    SELECT data FROM plays WHERE user_id = ${req.userId!} ORDER BY synced_at ASC
  `
  res.json(rows.map(r => r.data))
})

// POST /api/plays/sync — sincroniza el estado completo del cliente
// El cliente envía todas sus jugadas; el servidor hace upsert y devuelve el estado merged.
playsRouter.post('/sync', async (req: AuthRequest, res) => {
  const { plays } = req.body ?? {}
  if (!Array.isArray(plays)) {
    res.status(400).json({ error: 'plays debe ser un array' })
    return
  }

  await sql.begin(async (tx) => {
    // Eliminar jugadas que ya no existen en el cliente (fueron borradas localmente)
    if (plays.length > 0) {
      const ids = plays.map((p: { id: string }) => p.id).filter(Boolean)
      await tx`
        DELETE FROM plays
        WHERE user_id = ${req.userId!}
          AND id != ALL(${ids as string[]})
      `
    } else {
      await tx`DELETE FROM plays WHERE user_id = ${req.userId!}`
    }

    // Upsert de cada jugada
    for (const play of plays) {
      if (!play?.id) continue
      await tx`
        INSERT INTO plays (id, user_id, data, synced_at)
        VALUES (${play.id as string}, ${req.userId!}, ${tx.json(play)}, NOW())
        ON CONFLICT (id) DO UPDATE
          SET data = EXCLUDED.data, synced_at = NOW()
      `
    }
  })

  const rows = await sql<{ data: unknown }[]>`
    SELECT data FROM plays WHERE user_id = ${req.userId!} ORDER BY synced_at ASC
  `
  res.json(rows.map(r => r.data))
})

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { initDb } from './db.js'
import { authRouter } from './routes/auth.js'
import { playsRouter } from './routes/plays.js'
import { playlistsRouter, publicPlaylistsRouter } from './routes/playlists.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
const distPath = join(__dirname, '../dist')

const app = express()
const PORT = Number(process.env.PORT ?? 3333)
const FRONTEND = process.env.FRONTEND_URL ?? 'http://localhost:5173'

// En dev el frontend corre en Vite (:5173), necesita CORS.
// En prod Express sirve el build estático, mismo origen → no necesita CORS.
if (!isProd) {
  app.use(cors({ origin: FRONTEND, credentials: true }))
}
app.use(express.json({ limit: '10mb' }))

app.use('/api/auth', authRouter)
app.use('/api/plays', playsRouter)
app.use('/api/playlists', playlistsRouter)
app.use('/api/public/playlists', publicPlaylistsRouter)
app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }))

// En producción servir el build de Vite como SPA
if (isProd && existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(join(distPath, 'index.html')))
}

async function start() {
  await initDb()
  app.listen(PORT, () => {
    console.log(`[server] ${isProd ? 'Producción' : 'Dev'} en http://localhost:${PORT}`)
  })
}

start().catch((e) => {
  console.error('[server] Falló al iniciar:', e)
  process.exit(1)
})

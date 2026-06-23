import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { sql } from '../db.js'
import { signToken, requireAuth } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'

export const authRouter = Router()

authRouter.post('/register', async (req, res) => {
  const { username, password } = req.body ?? {}
  if (!username?.trim() || !password) {
    res.status(400).json({ error: 'Usuario y contraseña son requeridos' })
    return
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    return
  }
  const hash = await bcrypt.hash(password, 10)
  try {
    const [user] = await sql<{ id: number; username: string }[]>`
      INSERT INTO users (username, password_hash)
      VALUES (${username.trim()}, ${hash})
      RETURNING id, username
    `
    res.status(201).json({ token: signToken(user.id, user.username), user: { id: user.id, username: user.username } })
  } catch (e: unknown) {
    const pg = e as { code?: string }
    if (pg.code === '23505') res.status(409).json({ error: 'Ese nombre de usuario ya existe' })
    else res.status(500).json({ error: 'Error al registrar' })
  }
})

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {}
  if (!username?.trim() || !password) {
    res.status(400).json({ error: 'Usuario y contraseña son requeridos' })
    return
  }
  const [user] = await sql<{ id: number; username: string; password_hash: string }[]>`
    SELECT id, username, password_hash FROM users WHERE username = ${username.trim()}
  `
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: 'Usuario o contraseña incorrectos' })
    return
  }
  res.json({ token: signToken(user.id, user.username), user: { id: user.id, username: user.username } })
})

authRouter.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: { id: req.userId, username: req.username } })
})

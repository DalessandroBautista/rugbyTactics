import { Play, Player, SCALE, TrajectoryPoint } from '../types'
import { getInterpolatedPosition } from './interpolation'

/** Radio (en metros) alrededor de la pelota dentro del cual un jugador se
 *  considera participante del lineout y mira hacia la pelota. */
const LINEOUT_RADIUS_M = 20

/** Ángulo "hacia adelante" por equipo, en grados de coords de campo (0 = +x).
 *  El equipo propio ataca hacia y decreciente (-90°); el rival, hacia +y. */
export function forwardAngle(team: Player['team']): number {
  return team === 'home' ? -90 : 90
}

/**
 * Orientación efectiva de un jugador en grados (coords de campo).
 * Prioridad: orientación manual → hacia la pelota si la jugada es un lineout
 * y el jugador participa (cerca de la pelota) → hacia adelante según equipo.
 */
export function playerOrientation(player: Player, play: Play): number {
  if (player.orientation !== undefined && player.orientation !== null) {
    return player.orientation
  }
  if (play.category === 'Lineout') {
    const dx = play.ball.x - player.x
    const dy = play.ball.y - player.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 1 && dist <= LINEOUT_RADIUS_M * SCALE) {
      return (Math.atan2(dy, dx) * 180) / Math.PI
    }
  }
  return forwardAngle(player.team)
}

// Ventana de muestreo (ms) y distancia mínima (px) para considerar que el
// jugador se está desplazando durante la reproducción.
const MOVE_SAMPLE_MS = 120
const MOVE_MIN_DIST = 1.5

/**
 * Orientación según la dirección de movimiento en el instante `time` de la
 * animación, o null si el jugador está quieto (o sin trayectoria).
 */
export function movementOrientation(trajectory: TrajectoryPoint[], time: number): number | null {
  if (trajectory.length < 2) return null
  const fallback = { x: trajectory[0].x, y: trajectory[0].y }
  const a = getInterpolatedPosition(trajectory, time, fallback)
  const b = getInterpolatedPosition(trajectory, time + MOVE_SAMPLE_MS, fallback)
  if (!a || !b) return null
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (Math.sqrt(dx * dx + dy * dy) < MOVE_MIN_DIST) return null
  return (Math.atan2(dy, dx) * 180) / Math.PI
}

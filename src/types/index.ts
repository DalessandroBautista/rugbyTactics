export interface TrajectoryPoint {
  x: number
  y: number
  time: number
}

export interface Player {
  id: number
  number: number
  team: 'home' | 'away'
  color: string
  name?: string
  x: number
  y: number
  trajectory: TrajectoryPoint[]
}

export interface Ball {
  x: number
  y: number
  carriedBy: number | null
  trajectory: TrajectoryPoint[]
  size: number
}

export interface Play {
  id: string
  name: string
  description: string
  category: string
  createdAt: string
  players: Player[]
  ball: Ball
  duration: number
  tags?: string[]
  zones?: TacticalZone[]
  overlayImage?: OverlayImage
  speechBubbles?: SpeechBubble[]
}

export type ZoneShape = 'rect' | 'circle' | 'arrow'
export interface TacticalZone {
  id: string
  shape: ZoneShape
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  color: string
  label?: string
}

export interface OverlayImage {
  dataURL: string
  x: number
  y: number
  width: number
  height: number
  opacity: number
}

export interface SpeechBubble {
  id: string
  text: string
  x: number
  y: number
  startTime: number  // segundo de la jugada en que aparece (ms)
  duration: number   // cuánto dura visible (ms)
  color?: string
  textColor?: string
}

export interface PlayTemplate {
  name: string
  description: string
  category: string
}

export type EditMode = 'move' | 'record' | 'select'
export type PlaybackSpeed = 0.5 | 1 | 2 | 4

export interface ViewState {
  zoom: number
  panX: number
  panY: number
}

export const HOME_PLAYER_COLOR = '#3b82f6'
export const AWAY_PLAYER_COLOR = '#ef4444'

export const DEFAULT_PLAYER_COLORS = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#34495e',
  '#e91e63',
  '#00bcd4',
  '#ff5722',
  '#4caf50',
  '#ff9800',
  '#795548',
  '#607d8b',
]

export const FIELD_METERS = {
  width: 70,
  totalLength: 144,
  playingLength: 100,
  inGoalLength: 22,
}

export const SCALE = 12

export const FIELD_PX = {
  width: FIELD_METERS.width * SCALE,
  totalLength: FIELD_METERS.totalLength * SCALE,
  playingLength: FIELD_METERS.playingLength * SCALE,
  inGoalLength: FIELD_METERS.inGoalLength * SCALE,
  halfway: (FIELD_METERS.totalLength / 2) * SCALE,
  twentyTwoFromTry: 22 * SCALE,
  tenMeter: 10 * SCALE,
  fiveMeter: 5 * SCALE,
}

// Nombre de la posición de rugby por número de camiseta (1–15)
export const RUGBY_POSITIONS: Record<number, string> = {
  1: 'Pilar izquierdo',
  2: 'Hooker',
  3: 'Pilar derecho',
  4: 'Segunda línea',
  5: 'Segunda línea',
  6: 'Ala ciega',
  7: 'Ala abierta',
  8: 'Octavo',
  9: 'Medio scrum',
  10: 'Apertura',
  11: 'Wing izquierdo',
  12: 'Primer centro',
  13: 'Segundo centro',
  14: 'Wing derecho',
  15: 'Fullback',
}

export function rugbyPosition(number: number): string | null {
  return RUGBY_POSITIONS[number] ?? null
}

// Formación de ataque por número, en metros: ax = ancho (0–70, centro 35),
// ay = largo (0–144, mediocampo 72). Forwards agrupados cerca del breakdown,
// backline desplegada en diagonal hacia el avance.
export const ATTACK_FORMATION: Record<number, { ax: number; ay: number }> = {
  1: { ax: 31, ay: 68 },
  2: { ax: 35, ay: 67 },
  3: { ax: 39, ay: 68 },
  4: { ax: 33, ay: 65 },
  5: { ax: 37, ay: 65 },
  6: { ax: 29, ay: 66 },
  7: { ax: 41, ay: 66 },
  8: { ax: 35, ay: 63 },
  9: { ax: 35, ay: 70 },
  10: { ax: 42, ay: 73 },
  12: { ax: 48, ay: 75 },
  13: { ax: 54, ay: 77 },
  11: { ax: 14, ay: 79 },
  14: { ax: 62, ay: 81 },
  15: { ax: 35, ay: 87 },
}

export const PLAY_CATEGORIES = [
  'Lineout',
  'Scrum',
  'Attack',
  'Defense',
  'Backline',
  'Maul',
  'Kick',
  'General',
]

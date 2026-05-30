export interface TrajectoryPoint {
  x: number
  y: number
  time: number
}

export interface Player {
  id: number
  number: number
  color: string
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

import { TrajectoryPoint } from '../types'

export function getInterpolatedPosition(
  trajectory: TrajectoryPoint[],
  currentTime: number,
  defaultValue: { x: number; y: number }
): { x: number; y: number } | null {
  if (!trajectory || trajectory.length === 0) return null
  if (trajectory.length === 1) return { x: trajectory[0].x, y: trajectory[0].y }
  if (currentTime <= trajectory[0].time) return { x: trajectory[0].x, y: trajectory[0].y }

  const last = trajectory[trajectory.length - 1]
  if (currentTime >= last.time) return { x: last.x, y: last.y }

  for (let i = 0; i < trajectory.length - 1; i++) {
    const a = trajectory[i]
    const b = trajectory[i + 1]
    if (currentTime >= a.time && currentTime <= b.time) {
      const t = b.time - a.time === 0 ? 0 : (currentTime - a.time) / (b.time - a.time)
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      }
    }
  }

  return defaultValue
}

export function computeAllPositions(
  players: { id: number; x: number; y: number; trajectory: TrajectoryPoint[] }[],
  ball: { x: number; y: number; trajectory: TrajectoryPoint[] },
  currentTime: number
): {
  playerPositions: Record<number, { x: number; y: number }>
  ballPosition: { x: number; y: number } | null
} {
  const playerPositions: Record<number, { x: number; y: number }> = {}

  for (const player of players) {
    if (player.trajectory.length > 0) {
      const pos = getInterpolatedPosition(player.trajectory, currentTime, { x: player.x, y: player.y })
      if (pos) playerPositions[player.id] = pos
    }
  }

  let ballPosition: { x: number; y: number } | null = null
  if (ball.trajectory.length > 0) {
    ballPosition = getInterpolatedPosition(ball.trajectory, currentTime, { x: ball.x, y: ball.y })
  }

  return { playerPositions, ballPosition }
}

export function getTrajectoryDuration(trajectory: TrajectoryPoint[]): number {
  if (trajectory.length === 0) return 0
  return trajectory[trajectory.length - 1].time
}

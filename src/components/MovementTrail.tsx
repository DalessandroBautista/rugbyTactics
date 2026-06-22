import React from 'react'
import { Group, Circle } from 'react-konva'
import { Player, Ball } from '../types'
import { computeAllPositions } from '../utils/interpolation'
import { PLAYER_RADIUS } from './PlayerToken'

// Estela de movimiento durante la reproducción (offsets en ms, opacidad por ghost)
const TRAIL_OFFSETS = [130, 270, 420, 580]
const TRAIL_OPACITY = [0.26, 0.18, 0.11, 0.06]

interface Props {
  players: Player[]
  ball: Ball
  currentTime: number
}

/**
 * Rastro que se desvanece detrás de cada jugador y la pelota mientras se
 * reproduce la jugada. Calcula posiciones interpoladas en instantes pasados.
 */
export const MovementTrail: React.FC<Props> = ({ players, ball, currentTime }) => {
  return (
    <>
      {TRAIL_OFFSETS.map((off, gi) => {
        const t = currentTime - off
        if (t <= 0) return null
        const { playerPositions, ballPosition } = computeAllPositions(players, ball, t)
        return (
          <Group key={`trail-${gi}`} listening={false}>
            {players.map(pl => {
              const pos = playerPositions[pl.id]
              if (!pos) return null
              return (
                <Circle key={pl.id} x={pos.x} y={pos.y}
                  radius={PLAYER_RADIUS * (1 - gi * 0.13)}
                  fill={pl.color} opacity={TRAIL_OPACITY[gi]} listening={false} />
              )
            })}
            {ballPosition && (
              <Circle x={ballPosition.x} y={ballPosition.y}
                radius={5 * (1 - gi * 0.13)} fill="#f1c40f"
                opacity={TRAIL_OPACITY[gi]} listening={false} />
            )}
          </Group>
        )
      })}
    </>
  )
}

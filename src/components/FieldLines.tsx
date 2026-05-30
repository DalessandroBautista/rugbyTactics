import React from 'react'
import { Line, Rect } from 'react-konva'
import { FIELD_PX, SCALE } from '../types'

const FIELD_COLOR = '#3a7d3a'
const LINE_COLOR = '#ffffff'
const LINE_WIDTH = 2

export const FieldLines: React.FC = () => {
  const W = FIELD_PX.width
  const H = FIELD_PX.totalLength
  const IGL = FIELD_PX.inGoalLength

  const lines: { points: number[]; dash?: number[] }[] = [
    // Perimeter
    { points: [0, 0, W, 0, W, H, 0, H, 0, 0] },
    // Halfway
    { points: [0, H / 2, W, H / 2], dash: [10, 10] },
    // 22m lines
    { points: [0, IGL, W, IGL] },
    { points: [0, H - IGL, W, H - IGL] },
    // 10m lines
    { points: [0, IGL + 10 * SCALE, W, IGL + 10 * SCALE], dash: [8, 8] },
    { points: [0, H - IGL - 10 * SCALE, W, H - IGL - 10 * SCALE], dash: [8, 8] },
    // 5m lines from try lines
    { points: [0, IGL + 5 * SCALE, W, IGL + 5 * SCALE], dash: [6, 6] },
    { points: [0, H - IGL - 5 * SCALE, W, H - IGL - 5 * SCALE], dash: [6, 6] },
    // Touch lines (sidelines) - already perimeter
    // Dead ball lines
    { points: [0, 0, W, 0] },
    { points: [0, H, W, H] },
    // 5m from touch lines (dashed)
    { points: [5 * SCALE, 0, 5 * SCALE, H], dash: [6, 6] },
    { points: [W - 5 * SCALE, 0, W - 5 * SCALE, H], dash: [6, 6] },
    // 15m from touch lines (dashed, only in playing area)
    { points: [15 * SCALE, IGL, 15 * SCALE, H - IGL], dash: [8, 8] },
    { points: [W - 15 * SCALE, IGL, W - 15 * SCALE, H - IGL], dash: [8, 8] },
  ]

  return (
    <>
      <Rect
        x={0}
        y={0}
        width={W}
        height={H}
        fill={FIELD_COLOR}
      />
      <Rect
        x={0}
        y={IGL}
        width={W}
        height={H - 2 * IGL}
        fill="#3f8a3f"
      />
      {lines.map((line, i) => (
        <Line
          key={i}
          points={line.points}
          stroke={LINE_COLOR}
          strokeWidth={LINE_WIDTH}
          dash={line.dash}
          lineCap="round"
          lineJoin="round"
        />
      ))}
    </>
  )
}

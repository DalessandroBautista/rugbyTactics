import React from 'react'
import { Line, Circle } from 'react-konva'
import { TrajectoryPoint } from '../types'

interface Props {
  points: TrajectoryPoint[]
  color: string
  isBall?: boolean
  onNodeDragEnd?: (index: number, x: number, y: number) => void
  onNodeClick?: (index: number) => void
  showNodes?: boolean
}

export const TrajectoryPath: React.FC<Props> = ({
  points,
  color,
  isBall,
  onNodeDragEnd,
  onNodeClick,
  showNodes,
}) => {
  if (points.length < 2) return null

  const flatPoints = points.flatMap(p => [p.x, p.y])
  const ballColor = '#f1c40f'

  return (
    <>
      <Line
        points={flatPoints}
        stroke={isBall ? ballColor : color}
        strokeWidth={isBall ? 2 : 2.5}
        lineCap="round"
        lineJoin="round"
        opacity={0.6}
        dash={isBall ? [6, 3] : undefined}
        tension={0.4}
      />
      {showNodes && points.map((pt, i) => (
        <Circle
          key={i}
          x={pt.x}
          y={pt.y}
          radius={i === 0 || i === points.length - 1 ? 5 : 4}
          fill={i === 0 ? '#2ecc71' : i === points.length - 1 ? '#e74c3c' : '#fff'}
          stroke={isBall ? ballColor : color}
          strokeWidth={2}
          draggable
          onDragEnd={(e) => {
            if (onNodeDragEnd) onNodeDragEnd(i, e.target.x(), e.target.y())
          }}
          onClick={() => {
            if (onNodeClick) onNodeClick(i)
          }}
          onTap={() => {
            if (onNodeClick) onNodeClick(i)
          }}
        />
      ))}
    </>
  )
}

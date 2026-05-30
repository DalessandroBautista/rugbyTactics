import React, { useRef } from 'react'
import { Group, Ellipse, Circle } from 'react-konva'
import { Ball } from '../types'
import { useStore } from '../store/useStore'

interface Props {
  ball: Ball
  isSelected: boolean
  onDragMove: (x: number, y: number) => void
  onDragEnd: (x: number, y: number) => void
}

export const BallEntity: React.FC<Props> = ({
  ball,
  isSelected,
  onDragMove,
  onDragEnd,
}) => {
  const editMode = useStore(s => s.editMode)
  const setSelectedBall = useStore(s => s.setSelectedBall)

  const handleClick = () => {
    setSelectedBall(true)
  }

  const handleDragEnd = (e: any) => {
    onDragEnd(e.target.x(), e.target.y())
  }

  const handleDragMove = (e: any) => {
    onDragMove(e.target.x(), e.target.y())
  }

  const isDraggable = editMode === 'move' || editMode === 'record'

  return (
    <Group
      x={ball.x}
      y={ball.y}
      draggable={isDraggable}
      onClick={handleClick}
      onTap={handleClick}
      onDragEnd={handleDragEnd}
      onDragMove={handleDragMove}
    >
      <Ellipse
        radiusX={8}
        radiusY={6}
        fill="#f1c40f"
        stroke={isSelected ? '#fff' : '#d4a017'}
        strokeWidth={isSelected ? 2 : 1}
        rotation={0}
        shadowColor="rgba(0,0,0,0.3)"
        shadowBlur={3}
        shadowOffsetY={1}
      />
      <Circle
        radius={2}
        fill="#d4a017"
        y={-1}
      />
    </Group>
  )
}

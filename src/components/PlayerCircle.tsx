import React, { useRef } from 'react'
import { Group, Circle, Text } from 'react-konva'
import { Player } from '../types'
import { useStore } from '../store/useStore'

interface Props {
  player: Player
  isSelected: boolean
  showTrajectory: boolean
  onDragMove: (x: number, y: number) => void
  onDragEnd: (x: number, y: number) => void
}

const RADIUS = 16

export const PlayerCircle: React.FC<Props> = ({
  player,
  isSelected,
  showTrajectory,
  onDragMove,
  onDragEnd,
}) => {
  const editMode = useStore(s => s.editMode)
  const setSelectedPlayer = useStore(s => s.setSelectedPlayer)

  const handleClick = () => {
    setSelectedPlayer(player.id)
  }

  const handleDragEnd = (e: any) => {
    const x = e.target.x()
    const y = e.target.y()
    onDragEnd(x, y)
  }

  const handleDragMove = (e: any) => {
    const x = e.target.x()
    const y = e.target.y()
    onDragMove(x, y)
  }

  const isDraggable = editMode === 'move' || editMode === 'record'

  return (
    <Group
      x={player.x}
      y={player.y}
      draggable={isDraggable}
      onClick={handleClick}
      onTap={handleClick}
      onDragEnd={handleDragEnd}
      onDragMove={handleDragMove}
    >
      <Circle
        radius={RADIUS}
        fill={player.color}
        stroke={isSelected ? '#fff' : 'transparent'}
        strokeWidth={isSelected ? 3 : 0}
        opacity={0.9}
        shadowColor="rgba(0,0,0,0.3)"
        shadowBlur={4}
        shadowOffsetY={2}
      />
      <Text
        text={player.number.toString()}
        fontSize={14}
        fontStyle="bold"
        fill="#fff"
        width={RADIUS * 2}
        height={RADIUS * 2}
        offsetX={RADIUS}
        offsetY={RADIUS}
        align="center"
        verticalAlign="middle"
      />
    </Group>
  )
}

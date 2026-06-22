import React from 'react'
import Konva from 'konva'
import { Group, Circle, Ellipse, Text } from 'react-konva'
import { Player } from '../types'

export const PLAYER_RADIUS = 9.5
export const SELECTION_RING_RADIUS = 14

interface Props {
  player: Player
  x: number
  y: number
  isSelected: boolean
  isAway: boolean
  isCarrier: boolean
  draggable: boolean
  onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => void
  onClick: (e: Konva.KonvaEventObject<MouseEvent>) => void
  onTap: (e: Konva.KonvaEventObject<Event>) => void
  onDragStart: (x: number, y: number) => void
  onDragMove: (x: number, y: number) => void
  onDragEnd: (x: number, y: number) => void
}

/** Ficha de un jugador sobre el campo: sombra de contacto, volumen, halo del
 *  portador, anillo de selección, número y nombre. */
export const PlayerToken: React.FC<Props> = ({
  player, x, y, isSelected, isAway, isCarrier, draggable,
  onMouseDown, onClick, onTap, onDragStart, onDragMove, onDragEnd,
}) => {
  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onMouseDown={onMouseDown}
      onClick={onClick}
      onTap={onTap}
      onDragStart={(e) => onDragStart(e.target.x(), e.target.y())}
      onDragMove={(e) => onDragMove(e.target.x(), e.target.y())}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      {/* Área de click ampliada (invisible) para acertar a bajo zoom */}
      <Circle radius={PLAYER_RADIUS + 8} fill="transparent" />
      {/* Sombra de contacto: la ficha "apoya" sobre el campo */}
      <Ellipse
        x={0} y={PLAYER_RADIUS * 0.7}
        radiusX={PLAYER_RADIUS * 0.92}
        radiusY={PLAYER_RADIUS * 0.4}
        fill="rgba(0,0,0,0.32)"
        listening={false}
      />
      {/* Halo del portador de pelota */}
      {isCarrier && !isSelected && (
        <Circle radius={PLAYER_RADIUS + 4} fill="transparent" stroke="#f1c40f" strokeWidth={2} listening={false} />
      )}
      {/* Anillo de selección */}
      {isSelected && (
        <Circle
          radius={SELECTION_RING_RADIUS}
          fill="transparent" stroke="#facc15" strokeWidth={3}
          shadowColor="#facc15" shadowBlur={8} listening={false}
        />
      )}
      {/* Anillo indicador de equipo visitante */}
      {isAway && !isSelected && (
        <Circle radius={PLAYER_RADIUS + 2} fill="transparent" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} listening={false} />
      )}
      {/* Cuerpo */}
      <Circle
        radius={PLAYER_RADIUS}
        fill={player.color}
        stroke={isSelected ? '#facc15' : isAway ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)'}
        strokeWidth={isSelected ? 2 : 1.5}
        listening={false}
      />
      {/* Brillo superior sutil para volumen */}
      <Circle
        radius={PLAYER_RADIUS}
        fillRadialGradientStartPoint={{ x: -PLAYER_RADIUS * 0.3, y: -PLAYER_RADIUS * 0.35 }}
        fillRadialGradientEndPoint={{ x: 0, y: 0 }}
        fillRadialGradientStartRadius={0}
        fillRadialGradientEndRadius={PLAYER_RADIUS * 1.2}
        fillRadialGradientColorStops={[0, 'rgba(255,255,255,0.28)', 1, 'rgba(255,255,255,0)']}
        listening={false}
      />
      {/* Número */}
      <Text
        text={String(player.number)}
        fontSize={8} fontStyle="bold" fill="#fff"
        width={PLAYER_RADIUS * 2} height={PLAYER_RADIUS * 2}
        offsetX={PLAYER_RADIUS} offsetY={PLAYER_RADIUS}
        align="center" verticalAlign="middle" listening={false}
      />
      {/* Nombre */}
      {player.name && (
        <Text
          text={player.name}
          fontSize={6} fontStyle="bold" fill="#fff"
          y={-PLAYER_RADIUS - 8} offsetX={PLAYER_RADIUS}
          width={PLAYER_RADIUS * 2} align="center" listening={false}
        />
      )}
    </Group>
  )
}

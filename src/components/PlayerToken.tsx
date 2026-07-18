import React from 'react'
import Konva from 'konva'
import { Group, Circle, Ellipse, Text, Wedge } from 'react-konva'
import { Player } from '../types'

export const PLAYER_RADIUS = 9.5
export const SELECTION_RING_RADIUS = 14

// Cono de visión: alcance y apertura, y radio de la manija de rotación
const VISION_RANGE = 58
const VISION_ANGLE = 60
const HANDLE_DIST = SELECTION_RING_RADIUS + 9

interface Props {
  player: Player
  x: number
  y: number
  isSelected: boolean
  isAway: boolean
  isCarrier: boolean
  draggable: boolean
  /** Orientación efectiva de la mirada en grados (coords de campo) */
  orientation: number
  showVision: boolean
  /** Muestra la manija para rotar la mirada (jugador seleccionado, no grabando) */
  showRotateHandle: boolean
  onRotate: (deg: number) => void
  onRotateEnd: (deg: number) => void
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
  orientation, showVision, showRotateHandle, onRotate, onRotateEnd,
  onMouseDown, onClick, onTap, onDragStart, onDragMove, onDragEnd,
}) => {
  const rad = (orientation * Math.PI) / 180
  const handleX = Math.cos(rad) * HANDLE_DIST
  const handleY = Math.sin(rad) * HANDLE_DIST

  // Rotación de la mirada: la manija orbita el centro del jugador; el ángulo
  // se calcula desde su posición relativa y el nodo se re-ancla a la órbita.
  const handleRotateDrag = (e: Konva.KonvaEventObject<DragEvent>, end: boolean) => {
    const node = e.target
    const deg = (Math.atan2(node.y(), node.x()) * 180) / Math.PI
    const r = (deg * Math.PI) / 180
    node.position({ x: Math.cos(r) * HANDLE_DIST, y: Math.sin(r) * HANDLE_DIST })
    if (end) onRotateEnd(deg)
    else onRotate(deg)
  }

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
      {/* Cono de visión: abanico degradado en el color del jugador */}
      {showVision && (
        <Wedge
          radius={VISION_RANGE}
          angle={VISION_ANGLE}
          rotation={orientation - VISION_ANGLE / 2}
          fillRadialGradientStartPoint={{ x: 0, y: 0 }}
          fillRadialGradientEndPoint={{ x: 0, y: 0 }}
          fillRadialGradientStartRadius={PLAYER_RADIUS * 0.6}
          fillRadialGradientEndRadius={VISION_RANGE}
          fillRadialGradientColorStops={[0, player.color, 1, 'rgba(0,0,0,0)']}
          opacity={isSelected ? 0.6 : 0.42}
          listening={false}
        />
      )}
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
      {/* Manija de rotación de la mirada */}
      {showVision && showRotateHandle && (
        <>
          <Circle
            radius={HANDLE_DIST}
            stroke="rgba(255,255,255,0.18)" strokeWidth={1} dash={[2, 4]}
            listening={false}
          />
          <Circle
            x={handleX} y={handleY}
            radius={5}
            fill={player.color}
            stroke="#fff" strokeWidth={1.5}
            draggable
            onMouseDown={(e) => { e.cancelBubble = true }}
            onDragStart={(e) => { e.cancelBubble = true }}
            onDragMove={(e) => { e.cancelBubble = true; handleRotateDrag(e, false) }}
            onDragEnd={(e) => { e.cancelBubble = true; handleRotateDrag(e, true) }}
          />
        </>
      )}
    </Group>
  )
}

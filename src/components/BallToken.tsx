import React from 'react'
import Konva from 'konva'
import { Group, Ellipse, Line } from 'react-konva'

interface Props {
  x: number
  y: number
  selected: boolean
  draggable: boolean
  onClick: (e: Konva.KonvaEventObject<MouseEvent>) => void
  onTap: (e: Konva.KonvaEventObject<Event>) => void
  onDragMove: (x: number, y: number) => void
  onDragEnd: (x: number, y: number) => void
}

/** Pelota de rugby: óvalo con costuras y sombra de contacto. El eje largo
 *  apunta a lo largo del campo por la rotación del grupo contenedor. */
export const BallToken: React.FC<Props> = ({ x, y, selected, draggable, onClick, onTap, onDragMove, onDragEnd }) => {
  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onClick={onClick}
      onTap={onTap}
      onDragMove={(e) => onDragMove(e.target.x(), e.target.y())}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      {/* Sombra de contacto */}
      <Ellipse x={0} y={3.5} radiusX={5} radiusY={2.4} fill="rgba(0,0,0,0.3)" listening={false} />
      {selected && (
        <Ellipse radiusX={7.5} radiusY={9.5} fill="transparent" stroke="#facc15" strokeWidth={2} listening={false} />
      )}
      {/* Cuerpo ovalado */}
      <Ellipse
        radiusX={4} radiusY={6}
        fill="#e8a317"
        stroke={selected ? '#fff' : '#9a6c0d'}
        strokeWidth={selected ? 1.5 : 1}
      />
      {/* Costuras */}
      <Line points={[0, -4.2, 0, 4.2]} stroke="rgba(255,255,255,0.85)" strokeWidth={0.8} listening={false} />
      {[-2.2, 0, 2.2].map((cy, i) => (
        <Line key={i} points={[-1.4, cy, 1.4, cy]} stroke="rgba(255,255,255,0.7)" strokeWidth={0.7} listening={false} />
      ))}
    </Group>
  )
}

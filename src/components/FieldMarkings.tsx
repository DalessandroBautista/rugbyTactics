import React from 'react'
import { Rect, Line, Group, Text } from 'react-konva'
import { FIELD_PX, SCALE } from '../types'

// Césped: gradiente longitudinal sutil + franjas de corte para dar profundidad
const GRASS_TOP = '#163019'
const GRASS_MID = '#1d4124'
const GRASS_BOT = '#142b18'
const INGOAL_FILL = '#13281a'
const STRIPE_FILL = 'rgba(255,255,255,0.022)'
// Líneas reglamentarias
const LINE_SOLID = 'rgba(238,246,240,0.82)'
const LINE_FAINT = 'rgba(238,246,240,0.40)'
const LINE_W = 1.4
const LINE_W_TRY = 2.4
const POST_COLOR = 'rgba(248,250,245,0.7)'

/**
 * Marcas del campo de rugby: césped, líneas reglamentarias, postes y etiquetas.
 * Componente presentacional puro (sin estado ni interacción) — se dibuja una
 * sola vez por debajo de jugadores, trayectorias y pelota.
 */
export const FieldMarkings: React.FC = React.memo(() => {
  const W = FIELD_PX.width
  const H = FIELD_PX.totalLength
  const IGL = FIELD_PX.inGoalLength

  return (
    <>
      {/* Césped: gradiente longitudinal para dar profundidad */}
      <Rect
        x={0} y={0} width={W} height={H}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: H }}
        fillLinearGradientColorStops={[0, GRASS_TOP, 0.5, GRASS_MID, 1, GRASS_BOT]}
        listening={false}
      />
      {/* In-goal areas, teñidas un poco distinto */}
      <Rect x={0} y={0} width={W} height={IGL} fill={INGOAL_FILL} listening={false} />
      <Rect x={0} y={H - IGL} width={W} height={IGL} fill={INGOAL_FILL} listening={false} />

      {/* Franjas de corte cada 5m en el campo de juego */}
      {Array.from({ length: 20 }, (_, i) => i).filter(i => i % 2 === 0).map(i => (
        <Rect
          key={`stripe-${i}`}
          x={0} y={IGL + i * 5 * SCALE} width={W} height={5 * SCALE}
          fill={STRIPE_FILL} listening={false}
        />
      ))}

      {/* Líneas punteadas: 5m de cada try y 10m del medio */}
      {[
        IGL + 5 * SCALE, H - IGL - 5 * SCALE,
        H / 2 - 10 * SCALE, H / 2 + 10 * SCALE,
      ].map((y, i) => (
        <Line key={`dash-h-${i}`} points={[3, y, W - 3, y]} stroke={LINE_FAINT}
          strokeWidth={LINE_W} dash={[7, 9]} listening={false} />
      ))}

      {/* Líneas longitudinales punteadas a 5m y 15m de cada touch */}
      {[5 * SCALE, 15 * SCALE, W - 15 * SCALE, W - 5 * SCALE].map((x, i) => (
        <Line key={`dash-v-${i}`} points={[x, IGL, x, H - IGL]} stroke={LINE_FAINT}
          strokeWidth={LINE_W} dash={[6, 10]} listening={false} />
      ))}

      {/* Líneas sólidas: bordes, 22m y mediocampo */}
      {[
        { pts: [0, 0, W, 0], faint: true }, { pts: [0, H, W, H], faint: true },
        { pts: [0, 0, 0, H], faint: true }, { pts: [W, 0, W, H], faint: true },
        { pts: [0, IGL + 22 * SCALE, W, IGL + 22 * SCALE] },
        { pts: [0, H - IGL - 22 * SCALE, W, H - IGL - 22 * SCALE] },
        { pts: [0, H / 2, W, H / 2] },
      ].map((l, i) => (
        <Line key={`line-${i}`} points={l.pts} stroke={l.faint ? LINE_FAINT : LINE_SOLID}
          strokeWidth={LINE_W} listening={false} />
      ))}
      {/* Try lines, más marcadas */}
      <Line points={[0, IGL, W, IGL]} stroke={LINE_SOLID} strokeWidth={LINE_W_TRY} listening={false} />
      <Line points={[0, H - IGL, W, H - IGL]} stroke={LINE_SOLID} strokeWidth={LINE_W_TRY} listening={false} />

      {/* Postes en H sobre cada try line */}
      {[
        { y: IGL, dir: -1 }, { y: H - IGL, dir: 1 },
      ].map((g, i) => {
        const px = W / 2, gap = 2.8 * SCALE, depth = 3 * SCALE
        return (
          <Group key={`post-${i}`} listening={false}>
            <Line points={[px - gap, g.y, px + gap, g.y]} stroke={POST_COLOR} strokeWidth={2} />
            <Line points={[px - gap, g.y, px - gap, g.y + g.dir * depth]} stroke={POST_COLOR} strokeWidth={2} />
            <Line points={[px + gap, g.y, px + gap, g.y + g.dir * depth]} stroke={POST_COLOR} strokeWidth={2} />
          </Group>
        )
      })}

      {/* Etiquetas de metros, sutiles */}
      {[
        { text: '22', y: IGL + 22 * SCALE },
        { text: '50', y: H / 2 },
        { text: '22', y: H - IGL - 22 * SCALE },
      ].map((label, i) => (
        <Text
          key={`label-${i}`}
          x={6} y={label.y - 5}
          text={label.text}
          fontSize={9} fill="rgba(238,246,240,0.30)"
          fontStyle="bold"
          listening={false}
        />
      ))}
    </>
  )
})

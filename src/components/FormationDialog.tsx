import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { FIELD_PX, SCALE, Player, Ball } from '../types'
import { savePlays } from '../utils/persistence'

type FormationType = 'lineout' | 'scrum' | null

interface Props {
  type: FormationType
  onClose: () => void
}

const LINE_POSITIONS = [
  { label: '5m izq', y: FIELD_PX.inGoalLength + 5 * SCALE },
  { label: '22 izq', y: FIELD_PX.inGoalLength + 22 * SCALE },
  { label: 'Mediocampo', y: FIELD_PX.totalLength / 2 },
  { label: '22 der', y: FIELD_PX.totalLength - FIELD_PX.inGoalLength - 22 * SCALE },
  { label: '5m der', y: FIELD_PX.totalLength - FIELD_PX.inGoalLength - 5 * SCALE },
]

const SCRUM_POSITIONS = [
  { label: '5m propio', y: FIELD_PX.inGoalLength + 5 * SCALE },
  { label: '22 propio', y: FIELD_PX.inGoalLength + 22 * SCALE },
  { label: 'Mediocampo', y: FIELD_PX.totalLength / 2 },
  { label: '22 rival', y: FIELD_PX.totalLength - FIELD_PX.inGoalLength - 22 * SCALE },
  { label: '5m rival', y: FIELD_PX.totalLength - FIELD_PX.inGoalLength - 5 * SCALE },
]

const SCRUM_SIDES = [
  { label: 'Izquierda', x: 15 * SCALE },
  { label: 'Centro', x: FIELD_PX.width / 2 },
  { label: 'Derecha', x: FIELD_PX.width - 15 * SCALE },
]

function setLineoutPositions(
  players: Player[],
  ball: Ball,
  fieldLengthY: number,
  touchTop: boolean,
): { players: Player[]; ball: Ball } {
  const W = FIELD_PX.width

  const throwerOffset = 0.5 * SCALE
  const fiveMeterOffset = 5 * SCALE
  const fifteenMeterOffset = 15 * SCALE

  const throwerX = touchTop ? W - throwerOffset : throwerOffset
  const fiveMeterX = touchTop ? W - fiveMeterOffset : fiveMeterOffset
  const fifteenMeterX = touchTop ? W - fifteenMeterOffset : fifteenMeterOffset

  const jumpers = [1, 4, 6, 7, 8, 5, 3]
  const step = touchTop
    ? (fiveMeterX - fifteenMeterX) / (jumpers.length - 1)
    : (fifteenMeterX - fiveMeterX) / (jumpers.length - 1)

  const ballX = touchTop ? throwerX - SCALE : throwerX + SCALE

  // Orientaciones del lineout: el lanzador mira hacia la línea (adentro del
  // campo) y los saltadores hacia la pelota, como en el juego real.
  const throwerOrientation = touchTop ? 180 : 0
  const newPlayers = players.map(p => {
    if (p.id === 2) {
      return { ...p, x: throwerX, y: fieldLengthY, trajectory: [], orientation: throwerOrientation }
    }
    const idx = jumpers.indexOf(p.id)
    if (idx === -1) return p
    const x = touchTop
      ? fiveMeterX - idx * step
      : fiveMeterX + idx * step
    return { ...p, x, y: fieldLengthY, trajectory: [], orientation: ballX > x ? 0 : 180 }
  })

  const newBall: Ball = {
    ...ball,
    x: ballX,
    y: fieldLengthY,
    carriedBy: 2,
    trajectory: [],
  }

  return { players: newPlayers, ball: newBall }
}

function setScrumPositions(
  players: Player[],
  ball: Ball,
  fieldLengthY: number,
  centerX: number,
): { players: Player[]; ball: Ball } {
  const rowGap = 1.5 * SCALE
  const sideGap = 2 * SCALE

  const frontY = fieldLengthY + rowGap
  const midY = fieldLengthY
  const backY = fieldLengthY - rowGap

  const scrumPos: Record<number, { x: number; y: number }> = {
    1: { x: centerX - sideGap, y: frontY },
    2: { x: centerX, y: frontY },
    3: { x: centerX + sideGap, y: frontY },
    4: { x: centerX - sideGap / 2, y: midY },
    5: { x: centerX + sideGap / 2, y: midY },
    6: { x: centerX - sideGap, y: backY },
    8: { x: centerX, y: backY },
    7: { x: centerX + sideGap, y: backY },
  }

  const newPlayers = players.map(p => {
    const pos = scrumPos[p.id]
    if (!pos) return p
    return { ...p, x: pos.x, y: pos.y, trajectory: [] }
  })

  const newBall: Ball = {
    ...ball,
    x: centerX,
    y: frontY,
    carriedBy: 9,
    trajectory: [],
  }

  return { players: newPlayers, ball: newBall }
}

export const FormationDialog: React.FC<Props> = ({ type, onClose }) => {
  const currentPlayId = useStore(s => s.currentPlayId)

  const isLineout = type === 'lineout'
  const positions = isLineout ? LINE_POSITIONS : SCRUM_POSITIONS
  const defaultPosIdx = isLineout ? 2 : 2
  const [touchTop, setTouchTop] = useState(true)
  const [posIdx, setPosIdx] = useState(defaultPosIdx)
  const [sideIdx, setSideIdx] = useState(1) // default: center

  if (!type || !currentPlayId) return null

  const title = isLineout ? 'Armar Lineout' : 'Armar Scrum'

  const handleApply = () => {
    const state = useStore.getState()
    const play = state.plays.find(p => p.id === currentPlayId)
    if (!play) return

    const pos = positions[posIdx]

    if (isLineout) {
      const result = setLineoutPositions(play.players, play.ball, pos.y, touchTop)
      const newPlays = state.plays.map(p =>
        p.id === currentPlayId ? { ...p, ...result } : p
      )
      useStore.setState({ plays: newPlays, isDirty: true })
      savePlays(newPlays)
    } else {
      const side = SCRUM_SIDES[sideIdx]
      const result = setScrumPositions(play.players, play.ball, pos.y, side.x)
      const newPlays = state.plays.map(p =>
        p.id === currentPlayId ? { ...p, ...result } : p
      )
      useStore.setState({ plays: newPlays, isDirty: true })
      savePlays(newPlays)
    }

    onClose()
  }

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={dialog}>
        <h3 style={titleStyle}>{title}</h3>

        {/* Y position (field length direction) */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Zona del campo</label>
          <div style={pillRow}>
            {positions.map((p, i) => (
              <button
                key={i}
                onClick={() => setPosIdx(i)}
                style={{ ...pill, ...(posIdx === i ? pillActive : {}) }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lineout: touchline selector */}
        {isLineout && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Banda</label>
            <div style={pillRow}>
              {[
                { label: 'Banda superior', top: true },
                { label: 'Banda inferior', top: false },
              ].map((t, i) => (
                <button
                  key={i}
                  onClick={() => setTouchTop(t.top)}
                  style={{ ...pill, ...(touchTop === t.top ? pillActive : {}) }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scrum: side selector (X direction = width of field) */}
        {!isLineout && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Lado del campo</label>
            <div style={pillRow}>
              {SCRUM_SIDES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSideIdx(i)}
                  style={{ ...pill, ...(sideIdx === i ? pillActive : {}) }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={cancelBtn}>Cancelar</button>
          <button onClick={handleApply} style={applyBtn}>Aplicar</button>
        </div>
      </div>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.6)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const dialog: React.CSSProperties = {
  width: 400,
  background: 'var(--panel)',
  borderRadius: 10,
  border: '1px solid var(--border)',
  padding: 20,
}

const titleStyle: React.CSSProperties = {
  margin: '0 0 16px',
  color: 'var(--text)',
  fontSize: 15,
  fontWeight: 700,
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-dim)',
  display: 'block',
  marginBottom: 6,
  fontWeight: 600,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
}

const pillRow: React.CSSProperties = {
  display: 'flex',
  gap: 5,
  flexWrap: 'wrap',
}

const pill: React.CSSProperties = {
  flex: 1,
  minWidth: 60,
  padding: '7px 6px',
  border: '1px solid var(--border)',
  borderRadius: 6,
  background: 'var(--panel-alt)',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 600,
  textAlign: 'center',
}

const pillActive: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#fff',
  borderColor: 'var(--accent)',
}

const cancelBtn: React.CSSProperties = {
  flex: 1,
  padding: '9px',
  border: '1px solid var(--border)',
  borderRadius: 7,
  background: 'var(--panel-alt)',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
}

const applyBtn: React.CSSProperties = {
  flex: 1,
  padding: '9px',
  border: 'none',
  borderRadius: 7,
  background: 'var(--green)',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
}

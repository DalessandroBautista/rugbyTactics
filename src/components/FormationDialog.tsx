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
  { label: '5m', y: FIELD_PX.inGoalLength + 5 * SCALE },
  { label: '22', y: FIELD_PX.inGoalLength + 22 * SCALE },
  { label: 'Mediocampo', y: FIELD_PX.totalLength / 2 },
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

  const newPlayers = players.map(p => {
    if (p.id === 2) {
      return { ...p, x: throwerX, y: fieldLengthY, trajectory: [] }
    }
    const idx = jumpers.indexOf(p.id)
    if (idx === -1) return p
    const x = touchTop
      ? fiveMeterX - idx * step
      : fiveMeterX + idx * step
    return { ...p, x, y: fieldLengthY, trajectory: [] }
  })

  const ballX = touchTop ? throwerX - SCALE : throwerX + SCALE

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
): { players: Player[]; ball: Ball } {
  const W = FIELD_PX.width
  const centerX = W / 2

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

  const positions = type === 'lineout' ? LINE_POSITIONS : SCRUM_POSITIONS
  const defaultIdx = type === 'lineout' ? 2 : 1
  const [touchTop, setTouchTop] = useState(true)
  const [posIdx, setPosIdx] = useState(defaultIdx)

  if (!type || !currentPlayId) return null

  const title = type === 'lineout' ? 'Formar Lineout' : 'Formar Scrum'

  const handleApply = () => {
    const state = useStore.getState()
    const play = state.plays.find(p => p.id === currentPlayId)
    if (!play) return

    const pos = positions[posIdx]

    if (type === 'lineout') {
      const result = setLineoutPositions(play.players, play.ball, pos.y, touchTop)
      const newPlays = state.plays.map(p =>
        p.id === currentPlayId ? { ...p, ...result } : p
      )
      useStore.setState({ plays: newPlays, isDirty: true })
      savePlays(newPlays)
    } else {
      const result = setScrumPositions(play.players, play.ball, pos.y)
      const newPlays = state.plays.map(p =>
        p.id === currentPlayId ? { ...p, ...result } : p
      )
      useStore.setState({ plays: newPlays, isDirty: true })
      savePlays(newPlays)
    }

    onClose()
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '380px',
        background: '#1e1e32',
        borderRadius: '12px',
        border: '1px solid #3a3a4e',
        padding: '20px',
        fontFamily: 'sans-serif',
      }}>
        <h3 style={{ margin: '0 0 16px', color: '#fff', fontSize: '16px' }}>{title}</h3>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '6px' }}>
            Posición en el campo
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {positions.map((p, i) => (
              <button
                key={i}
                onClick={() => setPosIdx(i)}
                style={{
                  flex: 1, padding: '8px', border: 'none', borderRadius: '6px',
                  background: posIdx === i ? '#3498db' : '#2a2a3e',
                  color: posIdx === i ? '#fff' : '#888',
                  cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {type === 'lineout' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '6px' }}>
              Touchline
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { label: 'Banda superior', top: true },
                { label: 'Banda inferior', top: false },
              ].map((t, i) => (
                <button
                  key={i}
                  onClick={() => setTouchTop(t.top)}
                  style={{
                    flex: 1, padding: '8px', border: 'none', borderRadius: '6px',
                    background: touchTop === t.top ? '#3498db' : '#2a2a3e',
                    color: touchTop === t.top ? '#fff' : '#888',
                    cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: '#2a2a3e', color: '#888', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
            Cancelar
          </button>
          <button onClick={handleApply} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: '#2ecc71', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}

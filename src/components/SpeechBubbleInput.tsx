import React, { useState, useCallback } from 'react'
import { useStore } from '../store/useStore'
import { FIELD_PX } from '../types'

/** screen → field coordinates (invierte la transform del canvas) */
function screenToField(sx: number, sy: number, panX: number, panY: number, zoom: number) {
  const layerX = (sx - panX) / zoom
  const layerY = (sy - panY) / zoom
  const py = layerX - FIELD_PX.width / 2
  const px = FIELD_PX.totalLength / 2 - layerY
  return { x: px, y: py }
}

export const SpeechBubbleInput: React.FC = () => {
  const [text, setText] = useState('')
  const [duration, setDuration] = useState(3000)
  const [startTime, setStartTime] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [placing, setPlacing] = useState(false)
  const addSpeechBubble = useStore(s => s.addSpeechBubble)
  const clearSpeechBubbles = useStore(s => s.clearSpeechBubbles)
  const play = useStore(s => s.plays.find(p => p.id === s.currentPlayId))

  const bubbles = play?.speechBubbles ?? []
  const playDuration = play?.duration ?? 40000

  const handleAdd = useCallback((x: number, y: number) => {
    if (!text.trim()) return
    addSpeechBubble({
      text: text.trim(),
      x: Math.round(x),
      y: Math.round(y),
      startTime,
      duration,
    })
    setText('')
    setPlacing(false)
  }, [text, startTime, duration, addSpeechBubble])

  // Colocar en el centro del viewport
  const placeAtCenter = useCallback(() => {
    if (!text.trim()) return
    const { view } = useStore.getState()
    const containerEl = document.querySelector('[style*="overflow: hidden"]')
    const rect = containerEl?.getBoundingClientRect()
    const cx = rect ? rect.width / 2 : 300
    const cy = rect ? rect.height / 2 : 300
    const fieldPos = screenToField(cx, cy, view.panX, view.panY, view.zoom)
    handleAdd(fieldPos.x, fieldPos.y)
  }, [text, handleAdd])

  // Modo colocación: clic en el campo
  const startPlacing = useCallback(() => {
    if (!text.trim()) return
    setPlacing(true)
    setIsOpen(false)

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('canvas')) return
      const { view } = useStore.getState()
      const containerEl = target.closest('[style*="overflow"]')?.getBoundingClientRect()
      if (!containerEl) return
      const sx = e.clientX - containerEl.left
      const sy = e.clientY - containerEl.top
      const fieldPos = screenToField(sx, sy, view.panX, view.panY, view.zoom)
      handleAdd(fieldPos.x, fieldPos.y)
      window.removeEventListener('click', handler, true)
    }

    setTimeout(() => window.addEventListener('click', handler, true), 50)

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPlacing(false)
        window.removeEventListener('click', handler, true)
        window.removeEventListener('keydown', keyHandler, true)
      }
    }
    window.addEventListener('keydown', keyHandler, true)
  }, [text, handleAdd])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); placeAtCenter() }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => !placing && setIsOpen(!isOpen)}
        style={{
          background: placing ? 'rgba(227,179,65,0.2)' : isOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
          border: `1px solid ${placing ? 'rgba(227,179,65,0.5)' : 'var(--border)'}`,
          color: placing ? 'var(--yellow)' : 'var(--text-muted)',
          padding: '4px 9px',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
          fontFamily: 'inherit',
        }}
        title={placing ? 'Clic en el campo para colocar (Esc cancela)' : 'Agregar canto de jugada'}
      >
        <span style={{ fontSize: 11 }}>{placing ? '📍' : '💬'}</span>
        {placing ? 'Clic en campo…' : 'Canto'}
        {!placing && bubbles.length > 0 && (
          <span style={{
            background: 'var(--accent)', color: '#fff', borderRadius: 10,
            padding: '0 5px', fontSize: 9, lineHeight: '14px', fontWeight: 700,
          }}>{bubbles.length}</span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4,
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: 12, zIndex: 1000,
            width: 240, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            Canto de jugada
          </div>

          {/* Texto */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="¡Vamos equipo! ¡Presión!"
            autoFocus
            style={{
              width: '100%', minHeight: 48,
              background: 'var(--panel-alt)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text)',
              padding: '6px 8px', fontSize: 12, resize: 'vertical',
              fontFamily: 'inherit', lineHeight: 1.4, outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {/* Segundo de inicio */}
          <div style={{ marginTop: 8, marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <label style={{ fontSize: 10, color: 'var(--text-dim)' }}>Aparece en</label>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                {(startTime / 1000).toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={playDuration}
              step={500}
              value={startTime}
              onChange={e => setStartTime(Number(e.target.value))}
              style={{ width: '100%', height: 4, accentColor: 'var(--accent)' }}
            />
          </div>

          {/* Duración */}
          <div style={{ marginTop: 4, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <label style={{ fontSize: 10, color: 'var(--text-dim)' }}>Duración</label>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                {(duration / 1000).toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min={1000}
              max={10000}
              step={500}
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              style={{ width: '100%', height: 4, accentColor: 'var(--yellow)' }}
            />
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={placeAtCenter}
              disabled={!text.trim()}
              style={{
                flex: 1,
                background: text.trim() ? 'var(--accent)' : 'var(--panel-alt)',
                border: 'none', color: text.trim() ? '#fff' : 'var(--text-dim)',
                padding: '5px 0', borderRadius: 'var(--radius-sm)',
                cursor: text.trim() ? 'pointer' : 'not-allowed',
                fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
              }}
            >Centro</button>
            <button
              onClick={startPlacing}
              disabled={!text.trim()}
              style={{
                flex: 1,
                background: text.trim() ? 'rgba(227,179,65,0.15)' : 'var(--panel-alt)',
                border: `1px solid ${text.trim() ? 'rgba(227,179,65,0.3)' : 'var(--border)'}`,
                color: text.trim() ? 'var(--yellow)' : 'var(--text-dim)',
                padding: '5px 0', borderRadius: 'var(--radius-sm)',
                cursor: text.trim() ? 'pointer' : 'not-allowed',
                fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
              }}
            >Clic 📍</button>
            {bubbles.length > 0 && (
              <button
                onClick={() => { clearSpeechBubbles(); setIsOpen(false) }}
                style={{
                  background: 'rgba(248,81,73,0.1)',
                  border: '1px solid rgba(248,81,73,0.2)',
                  color: 'var(--red)', padding: '5px 8px',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  fontSize: 11, fontFamily: 'inherit',
                }}
              >✕</button>
            )}
          </div>

          <div style={{ marginTop: 6, fontSize: 9, color: 'var(--text-dim)' }}>
            Enter = centro · Escape = cancelar
          </div>
        </div>
      )}
    </div>
  )
}

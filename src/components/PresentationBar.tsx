import React, { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { PlaybackSpeed } from '../types'

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 2, 4]

export const PresentationBar: React.FC = () => {
  const isPlaying = useStore(s => s.isPlaying)
  const currentTime = useStore(s => s.currentTime)
  const playbackSpeed = useStore(s => s.playbackSpeed)
  const currentPlayId = useStore(s => s.currentPlayId)
  const plays = useStore(s => s.plays)
  const setIsPlaying = useStore(s => s.setIsPlaying)
  const setCurrentTime = useStore(s => s.setCurrentTime)
  const setPlaybackSpeed = useStore(s => s.setPlaybackSpeed)
  const setAnimatingPositions = useStore(s => s.setAnimatingPositions)
  const loopPlayback = useStore(s => s.loopPlayback)
  const toggleLoopPlayback = useStore(s => s.toggleLoopPlayback)
  const setCurrentPlay = useStore(s => s.setCurrentPlay)
  const togglePresentationMode = useStore(s => s.togglePresentationMode)

  const play = plays.find(p => p.id === currentPlayId)
  const duration = play?.duration || 5000
  const progress = Math.min(currentTime / duration, 1)
  const idx = plays.findIndex(p => p.id === currentPlayId)

  const resetToStart = () => {
    setCurrentTime(0)
    setIsPlaying(false)
    if (play) {
      const positions: Record<number, { x: number; y: number }> = {}
      for (const player of play.players) {
        positions[player.id] = player.trajectory.length > 0
          ? { x: player.trajectory[0].x, y: player.trajectory[0].y }
          : { x: player.x, y: player.y }
      }
      const ballPos = play.ball.trajectory.length > 0
        ? { x: play.ball.trajectory[0].x, y: play.ball.trajectory[0].y }
        : { x: play.ball.x, y: play.ball.y }
      setAnimatingPositions(positions, ballPos)
    }
  }

  // Al entrar a presentación o cambiar de jugada, reposicionar al inicio
  useEffect(() => {
    resetToStart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayId])

  const handlePlay = () => {
    if (currentTime >= duration) setCurrentTime(0)
    setIsPlaying(true)
  }

  const goTo = (newIdx: number) => {
    if (newIdx < 0 || newIdx >= plays.length) return
    setCurrentPlay(plays[newIdx].id)
  }

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000)
    const dec = Math.floor((ms % 1000) / 100)
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}.${dec}`
  }

  return (
    <>
      {/* Título de la jugada, arriba */}
      <div style={styles.titleWrap}>
        <div style={styles.title}>{play?.name}</div>
        <div style={styles.subtitle}>{play?.category} · {idx + 1} / {plays.length}</div>
      </div>

      {/* Salir, arriba a la derecha */}
      <button onClick={togglePresentationMode} style={styles.exit} title="Salir de presentación (Esc)">
        ✕ Salir
      </button>

      {/* Barra de controles, abajo */}
      <div style={styles.bar}>
        <RoundBtn onClick={() => goTo(idx - 1)} disabled={idx <= 0} title="Jugada anterior" size={40}>‹</RoundBtn>
        <RoundBtn onClick={resetToStart} title="Volver al inicio" size={40}>⏮</RoundBtn>
        <RoundBtn
          onClick={isPlaying ? () => setIsPlaying(false) : handlePlay}
          title={isPlaying ? 'Pausar' : 'Reproducir'}
          size={56}
          primary
        >
          {isPlaying ? '⏸' : '▶'}
        </RoundBtn>
        <RoundBtn onClick={() => goTo(idx + 1)} disabled={idx >= plays.length - 1} title="Jugada siguiente" size={40}>›</RoundBtn>

        <div style={styles.seekArea}>
          <span style={styles.time}>{fmt(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration}
            value={currentTime}
            onChange={e => setCurrentTime(parseFloat(e.target.value))}
            style={{
              flex: 1,
              height: 5,
              background: `linear-gradient(to right, var(--green) ${progress * 100}%, rgba(255,255,255,0.15) ${progress * 100}%)`,
            }}
          />
          <span style={{ ...styles.time, color: 'var(--text-dim)' }}>{fmt(duration)}</span>
        </div>

        <div style={styles.speeds}>
          {SPEEDS.map(s => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              style={{
                ...styles.speedBtn,
                background: playbackSpeed === s ? 'var(--green)' : 'transparent',
                color: playbackSpeed === s ? '#06140a' : 'var(--text-muted)',
              }}
            >{s}×</button>
          ))}
        </div>

        <button
          onClick={toggleLoopPlayback}
          style={{
            ...styles.speedBtn,
            background: loopPlayback ? 'var(--green)' : 'transparent',
            color: loopPlayback ? '#06140a' : 'var(--text-muted)',
            fontSize: 16,
          }}
          title="Reproducción en loop"
        >↺</button>
      </div>
    </>
  )
}

const RoundBtn: React.FC<{
  onClick: () => void
  disabled?: boolean
  title?: string
  size: number
  primary?: boolean
  children: React.ReactNode
}> = ({ onClick, disabled, title, size, primary, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    style={{
      width: size, height: size,
      borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42,
      flexShrink: 0,
      background: primary ? 'var(--green)' : 'rgba(255,255,255,0.06)',
      color: primary ? '#06140a' : 'var(--text)',
      border: primary ? 'none' : '1px solid rgba(255,255,255,0.12)',
      boxShadow: primary ? '0 4px 16px rgba(63,185,80,0.4)' : 'none',
    }}
  >{children}</button>
)

const panel = 'rgba(13,17,23,0.92)'

const styles: Record<string, React.CSSProperties> = {
  titleWrap: {
    position: 'fixed',
    top: 18, left: 24,
    zIndex: 1000,
    userSelect: 'none',
    pointerEvents: 'none',
  },
  title: {
    fontSize: 20, fontWeight: 700, color: 'var(--text)',
    letterSpacing: '-0.3px',
    textShadow: '0 2px 8px rgba(0,0,0,0.6)',
  },
  subtitle: {
    fontSize: 12, color: 'var(--text-muted)', marginTop: 2,
    textShadow: '0 1px 4px rgba(0,0,0,0.6)',
  },
  exit: {
    position: 'fixed',
    top: 18, right: 24,
    zIndex: 1000,
    padding: '8px 14px',
    borderRadius: 'var(--radius-md)',
    background: panel,
    color: 'var(--text-muted)',
    border: '1px solid rgba(255,255,255,0.12)',
    fontSize: 12, fontWeight: 600,
  },
  bar: {
    position: 'fixed',
    bottom: 24, left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 18px',
    borderRadius: 18,
    background: panel,
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
    width: 'min(760px, calc(100vw - 48px))',
  },
  seekArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 120,
  },
  time: {
    fontSize: 12, fontFamily: 'monospace',
    color: 'var(--text)', minWidth: 44, textAlign: 'center',
    flexShrink: 0,
  },
  speeds: {
    display: 'flex', gap: 2, alignItems: 'center',
    flexShrink: 0,
  },
  speedBtn: {
    padding: '5px 9px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 12, fontFamily: 'monospace', fontWeight: 700,
    border: 'none',
  },
}

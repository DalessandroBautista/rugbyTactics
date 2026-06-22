import React from 'react'
import { useStore } from '../store/useStore'
import { PlaybackSpeed } from '../types'

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 2, 4]

export const Timeline: React.FC = () => {
  const isPlaying = useStore(s => s.isPlaying)
  const currentTime = useStore(s => s.currentTime)
  const playbackSpeed = useStore(s => s.playbackSpeed)
  const currentPlayId = useStore(s => s.currentPlayId)
  const plays = useStore(s => s.plays)
  const setIsPlaying = useStore(s => s.setIsPlaying)
  const setCurrentTime = useStore(s => s.setCurrentTime)
  const setPlaybackSpeed = useStore(s => s.setPlaybackSpeed)
  const resetPlayback = useStore(s => s.resetPlayback)
  const setAnimatingPositions = useStore(s => s.setAnimatingPositions)
  const loopPlayback = useStore(s => s.loopPlayback)
  const toggleLoopPlayback = useStore(s => s.toggleLoopPlayback)

  const play = plays.find(p => p.id === currentPlayId)
  const duration = play?.duration || 5000
  const progress = Math.min(currentTime / duration, 1)

  const handlePlay = () => {
    if (currentTime >= duration) setCurrentTime(0)
    setIsPlaying(true)
  }

  const handleStop = () => {
    // resetPlayback limpia el estado animado → el canvas vuelve a las posiciones base
    resetPlayback()
  }

  const handleRestart = () => {
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

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const dec = Math.floor((ms % 1000) / 100)
    return `${m}:${(s % 60).toString().padStart(2, '0')}.${dec}`
  }

  return (
    <div style={styles.bar}>
      {/* Transport controls */}
      <div style={styles.controls}>
        <TBtn onClick={handleRestart} title="Restart">⏮</TBtn>
        <TBtn
          onClick={isPlaying ? () => setIsPlaying(false) : handlePlay}
          active={isPlaying}
          title={isPlaying ? 'Pause' : 'Play'}
          style={{ background: isPlaying ? 'var(--red)' : 'var(--green)', color: '#fff', width: 30 }}
        >
          {isPlaying ? '⏸' : '▶'}
        </TBtn>
        <TBtn onClick={handleStop} title="Stop">⏹</TBtn>
      </div>

      {/* Seek bar */}
      <span style={styles.time}>{fmt(currentTime)}</span>
      <div style={styles.seekWrap}>
        <input
          type="range"
          min={0}
          max={duration}
          value={currentTime}
          onChange={e => setCurrentTime(parseFloat(e.target.value))}
          style={{
            width: '100%',
            background: `linear-gradient(to right, var(--accent) ${progress * 100}%, var(--border) ${progress * 100}%)`,
          }}
        />
      </div>
      <span style={{ ...styles.time, color: 'var(--text-dim)' }}>{fmt(duration)}</span>

      {/* Speed selector */}
      <div style={styles.speeds}>
        {SPEEDS.map(s => (
          <button
            key={s}
            onClick={() => setPlaybackSpeed(s)}
            style={{
              ...styles.speedBtn,
              background: playbackSpeed === s ? 'var(--panel-alt)' : 'transparent',
              color: playbackSpeed === s ? 'var(--accent)' : 'var(--text-dim)',
              border: `1px solid ${playbackSpeed === s ? 'var(--accent)' : 'transparent'}`,
            }}
          >
            {s}×
          </button>
        )        )}
      </div>

      {/* Loop toggle */}
      <button
        onClick={toggleLoopPlayback}
        style={{
          ...styles.speedBtn,
          background: loopPlayback ? 'var(--panel-alt)' : 'transparent',
          color: loopPlayback ? 'var(--accent)' : 'var(--text-dim)',
          border: `1px solid ${loopPlayback ? 'var(--accent)' : 'transparent'}`,
          marginLeft: 4,
        }}
        title="Reproducción en loop"
      >
        ↺
      </button>
    </div>
  )
}

const TBtn: React.FC<{
  onClick: () => void
  title?: string
  active?: boolean
  style?: React.CSSProperties
  children: React.ReactNode
}> = ({ onClick, title, style, children }) => (
  <button onClick={onClick} title={title} style={{ ...tBtnBase, ...style }}>
    {children}
  </button>
)

const tBtnBase: React.CSSProperties = {
  width: 28,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 'var(--radius-sm)',
  fontSize: 13,
  background: 'var(--panel-alt)',
  color: 'var(--text-muted)',
  border: '1px solid var(--border)',
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 12px',
    background: 'var(--panel)',
    borderTop: '1px solid var(--border)',
    height: 44,
    flexShrink: 0,
  },
  controls: {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
  },
  time: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: 'var(--text-muted)',
    minWidth: 48,
    textAlign: 'center',
    flexShrink: 0,
  },
  seekWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    minWidth: 80,
  },
  speeds: {
    display: 'flex',
    gap: 2,
    alignItems: 'center',
  },
  speedBtn: {
    padding: '2px 7px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 600,
  },
}

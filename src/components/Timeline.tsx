import React from 'react'
import { useStore } from '../store/useStore'
import { PlaybackSpeed } from '../types'

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
  const movePlayer = useStore(s => s.movePlayer)
  const moveBall = useStore(s => s.moveBall)

  const play = plays.find(p => p.id === currentPlayId)
  const duration = play?.duration || 5000

  const handlePlay = () => {
    if (currentTime >= duration) {
      setCurrentTime(0)
    }
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const handleStop = () => {
    resetPlayback()
    if (play) {
      const positions: Record<number, { x: number; y: number }> = {}
      for (const player of play.players) {
        positions[player.id] = { x: player.x, y: player.y }
      }
      setAnimatingPositions(positions, { x: play.ball.x, y: play.ball.y })
    }
  }

  const handleRestart = () => {
    setCurrentTime(0)
    setIsPlaying(false)
    if (play) {
      const positions: Record<number, { x: number; y: number }> = {}
      for (const player of play.players) {
        if (player.trajectory.length > 0) {
          positions[player.id] = { x: player.trajectory[0].x, y: player.trajectory[0].y }
        } else {
          positions[player.id] = { x: player.x, y: player.y }
        }
      }
      const ballPos = play.ball.trajectory.length > 0
        ? { x: play.ball.trajectory[0].x, y: play.ball.trajectory[0].y }
        : { x: play.ball.x, y: play.ball.y }
      setAnimatingPositions(positions, ballPos)
    }
  }

  const handleSpeedChange = (speed: PlaybackSpeed) => {
    setPlaybackSpeed(speed)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const millis = Math.floor((ms % 1000) / 100)
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${millis}`
  }

  const speeds: PlaybackSpeed[] = [0.5, 1, 2, 4]

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      background: '#2a2a3e',
      borderTop: '1px solid #3a3a4e',
      minHeight: '48px',
      flexWrap: 'wrap',
    }}>
      <button
        onClick={handleRestart}
        style={buttonStyle}
        title="Restart"
      >
        ⏮
      </button>
      <button
        onClick={isPlaying ? handlePause : handlePlay}
        style={{ ...buttonStyle, background: isPlaying ? '#e74c3c' : '#2ecc71' }}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      <button
        onClick={handleStop}
        style={buttonStyle}
        title="Stop"
      >
        ⏹
      </button>

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        minWidth: '150px',
      }}>
        <span style={{ color: '#aaa', fontSize: '12px', fontFamily: 'monospace', minWidth: '50px' }}>
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration}
          value={currentTime}
          onChange={handleSeek}
          style={{
            flex: 1,
            height: '4px',
            WebkitAppearance: 'none',
            appearance: 'none',
            background: `linear-gradient(to right, #2ecc71 ${(currentTime / duration) * 100}%, #444 ${(currentTime / duration) * 100}%)`,
            borderRadius: '2px',
            outline: 'none',
            cursor: 'pointer',
          }}
        />
        <span style={{ color: '#aaa', fontSize: '12px', fontFamily: 'monospace', minWidth: '50px', textAlign: 'right' }}>
          {formatTime(duration)}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '2px' }}>
        {speeds.map(speed => (
          <button
            key={speed}
            onClick={() => handleSpeedChange(speed)}
            style={{
              ...speedButtonStyle,
              background: playbackSpeed === speed ? '#3498db' : 'transparent',
              color: playbackSpeed === speed ? '#fff' : '#888',
              border: playbackSpeed === speed ? '1px solid #3498db' : '1px solid #444',
            }}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  )
}

const buttonStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  background: '#3a3a4e',
  color: '#fff',
  transition: 'all 0.15s',
}

const speedButtonStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: '11px',
  fontWeight: 'bold',
  borderRadius: '4px',
  cursor: 'pointer',
  fontFamily: 'monospace',
  transition: 'all 0.15s',
}

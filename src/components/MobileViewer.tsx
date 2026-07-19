import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import type { PlaybackSpeed } from '../types'
import { FieldCanvas } from './FieldCanvas'

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 2, 4]

export const MobileViewer: React.FC<{ isLandscape: boolean; onExit: () => void; onEdit?: () => void; onRequestImmersive?: () => void }> = ({ isLandscape, onExit, onEdit, onRequestImmersive }) => {
  const plays = useStore(state => state.plays)
  const currentPlayId = useStore(state => state.currentPlayId)
  const isPlaying = useStore(state => state.isPlaying)
  const currentTime = useStore(state => state.currentTime)
  const speed = useStore(state => state.playbackSpeed)
  const viewer = useStore(state => state.playlistViewer)
  const [controlsVisible, setControlsVisible] = useState(true)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const play = plays.find(item => item.id === currentPlayId)
  const index = plays.findIndex(item => item.id === currentPlayId)
  const duration = play?.duration ?? 1

  useEffect(() => {
    setControlsVisible(true)
    if (!isPlaying) return
    const timer = setTimeout(() => setControlsVisible(false), 3_000)
    return () => clearTimeout(timer)
  }, [isPlaying, currentPlayId])

  useEffect(() => {
    if (!viewer || !play || isPlaying || currentTime < play.duration || index >= plays.length - 1) return
    advanceTimer.current = setTimeout(() => {
      useStore.getState().setCurrentPlay(plays[index + 1].id)
      setTimeout(() => useStore.getState().setIsPlaying(true), 350)
    }, 1_200)
    return () => { if (advanceTimer.current) clearTimeout(advanceTimer.current) }
  }, [viewer, play, isPlaying, currentTime, index, plays])

  if (!play) return null
  const goTo = (next: number) => {
    if (next < 0 || next >= plays.length) return
    useStore.getState().setCurrentPlay(plays[next].id)
    setControlsVisible(true)
  }
  const togglePlay = () => {
    onRequestImmersive?.()
    if (currentTime >= duration) useStore.getState().setCurrentTime(0)
    useStore.getState().setIsPlaying(!isPlaying)
  }
  const reset = () => {
    useStore.getState().setCurrentTime(0)
    useStore.getState().setIsPlaying(false)
  }
  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]
    useStore.getState().setPlaybackSpeed(next)
  }
  const progress = Math.min(100, (currentTime / duration) * 100)

  return <div className={`mobile-viewer ${controlsVisible ? 'has-controls' : ''}`} data-testid="mobile-viewer" onClick={() => setControlsVisible(true)}>
    <FieldCanvas />
    {!isLandscape && <div className="mobile-rotate" role="status"><span>↻</span><b>Gir&aacute; el celular</b><small>La jugada se ve mejor en horizontal</small></div>}
    {controlsVisible && <>
      <header className="mobile-viewer__top" onClick={event => event.stopPropagation()}>
        <div><span>{viewer ? `LISTA · ${index + 1} DE ${plays.length}` : play.category.toUpperCase()}</span><h1>{play.name}</h1></div>
        <div className="mobile-viewer__top-actions">{onEdit && <button onClick={onEdit} aria-label="Editar jugada">✎</button>}<button onClick={onExit} aria-label="Salir del visor">✕</button></div>
      </header>
      <div className="mobile-viewer__bottom" onClick={event => event.stopPropagation()}>
        <div className="mobile-viewer__buttons">
          <button onClick={() => goTo(index - 1)} disabled={index <= 0} aria-label="Jugada anterior">‹</button>
          <button onClick={reset} aria-label="Volver al inicio">⏮</button>
          <button className="mobile-viewer__play" onClick={togglePlay} aria-label={isPlaying ? 'Pausar' : 'Reproducir'}>{isPlaying ? 'Ⅱ' : '▶'}</button>
          <button onClick={() => goTo(index + 1)} disabled={index >= plays.length - 1} aria-label="Jugada siguiente">›</button>
        </div>
        <div className="mobile-viewer__seek">
          <span>{Math.floor(currentTime / 1000)}s</span>
          <input aria-label="Progreso" type="range" min={0} max={duration} value={currentTime} onChange={event => useStore.getState().setCurrentTime(Number(event.target.value))} style={{ background: `linear-gradient(90deg,var(--accent) ${progress}%,rgba(255,255,255,.22) ${progress}%)` }} />
          <button onClick={cycleSpeed} aria-label={`Velocidad ${speed} por`}>{speed}×</button>
        </div>
      </div>
    </>}
  </div>
}

import React, { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'

// Pausa entre jugadas al auto-avanzar (ms)
const AUTO_ADVANCE_DELAY = 1600

/**
 * Overlay del visor de listas compartidas. Se monta junto a PresentationBar
 * (que ya provee play/pausa, seek y anterior/siguiente sobre `plays`, que en
 * el visor son las jugadas de la lista). Suma: identificación de la lista,
 * auto-avance al terminar cada jugada, "Editar una copia" y salida limpia.
 */
export const PlaylistViewerBar: React.FC = () => {
  const viewer = useStore(s => s.playlistViewer)
  const presentationMode = useStore(s => s.presentationMode)
  const plays = useStore(s => s.plays)
  const currentPlayId = useStore(s => s.currentPlayId)
  const isPlaying = useStore(s => s.isPlaying)
  const currentTime = useStore(s => s.currentTime)
  const loopPlayback = useStore(s => s.loopPlayback)

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const play = plays.find(p => p.id === currentPlayId)
  const idx = plays.findIndex(p => p.id === currentPlayId)

  // Si el usuario salió de presentación (Esc), cerrar el visor y restaurar
  useEffect(() => {
    if (viewer && !presentationMode) useStore.getState().closePlaylistViewer()
  }, [viewer, presentationMode])

  // Auto-avance: al terminar una jugada, pasar a la siguiente tras una pausa
  useEffect(() => {
    if (!viewer || !play || loopPlayback) return
    const ended = !isPlaying && play.duration > 0 && currentTime >= play.duration
    if (ended && idx < plays.length - 1) {
      advanceTimer.current = setTimeout(() => {
        const s = useStore.getState()
        const i = s.plays.findIndex(p => p.id === s.currentPlayId)
        if (i >= 0 && i < s.plays.length - 1) {
          s.setCurrentPlay(s.plays[i + 1].id)
          // PresentationBar reposiciona al inicio al cambiar de jugada;
          // arrancar la reproducción apenas termine ese reset.
          setTimeout(() => useStore.getState().setIsPlaying(true), 400)
        }
      }, AUTO_ADVANCE_DELAY)
    }
    return () => {
      if (advanceTimer.current) {
        clearTimeout(advanceTimer.current)
        advanceTimer.current = null
      }
    }
  }, [viewer, isPlaying, currentTime, currentPlayId, loopPlayback])

  if (!viewer || !play) return null

  return (
    <div style={styles.wrap}>
      <div style={styles.badge}>LISTA</div>
      <div style={{ minWidth: 0 }}>
        <div style={styles.name}>{viewer.name}</div>
        <div style={styles.meta}>{idx + 1} de {plays.length} jugadas</div>
      </div>
      <button
        onClick={() => useStore.getState().editCopyOfViewerPlay()}
        style={styles.editBtn}
        title="Copia esta jugada a tu biblioteca para editarla — la lista original no cambia"
      >
        ✎ Editar una copia
      </button>
      <button
        onClick={() => useStore.getState().closePlaylistViewer()}
        style={styles.exitBtn}
        title="Cerrar la lista y volver a tus jugadas"
      >
        Salir de la lista
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'fixed',
    top: 18, left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1001,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '9px 14px',
    borderRadius: 'var(--radius-lg)',
    background: 'rgba(13,17,23,0.92)',
    border: '1px solid rgba(var(--accent-rgb),0.35)',
    boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
    maxWidth: 'min(680px, calc(100vw - 48px))',
    userSelect: 'none',
  },
  badge: {
    fontFamily: 'var(--font-display)',
    fontSize: 11, fontWeight: 700, letterSpacing: '1.5px',
    color: '#1a1206',
    background: 'var(--accent)',
    padding: '3px 8px',
    borderRadius: 'var(--radius-sm)',
    flexShrink: 0,
  },
  name: {
    fontSize: 13, fontWeight: 700, color: 'var(--text)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  meta: {
    fontSize: 10, color: 'var(--text-muted)',
  },
  editBtn: {
    marginLeft: 8,
    padding: '6px 12px',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(var(--accent-rgb),0.14)',
    color: 'var(--accent)',
    border: '1px solid rgba(var(--accent-rgb),0.3)',
    fontSize: 12, fontWeight: 600,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  exitBtn: {
    padding: '6px 12px',
    borderRadius: 'var(--radius-md)',
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    fontSize: 12,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
}

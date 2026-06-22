import { useEffect } from 'react'
import { useStore } from '../store/useStore'

export function useKeyboard() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el foco está en un input o textarea
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const state = useStore.getState()

      // Ctrl+Z / Ctrl+Y ya se manejan en App.tsx, los ignoramos acá
      if (e.ctrlKey || e.metaKey) return

      // ── Modo presentación: set de teclas reducido ──
      if (state.presentationMode) {
        const plays = state.plays
        const idx = plays.findIndex(p => p.id === state.currentPlayId)
        switch (e.key) {
          case 'Escape':
          case 'p':
          case 'P':
            e.preventDefault()
            state.togglePresentationMode()
            break
          case ' ':
            e.preventDefault()
            state.setIsPlaying(!state.isPlaying)
            break
          case 'ArrowRight':
            e.preventDefault()
            if (idx < plays.length - 1) state.setCurrentPlay(plays[idx + 1].id)
            break
          case 'ArrowLeft':
            e.preventDefault()
            if (idx > 0) state.setCurrentPlay(plays[idx - 1].id)
            break
        }
        return
      }

      switch (e.key) {
        case 'p':
        case 'P':
          e.preventDefault()
          state.togglePresentationMode()
          break

        case ' ':
          e.preventDefault()
          state.setIsPlaying(!state.isPlaying)
          break

        case 's':
        case 'S':
          e.preventDefault()
          state.setEditMode('select')
          break

        case 'm':
        case 'M':
          e.preventDefault()
          state.setEditMode('move')
          break

        case 'r':
        case 'R':
          e.preventDefault()
          state.setEditMode('record')
          break

        case 'g':
        case 'G':
          e.preventDefault()
          if (state.isRecording) {
            state.finishRecording()
          } else if (state.selectedPlayerId !== null || state.selectedBall) {
            state.startRecording()
          }
          break

        case 'Delete':
        case 'Backspace':
          e.preventDefault()
          if (state.selectedPlayerId !== null) {
            state.clearPlayerTrajectory(state.selectedPlayerId)
          } else if (state.selectedBall) {
            state.clearBallTrajectory()
          }
          break

        case 'Escape':
          e.preventDefault()
          state.setSelectedPlayer(null)
          state.setSelectedBall(false)
          break

        case 'f':
        case 'F':
          e.preventDefault()
          state.fitCanvas()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}

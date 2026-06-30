import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store/useStore'

export function useRecording() {
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const minDistance = 3

  const isRecording = useStore(s => s.isRecording)
  const addRecordingPoint = useStore(s => s.addRecordingPoint)
  const finishRecording = useStore(s => s.finishRecording)
  const stopRecording = useStore(s => s.stopRecording)
  const startRecording = useStore(s => s.startRecording)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'g' || e.key === 'G') {
      const state = useStore.getState()
      if (state.isRecording) {
        finishRecording()
      } else if (state.selectedPlayerId !== null || state.selectedBall) {
        startRecording()
      }
    }
    if (e.key === 'Escape' && isRecording) {
      stopRecording()
    }
  }, [isRecording, startRecording, finishRecording, stopRecording])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleDrag = useCallback((id: number, x: number, y: number) => {
    // Leer isRecording directo del store para evitar el problema del closure
    // desactualizado cuando startRecording() y handleDrag() se llaman en el
    // mismo tick (antes de que React re-renderice y actualice el closure).
    if (!useStore.getState().isRecording) return

    if (lastPointRef.current) {
      const dx = x - lastPointRef.current.x
      const dy = y - lastPointRef.current.y
      if (Math.sqrt(dx * dx + dy * dy) < minDistance) return
    }

    lastPointRef.current = { x, y }
    addRecordingPoint(id, x, y)
  }, [addRecordingPoint])

  const resetLastPoint = useCallback(() => {
    lastPointRef.current = null
  }, [])

  return { handleDrag, resetLastPoint }
}

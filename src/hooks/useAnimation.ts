import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { computeAllPositions } from '../utils/interpolation'

export function useAnimation() {
  const animFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  const isPlaying = useStore(s => s.isPlaying)
  const currentPlayId = useStore(s => s.currentPlayId)

  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
      return
    }

    const play = useStore.getState().plays.find(p => p.id === currentPlayId)
    if (!play) return

    const duration = play.duration || 5000
    let current = useStore.getState().currentTime

    const animate = (timestamp: number) => {
      const state = useStore.getState()
      if (!state.isPlaying) return

      const speed = state.playbackSpeed

      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp
        animFrameRef.current = requestAnimationFrame(animate)
        return
      }

      const delta = (timestamp - lastTimeRef.current) * speed
      lastTimeRef.current = timestamp

      current += delta

      if (current >= duration) {
        state.setCurrentTime(duration)
        const positions = computeAllPositions(play.players, play.ball, duration)
        state.setAnimatingPositions(positions.playerPositions, positions.ballPosition)
        state.setIsPlaying(false)
        return
      }

      state.setCurrentTime(current)
      const positions = computeAllPositions(play.players, play.ball, current)
      state.setAnimatingPositions(positions.playerPositions, positions.ballPosition)

      animFrameRef.current = requestAnimationFrame(animate)
    }

    lastTimeRef.current = 0
    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
    }
  }, [isPlaying, currentPlayId])

  return null
}

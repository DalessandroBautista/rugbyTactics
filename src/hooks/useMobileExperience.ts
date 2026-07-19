import { useEffect, useState } from 'react'
import { isMobileDevice } from '../utils/mobile'

function snapshot() {
  const coarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
  const mobileBrowser = /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent)
  const width = window.screen?.width || window.innerWidth
  const height = window.screen?.height || window.innerHeight
  return {
    isMobileExperience: isMobileDevice({ width, height, coarsePointer, mobileBrowser }),
    isLandscape: window.innerWidth > window.innerHeight,
  }
}

export function useMobileExperience() {
  const [state, setState] = useState(snapshot)
  useEffect(() => {
    const update = () => setState(previous => ({ ...previous, isLandscape: window.innerWidth > window.innerHeight }))
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])
  return state
}

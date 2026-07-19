import { useEffect } from 'react'
import { Layout } from './components/Layout'
import { useStore } from './store/useStore'
import { useAuth } from './store/useAuth'
import { useKeyboard } from './hooks/useKeyboard'
import { useServerSync } from './hooks/useServerSync'
import { readSharedPlay, readSharedPlaylistId, clearShareHash } from './utils/share'
import { api } from './utils/api'
import { ensureFFmpegLoaded } from './utils/ffmpegFix'
import { isMobileDevice } from './utils/mobile'

function isMobileBrowser(): boolean {
  const coarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
  return isMobileDevice({
    width: window.screen?.width || window.innerWidth,
    height: window.screen?.height || window.innerHeight,
    coarsePointer,
    mobileBrowser: /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent),
  })
}

function App() {
  useKeyboard()
  useServerSync()

  // Precargar FFmpeg.wasm en segundo plano para que esté listo al exportar video
  useEffect(() => {
    ensureFFmpegLoaded().catch(() => {
      // FFmpeg no está disponible → la exportación usará el blob original sin fix
    })
  }, [])

  // Restaurar sesión si hay token guardado
  const checkAuth = useAuth(s => s.checkAuth)
  useEffect(() => { checkAuth() }, [])

  // Cargar una jugada compartida por URL (#play=...) al iniciar
  useEffect(() => {
    const shared = readSharedPlay()
    if (shared) {
      useStore.getState().loadFromJson(JSON.stringify(shared))
      if (isMobileBrowser()) useStore.setState({ presentationMode: true, isPlaying: false, currentTime: 0 })
      clearShareHash()
    }
  }, [])

  // Abrir una lista de reproducción compartida (#list=...) en el visor
  useEffect(() => {
    const listId = readSharedPlaylistId()
    if (!listId) return
    api.getPublicPlaylist(listId)
      .then(list => {
        clearShareHash()
        useStore.getState().openPlaylistViewer(list)
      })
      .catch(() => {
        clearShareHash()
        alert('No se pudo abrir la lista compartida: el link no existe o fue eliminado.')
      })
  }, [])

  // Primera visita: mostrar ayuda automáticamente
  useEffect(() => {
    const seen = localStorage.getItem('tr_help_seen')
    if (!seen) {
      useStore.getState().setShowHelp(true)
      localStorage.setItem('tr_help_seen', '1')
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        useStore.getState().undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        useStore.getState().redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return <Layout />
}

export default App

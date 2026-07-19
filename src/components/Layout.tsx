import React, { useEffect, useRef, useState } from 'react'
import { TopBar } from './TopBar'
import { Timeline } from './Timeline'
import { Sidebar } from './Sidebar'
import { FieldCanvas } from './FieldCanvas'
import { PlayLibrary } from './PlayLibrary'
import { ExportDialog } from './ExportDialog'
import { FormationDialog } from './FormationDialog'
import { PresentationBar } from './PresentationBar'
import { WelcomeOverlay } from './WelcomeOverlay'
import { AuthModal } from './AuthModal'
import { HelpDialog } from './HelpDialog'
import { PlaylistDialog } from './PlaylistDialog'
import { PlaylistViewerBar } from './PlaylistViewerBar'
import { ProposalsDialog } from './ProposalsDialog'
import { useStore } from '../store/useStore'
import { useAuth } from '../store/useAuth'
import { useMobileExperience } from '../hooks/useMobileExperience'
import { MobileLibrary } from './MobileLibrary'
import { MobileViewer } from './MobileViewer'
import { MobileQuickEditor } from './MobileQuickEditor'
import { api } from '../utils/api'
import type { PlaylistMeta } from '../types'
import { enterImmersiveMode, exitImmersiveMode, type ImmersiveState, type MobileView } from '../utils/mobile'

export const Layout: React.FC = () => {
  const [showAuth, setShowAuth] = useState(false)
  const [mobileView, setMobileView] = useState<MobileView>('library')
  const [mobilePlaylists, setMobilePlaylists] = useState<PlaylistMeta[]>([])
  const immersive = useRef<ImmersiveState>({ fullscreen: false, orientationLocked: false })
  const { isMobileExperience, isLandscape } = useMobileExperience()
  const user = useAuth(s => s.user)
  const plays = useStore(s => s.plays)
  const currentPlayId = useStore(s => s.currentPlayId)
  const isRecording = useStore(s => s.isRecording)
  const showFormation = useStore(s => s.showFormation)
  const presentationMode = useStore(s => s.presentationMode)
  const isExportingVideo = useStore(s => s.isExportingVideo)

  const play = plays.find(p => p.id === currentPlayId)

  useEffect(() => {
    if (isMobileExperience && presentationMode) setMobileView('viewer')
  }, [isMobileExperience, presentationMode])

  useEffect(() => {
    if (!isMobileExperience || !user) { setMobilePlaylists([]); return }
    api.listPlaylists().then(setMobilePlaylists).catch(() => setMobilePlaylists([]))
  }, [isMobileExperience, user])

  const requestImmersive = async () => {
    const orientation = screen.orientation as ScreenOrientation & { lock?: (value: string) => Promise<void> }
    const next = await enterImmersiveMode({
      requestFullscreen: document.fullscreenElement ? undefined : () => document.documentElement.requestFullscreen(),
      lockLandscape: orientation?.lock ? () => orientation.lock!('landscape') : undefined,
    })
    immersive.current = {
      fullscreen: immersive.current.fullscreen || next.fullscreen,
      orientationLocked: immersive.current.orientationLocked || next.orientationLocked,
    }
  }

  const enterViewer = async (playId?: string) => {
    if (playId) useStore.getState().setCurrentPlay(playId)
    await requestImmersive()
    useStore.setState({ presentationMode: true, isPlaying: false, currentTime: 0 })
    useStore.getState().fitCanvas()
    setMobileView('viewer')
  }

  const exitViewer = async () => {
    if (useStore.getState().playlistViewer) useStore.getState().closePlaylistViewer()
    else useStore.setState({ presentationMode: false, isPlaying: false })
    const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void }
    await exitImmersiveMode(immersive.current, {
      exitFullscreen: document.fullscreenElement ? () => document.exitFullscreen() : undefined,
      unlockOrientation: orientation?.unlock ? () => orientation.unlock!() : undefined,
    })
    immersive.current = { fullscreen: false, orientationLocked: false }
    setMobileView('library')
  }

  const openMobilePlaylist = async (id: string) => {
    const immersiveRequest = requestImmersive()
    try {
      const list = await api.getPublicPlaylist(id)
      await immersiveRequest
      useStore.getState().openPlaylistViewer(list)
      setMobileView('viewer')
    } catch {
      await immersiveRequest
      await exitImmersiveMode(immersive.current, {
        exitFullscreen: document.fullscreenElement ? () => document.exitFullscreen() : undefined,
        unlockOrientation: () => (screen.orientation as ScreenOrientation & { unlock?: () => void })?.unlock?.(),
      })
      immersive.current = { fullscreen: false, orientationLocked: false }
      alert('No se pudo abrir la lista. Revisá tu conexión e intentá otra vez.')
    }
  }

  useEffect(() => {
    if (!isMobileExperience || mobileView === 'library' || mobileView === 'desktop') return
    history.pushState({ rugbyTacticsMobile: mobileView }, '')
    const back = () => {
      if (mobileView === 'viewer') void exitViewer()
      else setMobileView('library')
    }
    window.addEventListener('popstate', back, { once: true })
    return () => window.removeEventListener('popstate', back)
  }, [isMobileExperience, mobileView])

  useEffect(() => {
    if (!user || sessionStorage.getItem('rugbytactics:pending-proposal') !== '1') return
    sessionStorage.removeItem('rugbytactics:pending-proposal')
    window.dispatchEvent(new CustomEvent('rugbytactics:proposals', { detail: 'send' }))
  }, [user])

  if (isMobileExperience && mobileView !== 'desktop') {
    if (mobileView === 'viewer') return <MobileViewer isLandscape={isLandscape} onExit={() => void exitViewer()} onRequestImmersive={() => void requestImmersive()} onEdit={() => {
      const state = useStore.getState()
      if (state.playlistViewer) state.editCopyOfViewerPlay()
      else useStore.setState({ presentationMode: false })
      setMobileView('quick-edit')
    }} />
    if (mobileView === 'quick-edit') return <MobileQuickEditor onExit={() => setMobileView('library')} />
    return <><MobileLibrary plays={plays} playlists={mobilePlaylists} onView={id => void enterViewer(id)} onEdit={id => {
      useStore.getState().setCurrentPlay(id)
      setMobileView('quick-edit')
    }} onPropose={id => {
      useStore.getState().setCurrentPlay(id)
      if (user) window.dispatchEvent(new CustomEvent('rugbytactics:proposals', { detail: 'send' }))
      else {
        sessionStorage.setItem('rugbytactics:pending-proposal', '1')
        setShowAuth(true)
      }
    }} onAccount={() => user ? useAuth.getState().logout() : setShowAuth(true)} accountLabel={user ? `Cerrar sesión de ${user.email}` : 'Iniciar sesión'} onViewPlaylist={id => void openMobilePlaylist(id)} onDesktop={() => {
      if (confirm('El editor completo está optimizado para computadora. ¿Abrirlo igualmente?')) setMobileView('desktop')
    }} />
    {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    <ProposalsDialog onRequireAuth={() => setShowAuth(true)} /></>
  }

  // ── Modo presentación: solo campo + controles flotantes ──
  if (presentationMode) {
    return (
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg)', position: 'relative' }}>
        <FieldCanvas />
        {play && <PresentationBar />}
        <PlaylistViewerBar />
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <TopBar onShowAuth={() => setShowAuth(true)} />
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}>
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <FieldCanvas />
          {play && <Timeline />}
        </div>
        {play && <Sidebar />}
      </div>

      {isRecording && (
        <div style={{
          position: 'fixed',
          top: 44,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--red)',
          color: '#fff',
          padding: '4px 14px',
          borderRadius: '0 0 6px 6px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.5px',
          zIndex: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          animation: 'pulse 1s infinite',
          userSelect: 'none',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
          GRABANDO — Presioná G para detener
        </div>
      )}

      <PlayLibrary />
      <ExportDialog />
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showFormation && (
        <FormationDialog
          type={showFormation}
          onClose={() => useStore.getState().setShowFormation(null)}
        />
      )}
      <HelpDialog />
      <PlaylistDialog />
      <ProposalsDialog onRequireAuth={() => setShowAuth(true)} />
      {isExportingVideo && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(8,11,15,0.55)',
          zIndex: 1500,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          pointerEvents: 'none',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 20px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--red)', animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              Grabando video… dejá que la jugada termine de reproducirse
            </span>
          </div>
        </div>
      )}

      <WelcomeOverlay />
    </div>
  )
}

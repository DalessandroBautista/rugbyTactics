import React, { useEffect, useState } from 'react'
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

export const Layout: React.FC = () => {
  const [showAuth, setShowAuth] = useState(false)
  const user = useAuth(s => s.user)
  const plays = useStore(s => s.plays)
  const currentPlayId = useStore(s => s.currentPlayId)
  const isRecording = useStore(s => s.isRecording)
  const showFormation = useStore(s => s.showFormation)
  const presentationMode = useStore(s => s.presentationMode)
  const isExportingVideo = useStore(s => s.isExportingVideo)

  const play = plays.find(p => p.id === currentPlayId)

  useEffect(() => {
    if (!user || sessionStorage.getItem('rugbytactics:pending-proposal') !== '1') return
    sessionStorage.removeItem('rugbytactics:pending-proposal')
    window.dispatchEvent(new CustomEvent('rugbytactics:proposals', { detail: 'send' }))
  }, [user])

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

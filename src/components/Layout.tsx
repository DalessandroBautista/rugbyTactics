import React from 'react'
import { TopBar } from './TopBar'
import { Timeline } from './Timeline'
import { Sidebar } from './Sidebar'
import { FieldCanvas } from './FieldCanvas'
import { PlayLibrary } from './PlayLibrary'
import { ExportDialog } from './ExportDialog'
import { FormationDialog } from './FormationDialog'
import { useStore } from '../store/useStore'

export const Layout: React.FC = () => {
  const plays = useStore(s => s.plays)
  const currentPlayId = useStore(s => s.currentPlayId)
  const isRecording = useStore(s => s.isRecording)
  const showFormation = useStore(s => s.showFormation)

  const play = plays.find(p => p.id === currentPlayId)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#16162a',
    }}>
      <TopBar />
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
          top: '52px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#e74c3c',
          color: '#fff',
          padding: '6px 16px',
          borderRadius: '0 0 8px 8px',
          fontSize: '12px',
          fontWeight: 'bold',
          zIndex: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'pulse 1s infinite',
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#fff',
          }} />
          RECORDING - Press G to stop
        </div>
      )}

      <PlayLibrary />
      <ExportDialog />
      {showFormation && (
        <FormationDialog
          type={showFormation}
          onClose={() => useStore.getState().setShowFormation(null)}
        />
      )}
    </div>
  )
}

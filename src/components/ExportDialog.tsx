import React, { useRef } from 'react'
import { useStore } from '../store/useStore'
import { downloadJson, downloadCsv } from '../utils/export'

export const ExportDialog: React.FC = () => {
  const showExportDialog = useStore(s => s.showExportDialog)
  const toggleExportDialog = useStore(s => s.toggleExportDialog)
  const exportToJson = useStore(s => s.exportToJson)
  const plays = useStore(s => s.plays)
  const currentPlayId = useStore(s => s.currentPlayId)
  const exportVideo = useStore(s => s.exportVideo)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importRef = useStore(s => s.loadFromJson)
  const [importError, setImportError] = React.useState<string | null>(null)

  if (!showExportDialog) return null

  const play = plays.find(p => p.id === currentPlayId)

  const handleExportJson = () => {
    const json = exportToJson()
    if (json && play) {
      downloadJson(play)
    }
  }

  const handleExportCsv = () => {
    downloadCsv(plays)
  }

  const handleExportVideo = () => {
    if (!play || !exportVideo) return
    // Cerrar el diálogo para que la animación quede visible mientras se graba
    toggleExportDialog()
    exportVideo()
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        importRef(text)
        setImportError(null)
        toggleExportDialog()
      } catch {
        setImportError('Failed to import file. Check that it is valid JSON.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) toggleExportDialog() }}
    >
      <div style={{
        width: '400px',
        maxWidth: '90vw',
        background: 'var(--panel-alt)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Export / Import</h2>
          <button onClick={toggleExportDialog} style={{
            background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '20px',
          }}>✕</button>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '4px' }}>
            Export current play
          </div>

          <button onClick={handleExportJson} style={exportButtonStyle}>
            📄 Export as JSON
          </button>
          <button onClick={handleExportVideo} style={exportButtonStyle}>
            🎬 Exportar como video (MP4)
          </button>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
            <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>
              Export all plays as CSV
            </div>
            <button onClick={handleExportCsv} style={exportButtonStyle}>
              📊 Export CSV
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
            <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>
              Import play from JSON
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button onClick={handleImport} style={{ ...exportButtonStyle, background: '#8e44ad' }}>
              📂 Import JSON
            </button>
            {importError && (
              <div style={{ fontSize: '12px', color: '#e74c3c', marginTop: '4px' }}>
                {importError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const exportButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 'bold',
  background: '#2a2a3e',
  color: '#ccc',
  textAlign: 'left',
  transition: 'all 0.15s',
}

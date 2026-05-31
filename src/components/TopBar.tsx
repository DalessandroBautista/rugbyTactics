import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { EditMode } from '../types'
import { APP_VERSION } from '../version'

export const TopBar: React.FC = () => {
  const editMode = useStore(s => s.editMode)
  const setEditMode = useStore(s => s.setEditMode)
  const isRecording = useStore(s => s.isRecording)
  const isPlaying = useStore(s => s.isPlaying)
  const currentPlayId = useStore(s => s.currentPlayId)
  const selectedPlayerId = useStore(s => s.selectedPlayerId)
  const selectedBall = useStore(s => s.selectedBall)
  const startRecording = useStore(s => s.startRecording)
  const finishRecording = useStore(s => s.finishRecording)
  const toggleLibrary = useStore(s => s.toggleLibrary)
  const showLibrary = useStore(s => s.showLibrary)
  const toggleExportDialog = useStore(s => s.toggleExportDialog)
  const multiSelect = useStore(s => s.multiSelect)
  const toggleMultiSelect = useStore(s => s.toggleMultiSelect)

  const handleModeChange = (mode: EditMode) => {
    if (isRecording) finishRecording()
    setEditMode(mode)
  }

  const handleRecordToggle = () => {
    if (isRecording) {
      finishRecording()
    } else if (selectedPlayerId !== null || selectedBall) {
      startRecording()
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      background: '#1e1e32',
      borderBottom: '1px solid #3a3a4e',
      minHeight: '44px',
      flexWrap: 'wrap',
    }}>
      <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '16px', marginRight: '16px', fontFamily: 'sans-serif', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span>TacticsRugby</span>
        <span style={{ fontSize: '11px', color: '#888', fontWeight: 'normal' }}>v{APP_VERSION}</span>
      </div>

      <div style={{ display: 'flex', gap: '4px', background: '#2a2a3e', borderRadius: '8px', padding: '3px' }}>
        {(['select', 'move', 'record'] as EditMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              background: editMode === mode ? '#3498db' : 'transparent',
              color: editMode === mode ? '#fff' : '#888',
              transition: 'all 0.15s',
            }}
          >
            {mode === 'select' ? '🔍 Select' : mode === 'move' ? '✋ Move' : '🔴 Record'}
          </button>
        ))}
      </div>

      {editMode === 'record' && (
        <button
          onClick={handleRecordToggle}
          disabled={(!selectedPlayerId && !selectedBall) && !isRecording}
          style={{
            padding: '6px 14px',
            border: 'none',
            borderRadius: '6px',
            cursor: (selectedPlayerId !== null || selectedBall || isRecording) ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            fontWeight: 'bold',
            background: isRecording ? '#e74c3c' : '#2ecc71',
            color: '#fff',
            opacity: (selectedPlayerId !== null || selectedBall || isRecording) ? 1 : 0.5,
            animation: isRecording ? 'pulse 1s infinite' : 'none',
          }}
        >
          {isRecording ? '⏹ Stop (G)' : '⏺ Start (G)'}
        </button>
      )}

      <button
        onClick={() => { if (currentPlayId && confirm('Resetear la jugada? Se borrarán todos los movimientos.')) useStore.getState().resetPlay(currentPlayId) }}
        style={{ ...iconButtonStyle, color: '#e74c3c' }}
      >
        🔄 Reset
      </button>

      <button
        onClick={() => { if (currentPlayId) useStore.getState().resetMovements(currentPlayId) }}
        style={iconButtonStyle}
      >
        🧹 Borrar movimientos
      </button>

      <button onClick={() => useStore.getState().setShowFormation('lineout')} style={iconButtonStyle}>
        📏 Lineout
      </button>
      <button onClick={() => useStore.getState().setShowFormation('scrum')} style={iconButtonStyle}>
        💪 Scrum
      </button>

      <div style={{ flex: 1 }} />

      <button
        onClick={toggleMultiSelect}
        style={{
          ...iconButtonStyle,
          background: multiSelect ? '#3498db' : '#2a2a3e',
          color: multiSelect ? '#fff' : '#ccc',
        }}
      >
        {multiSelect ? '☑ Multi' : '☐ Multi'}
      </button>

      <button onClick={toggleLibrary} style={iconButtonStyle}>
        📚 {showLibrary ? 'Close' : 'Library'}
      </button>
      <button onClick={toggleExportDialog} style={iconButtonStyle}>
        📤 Export
      </button>
    </div>
  )
}

const iconButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid #3a3a4e',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '12px',
  background: '#2a2a3e',
  color: '#ccc',
  transition: 'all 0.15s',
}

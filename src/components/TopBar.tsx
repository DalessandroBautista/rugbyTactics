import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { EditMode } from '../types'
import { APP_VERSION } from '../version'
import { buildShareUrl } from '../utils/share'

const MODE_CONFIG: Record<EditMode, { label: string; icon: string; key: string; color: string; bg: string; border: string }> = {
  select: {
    label: 'Seleccionar', icon: '↖', key: 'S',
    color: 'var(--mode-select)',
    bg: 'rgba(79,158,255,0.12)',
    border: 'rgba(79,158,255,0.25)',
  },
  move: {
    label: 'Mover', icon: '✥', key: 'M',
    color: 'var(--mode-move)',
    bg: 'rgba(227,179,65,0.12)',
    border: 'rgba(227,179,65,0.25)',
  },
  record: {
    label: 'Grabar', icon: '⏺', key: 'R',
    color: 'var(--mode-record)',
    bg: 'rgba(248,81,73,0.12)',
    border: 'rgba(248,81,73,0.25)',
  },
}

export const TopBar: React.FC = () => {
  const editMode = useStore(s => s.editMode)
  const setEditMode = useStore(s => s.setEditMode)
  const isRecording = useStore(s => s.isRecording)
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
  const snapToGrid = useStore(s => s.snapToGrid)
  const toggleSnapToGrid = useStore(s => s.toggleSnapToGrid)
  const fitCanvas = useStore(s => s.fitCanvas)
  const history = useStore(s => s.history)
  const future = useStore(s => s.future)
  const undo = useStore(s => s.undo)
  const redo = useStore(s => s.redo)
  const exportPNG = useStore(s => s.exportPNG)

  const [shared, setShared] = useState(false)

  const handleShare = async () => {
    const state = useStore.getState()
    const play = state.plays.find(p => p.id === state.currentPlayId)
    if (!play) return
    try {
      await navigator.clipboard.writeText(buildShareUrl(play))
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch {
      // El portapapeles puede no estar disponible; sin acción
    }
  }

  const handleModeChange = (mode: EditMode) => {
    if (isRecording) finishRecording()
    setEditMode(mode)
  }

  const handleRecordToggle = () => {
    if (isRecording) finishRecording()
    else if (selectedPlayerId !== null || selectedBall) startRecording()
  }

  const activeCfg = MODE_CONFIG[editMode]

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '0 10px',
      background: 'var(--panel)',
      height: 'var(--topbar-h)',
      flexShrink: 0,
      userSelect: 'none',
      borderBottom: `1px solid var(--border)`,
      boxShadow: `0 1px 0 0 ${activeCfg.border}`,
      transition: 'box-shadow 0.25s',
    }}>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 2, flexShrink: 0 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px',
          background: activeCfg.color,
          transition: 'background 0.25s',
          flexShrink: 0,
        }}>TR</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
            TacticsRugby
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'monospace', lineHeight: 1 }}>
            v{APP_VERSION}
          </div>
        </div>
      </div>

      <Divider />

      {/* Mode segment — dominant element */}
      <div style={{
        display: 'flex',
        background: 'var(--panel-alt)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {(Object.entries(MODE_CONFIG) as [EditMode, typeof activeCfg][]).map(([id, cfg], i, arr) => {
          const isActive = editMode === id
          return (
            <button
              key={id}
              onClick={() => handleModeChange(id)}
              title={`${cfg.label} — tecla ${cfg.key}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 11px',
                fontSize: 12,
                fontWeight: isActive ? 700 : 400,
                color: isActive ? cfg.color : 'var(--text-muted)',
                background: isActive ? cfg.bg : 'transparent',
                border: 'none',
                borderRight: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                borderRadius: 0,
                transition: 'background 0.15s, color 0.15s',
                letterSpacing: isActive ? '0.1px' : 0,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: 10, opacity: isActive ? 1 : 0.45 }}>{cfg.icon}</span>
              {cfg.label}
              <kbd style={{
                fontSize: 9, fontFamily: 'monospace',
                padding: '1px 4px', borderRadius: 3,
                background: isActive ? 'rgba(0,0,0,0.18)' : 'transparent',
                color: isActive ? cfg.color : 'var(--text-dim)',
                letterSpacing: '0.3px',
                border: isActive ? `1px solid ${cfg.border}` : '1px solid transparent',
              }}>{cfg.key}</kbd>
            </button>
          )
        })}
      </div>

      {/* Record button — contextual */}
      {editMode === 'record' && (
        <button
          onClick={handleRecordToggle}
          disabled={!selectedPlayerId && !selectedBall && !isRecording}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600, fontSize: 12,
            marginLeft: 2, flexShrink: 0,
            background: isRecording ? 'var(--red)' : 'rgba(248,81,73,0.12)',
            color: isRecording ? '#fff' : 'var(--red)',
            border: `1px solid ${isRecording ? 'var(--red)' : 'rgba(248,81,73,0.3)'}`,
            animation: isRecording ? 'pulse 1.2s infinite' : 'none',
            transition: 'background 0.15s',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', display: 'inline-block', flexShrink: 0 }} />
          {isRecording ? 'Detener' : 'Grabar'}
        </button>
      )}

      {/* Undo / Redo */}
      <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
        <IconBtn onClick={undo} disabled={history.length === 0} title="Deshacer (Ctrl+Z)">↩</IconBtn>
        <IconBtn onClick={redo} disabled={future.length === 0} title="Rehacer (Ctrl+Y)">↪</IconBtn>
      </div>

      <Divider />

      {/* Formations */}
      <GhostBtn onClick={() => useStore.getState().setShowFormation('lineout')} title="Aplicar formación de lineout">Lineout</GhostBtn>
      <GhostBtn onClick={() => useStore.getState().setShowFormation('scrum')} title="Aplicar formación de scrum">Scrum</GhostBtn>

      <div style={{ flex: 1 }} />

      {/* Presentar */}
      <button
        onClick={() => useStore.getState().togglePresentationMode()}
        title="Modo presentación — tecla P"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px',
          borderRadius: 'var(--radius-md)',
          fontSize: 12, fontWeight: 600,
          background: 'rgba(63,185,80,0.12)',
          color: 'var(--green)',
          border: '1px solid rgba(63,185,80,0.3)',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 10 }}>▶</span> Presentar
      </button>

      <Divider />

      {/* Toggles */}
      <ToggleBtn active={multiSelect} onClick={toggleMultiSelect} title="Selección múltiple — activá y hacé clic en jugadores, o arrastrá en el campo">Multi</ToggleBtn>
      <ToggleBtn active={snapToGrid} onClick={toggleSnapToGrid} title="Snap a grilla de 1 metro">Snap</ToggleBtn>

      <Divider />

      {/* View */}
      <GhostBtn onClick={fitCanvas} title="Centrar campo — tecla F">Centrar</GhostBtn>
      <GhostBtn onClick={() => { if (currentPlayId) useStore.getState().mirrorPlay(currentPlayId) }} title="Espejo horizontal de la jugada">Espejo</GhostBtn>

      <Divider />

      {/* Export */}
      <GhostBtn
        onClick={toggleLibrary}
        style={{ color: showLibrary ? 'var(--accent)' : undefined }}
        title="Biblioteca de jugadas"
      >Biblioteca</GhostBtn>
      <GhostBtn onClick={toggleExportDialog} title="Exportar / importar JSON">Exportar</GhostBtn>
      {exportPNG && <GhostBtn onClick={exportPNG} title="Descargar imagen PNG">PNG</GhostBtn>}
      <GhostBtn
        onClick={handleShare}
        style={{ color: shared ? 'var(--green)' : undefined }}
        title="Copiar enlace para compartir la jugada (sin servidor)"
      >{shared ? '¡Copiado!' : 'Compartir'}</GhostBtn>

      <Divider />

      {/* Danger — de-emphasized */}
      <button
        onClick={() => { if (currentPlayId) useStore.getState().resetMovements(currentPlayId) }}
        title="Borrar todas las trayectorias"
        style={{ ...dangerBtnBase, color: 'var(--text-muted)' }}
      >Borrar rutas</button>
      <button
        onClick={() => {
          if (currentPlayId && confirm('¿Reiniciar la jugada completa?'))
            useStore.getState().resetPlay(currentPlayId)
        }}
        title="Reiniciar posiciones y trayectorias"
        style={{ ...dangerBtnBase, color: 'var(--red)' }}
      >Reiniciar</button>

    </header>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

const Divider: React.FC = () => (
  <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 3px', flexShrink: 0 }} />
)

const GhostBtn: React.FC<{
  onClick: () => void
  title?: string
  style?: React.CSSProperties
  children: React.ReactNode
}> = ({ onClick, title, style, children }) => (
  <button onClick={onClick} title={title} style={{ ...ghostBase, ...style }}>{children}</button>
)

const ToggleBtn: React.FC<{
  active: boolean
  onClick: () => void
  title?: string
  children: React.ReactNode
}> = ({ active, onClick, title, children }) => (
  <button onClick={onClick} title={title} style={{
    ...ghostBase,
    background: active ? 'rgba(79,158,255,0.12)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    border: `1px solid ${active ? 'rgba(79,158,255,0.3)' : 'var(--border)'}`,
  }}>{children}</button>
)

const IconBtn: React.FC<{
  onClick: () => void
  disabled?: boolean
  title?: string
  children: React.ReactNode
}> = ({ onClick, disabled, title, children }) => (
  <button onClick={onClick} disabled={disabled} title={title} style={{
    ...ghostBase,
    width: 28,
    padding: '4px 0',
    fontSize: 14,
    textAlign: 'center' as const,
  }}>{children}</button>
)

const ghostBase: React.CSSProperties = {
  padding: '4px 9px',
  borderRadius: 'var(--radius-md)',
  background: 'transparent',
  color: 'var(--text-muted)',
  border: '1px solid var(--border)',
  fontSize: 12,
  whiteSpace: 'nowrap',
}

const dangerBtnBase: React.CSSProperties = {
  padding: '3px 8px',
  borderRadius: 'var(--radius-md)',
  background: 'transparent',
  border: '1px solid var(--border)',
  fontSize: 11,
  whiteSpace: 'nowrap',
  opacity: 0.65,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'opacity 0.12s',
}

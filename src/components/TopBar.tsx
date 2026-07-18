import React, { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { useAuth } from '../store/useAuth'
import { useServerSync } from '../hooks/useServerSync'
import { EditMode } from '../types'
import { APP_VERSION } from '../version'
import { buildShareUrl } from '../utils/share'
import { api } from '../utils/api'
import { SpeechBubbleInput } from './SpeechBubbleInput'

const MODE_CONFIG: Record<EditMode, { label: string; icon: string; key: string; color: string; bg: string; border: string }> = {
  select: {
    label: 'Seleccionar', icon: '↖', key: 'S',
    color: 'var(--mode-select)',
    bg: 'rgba(var(--accent-rgb),0.12)',
    border: 'rgba(var(--accent-rgb),0.25)',
  },
  move: {
    label: 'Mover', icon: '✥', key: 'M',
    color: 'var(--mode-move)',
    bg: 'rgba(111,194,135,0.12)',
    border: 'rgba(111,194,135,0.25)',
  },
  record: {
    label: 'Grabar', icon: '⏺', key: 'R',
    color: 'var(--mode-record)',
    bg: 'rgba(248,81,73,0.12)',
    border: 'rgba(248,81,73,0.25)',
  },
}

export const TopBar: React.FC<{ onShowAuth: () => void }> = ({ onShowAuth }) => {
  const { user, logout } = useAuth()
  const syncStatus = useServerSync()
  const editMode = useStore(s => s.editMode)
  const setEditMode = useStore(s => s.setEditMode)
  const isRecording = useStore(s => s.isRecording)
  const currentPlayId = useStore(s => s.currentPlayId)
  const selectedPlayerId = useStore(s => s.selectedPlayerId)
  const selectedBall = useStore(s => s.selectedBall)
  const startRecording = useStore(s => s.startRecording)
  const finishRecording = useStore(s => s.finishRecording)
  const recordingTimeOffset = useStore(s => s.recordingTimeOffset)
  const toggleLibrary = useStore(s => s.toggleLibrary)
  const showLibrary = useStore(s => s.showLibrary)
  const toggleExportDialog = useStore(s => s.toggleExportDialog)
  const multiSelect = useStore(s => s.multiSelect)
  const toggleMultiSelect = useStore(s => s.toggleMultiSelect)
  const snapToGrid = useStore(s => s.snapToGrid)
  const toggleSnapToGrid = useStore(s => s.toggleSnapToGrid)
  const halfField = useStore(s => s.halfField)
  const toggleHalfField = useStore(s => s.toggleHalfField)
  const showVision = useStore(s => s.showVision)
  const toggleVision = useStore(s => s.toggleVision)
  const fitCanvas = useStore(s => s.fitCanvas)
  const history = useStore(s => s.history)
  const future = useStore(s => s.future)
  const undo = useStore(s => s.undo)
  const redo = useStore(s => s.redo)
  const exportPNG = useStore(s => s.exportPNG)
  const setShowHelp = useStore(s => s.setShowHelp)

  // Modo compacto: en pantallas angostas se oculta el texto de marca
  const [narrow, setNarrow] = useState(window.innerWidth < 1500)
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 1500)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const [shared, setShared] = useState(false)
  const [shareDialogUrl, setShareDialogUrl] = useState<string | null>(null)
  const [urlCopied, setUrlCopied] = useState(false)
  const plays = useStore(s => s.plays)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Muestra "Guardando…" → "✓ Guardado" cada vez que cambia el estado de jugadas.
  useEffect(() => {
    setSaveState('saving')
    const t1 = setTimeout(() => {
      setSaveState('saved')
      const t2 = setTimeout(() => setSaveState('idle'), 1500)
      return () => clearTimeout(t2)
    }, 400) // 100ms después del debounce de persistencia
    return () => clearTimeout(t1)
  }, [plays])

  const handleShare = async () => {
    const state = useStore.getState()
    const play = state.plays.find(p => p.id === state.currentPlayId)
    if (!play) return
    const url = buildShareUrl(play)

    // Web Share API (móvil): abre el menú nativo → WhatsApp, Telegram, etc.
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: play.name, url })
        setShared(true)
        setTimeout(() => setShared(false), 2000)
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return // usuario canceló
      }
    }

    // Escritorio: mostrar diálogo con la URL para copiar/compartir
    setShareDialogUrl(url)
  }

  const handleCopyShareUrl = async () => {
    if (!shareDialogUrl) return
    try {
      await navigator.clipboard.writeText(shareDialogUrl)
      setUrlCopied(true)
      setTimeout(() => setUrlCopied(false), 2000)
    } catch { /* sin acción */ }
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
  const currentPlay = plays.find(p => p.id === currentPlayId)

  // Restaura una copia editada a la versión original de la lista compartida
  const handleRestoreOriginal = async () => {
    const origin = currentPlay?.origin
    if (!currentPlay || !origin) return
    if (!confirm('¿Restaurar la versión compartida original? Tus cambios locales se pueden deshacer con Ctrl+Z.')) return
    try {
      const list = await api.getPublicPlaylist(origin.listId)
      const original = list.plays.find(p => p.id === origin.playId)
      if (!original) {
        alert('La jugada original ya no está en la lista compartida.')
        return
      }
      useStore.getState().replacePlayContent(currentPlay.id, original)
    } catch {
      alert('No se pudo obtener la lista compartida (¿fue eliminada o no hay conexión?).')
    }
  }

  return (
    <>
    <header style={{
      display: 'flex',
      alignItems: 'center',
      gap: 3,
      padding: '0 8px',
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
        {!narrow && <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
            color: 'var(--text)', letterSpacing: '0.8px', lineHeight: 1.1,
            textTransform: 'uppercase',
          }}>
            TacticsRugby
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'monospace', lineHeight: 1 }}>
            v{APP_VERSION}
          </div>
        </div>}
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
              {isActive && (
                <kbd style={{
                  fontSize: 9, fontFamily: 'monospace',
                  padding: '1px 4px', borderRadius: 3,
                  background: 'rgba(0,0,0,0.18)',
                  color: cfg.color,
                  letterSpacing: '0.3px',
                  border: `1px solid ${cfg.border}`,
                }}>{cfg.key}</kbd>
              )}
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
          {isRecording
            ? `Detener${recordingTimeOffset > 0 ? ` (${(recordingTimeOffset / 1000).toFixed(1)}s)` : ''}`
            : 'Grabar'}
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
      <ToggleBtn active={halfField} onClick={toggleHalfField} title="Mostrar solo la mitad atacante del campo">½ Cancha</ToggleBtn>
      <ToggleBtn active={showVision} onClick={toggleVision} title="Cono de visión: hacia dónde mira cada jugador. Seleccioná un jugador y arrastrá la manija para rotarlo">Visión</ToggleBtn>

      <Divider />

      {/* View */}
      <GhostBtn onClick={fitCanvas} title="Centrar campo — tecla F">Centrar</GhostBtn>

      <Divider />

      {/* Speech Bubbles */}
      <SpeechBubbleInput />

      {/* Save / sync indicator — ancho reservado para no mover la barra */}
      <span style={{
        fontSize: 11,
        minWidth: 80,
        textAlign: 'right',
        color: syncStatus === 'error' ? 'var(--red)' : saveState === 'saved' ? 'var(--green)' : 'var(--text-dim)',
        whiteSpace: 'nowrap',
        transition: 'color 0.2s',
        flexShrink: 0,
      }}>
        {syncStatus === 'syncing' ? '↑ Sincronizando…'
          : syncStatus === 'error' ? '⚠ Sin conexión'
          : saveState === 'saving' ? 'Guardando…'
          : saveState === 'saved' ? '✓ Guardado'
          : ''}
      </span>

      <Divider />

      {/* Biblioteca + menú de salida */}
      <GhostBtn
        onClick={toggleLibrary}
        style={{ color: showLibrary ? 'var(--accent)' : undefined }}
        title="Ver todas mis jugadas guardadas"
      >Jugadas</GhostBtn>
      <DropMenu
        label={shared ? '¡Enlace copiado!' : 'Compartir'}
        title="Compartir y exportar la jugada"
        highlight={shared}
        items={[
          { label: 'Copiar enlace', title: 'El enlace contiene toda la jugada — no necesita servidor', onClick: handleShare },
          {
            label: 'Lista de reproducción…',
            title: 'Armá una lista de jugadas y compartila con un link que se reproduce en la app',
            onClick: () => {
              if (user) useStore.getState().togglePlaylistDialog()
              else onShowAuth()
            },
          },
          ...(exportPNG ? [{ label: 'Descargar imagen PNG', onClick: exportPNG }] : []),
          { label: 'Exportar / importar JSON', onClick: toggleExportDialog },
        ]}
      />
      <DropMenu
        label="⋯"
        title="Más acciones"
        items={[
          ...(currentPlay?.origin ? [{
            label: 'Restaurar versión compartida',
            title: 'Vuelve esta copia al estado original de la lista de la que vino',
            onClick: handleRestoreOriginal,
          }] : []),
          {
            label: 'Espejar jugada',
            title: 'Refleja horizontalmente posiciones y rutas',
            onClick: () => { if (currentPlayId) useStore.getState().mirrorPlay(currentPlayId) },
          },
          {
            label: 'Borrar rutas de movimiento',
            title: 'Elimina todas las trayectorias grabadas; los jugadores quedan donde están',
            onClick: () => { if (currentPlayId) useStore.getState().resetMovements(currentPlayId) },
          },
          {
            label: 'Reiniciar jugada…',
            title: 'Vuelve posiciones y rutas al estado inicial',
            danger: true,
            onClick: () => {
              if (currentPlayId && confirm('¿Reiniciar la jugada completa?'))
                useStore.getState().resetPlay(currentPlayId)
            },
          },
        ]}
      />

      <Divider />

      {/* Usuario / Auth */}
      <GhostBtn
        onClick={() => setShowHelp(true)}
        title="Ayuda y atajos de teclado (?)"
        style={{ fontSize: 13, padding: '4px 7px' }}
      >?</GhostBtn>

      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--green)', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            ● {user.username}
          </span>
          <button onClick={logout} style={{ ...dangerBtnBase, fontSize: 10 }} title="Cerrar sesión">Salir</button>
        </div>
      ) : (
        <button
          onClick={onShowAuth}
          title="Iniciar sesión para sincronizar jugadas entre dispositivos"
          style={{ ...ghostBase, color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.4)', whiteSpace: 'nowrap' }}
        >
          Iniciar sesión
        </button>
      )}

    </header>

    {/* Diálogo compartir por URL */}
    {shareDialogUrl && (
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onClick={() => setShareDialogUrl(null)}
      >
        <div
          style={{
            background: 'var(--panel-alt)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
            width: 460,
            maxWidth: '90vw',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            fontFamily: 'sans-serif',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Compartir jugada</span>
            <button
              onClick={() => setShareDialogUrl(null)}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18 }}
            >✕</button>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>
            Este enlace contiene toda la jugada. Pegalo en el navegador para abrirla, o compartilo por WhatsApp / Telegram.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              readOnly
              value={shareDialogUrl}
              onFocus={e => e.target.select()}
              style={{
                flex: 1,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: '#aaa',
                fontSize: 11,
                padding: '6px 10px',
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            />
            <button
              onClick={handleCopyShareUrl}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                background: urlCopied ? 'rgba(63,185,80,0.15)' : 'rgba(var(--accent-rgb),0.12)',
                color: urlCopied ? 'var(--green)' : 'var(--accent)',
                border: `1px solid ${urlCopied ? 'rgba(63,185,80,0.4)' : 'rgba(var(--accent-rgb),0.3)'}`,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {urlCopied ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface DropMenuItem {
  label: string
  title?: string
  danger?: boolean
  onClick: () => void
}

/** Botón que despliega un menú anclado debajo; cierra al elegir o al hacer
 *  clic afuera (overlay fijo transparente). */
const DropMenu: React.FC<{
  label: React.ReactNode
  title?: string
  highlight?: boolean
  items: DropMenuItem[]
}> = ({ label, title, highlight, items }) => {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={title}
        style={{
          ...ghostBase,
          background: open ? 'var(--panel-hover)' : 'transparent',
          color: highlight ? 'var(--green)' : open ? 'var(--text)' : 'var(--text-muted)',
        }}
      >{label}</button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 1500 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 1501,
            minWidth: 200,
            background: 'var(--panel-alt)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 4,
            boxShadow: '0 10px 28px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.12s ease',
          }}>
            {items.map((item, i) => (
              <button
                key={i}
                title={item.title}
                onClick={() => { setOpen(false); item.onClick() }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--panel-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'transparent',
                  color: item.danger ? 'var(--red)' : 'var(--text)',
                  fontSize: 12,
                  border: 'none',
                  whiteSpace: 'nowrap',
                }}
              >{item.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const Divider: React.FC = () => (
  <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 2px', flexShrink: 0 }} />
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
    background: active ? 'rgba(var(--accent-rgb),0.12)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    border: `1px solid ${active ? 'rgba(var(--accent-rgb),0.3)' : 'var(--border)'}`,
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
  padding: '4px 8px',
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

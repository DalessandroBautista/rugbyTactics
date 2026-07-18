import React, { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { useAuth } from '../store/useAuth'
import { api } from '../utils/api'
import { buildPlaylistUrl } from '../utils/share'
import { PlaylistMeta } from '../types'

type Tab = 'create' | 'mine'

/**
 * Crear y administrar listas de reproducción compartibles. Las listas viven en
 * el servidor como snapshot: quien recibe el link las reproduce en la app sin
 * necesitar cuenta, y tus jugadas originales nunca se modifican.
 */
export const PlaylistDialog: React.FC = () => {
  const show = useStore(s => s.showPlaylistDialog)
  const toggle = useStore(s => s.togglePlaylistDialog)
  const plays = useStore(s => s.plays)
  const { user } = useAuth()

  const [tab, setTab] = useState<Tab>('create')
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdUrl, setCreatedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [mine, setMine] = useState<PlaylistMeta[] | null>(null)

  // Al abrir: resetear y precargar mis listas
  useEffect(() => {
    if (!show) return
    setTab('create')
    setName('')
    setSelected(new Set(plays.map(p => p.id)))
    setError(null)
    setCreatedUrl(null)
    setMine(null)
    if (user) api.listPlaylists().then(setMine).catch(() => setMine([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  if (!show) return null

  const togglePlay = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreate = async () => {
    const chosen = plays.filter(p => selected.has(p.id))
    if (!name.trim() || chosen.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const { id } = await api.createPlaylist(name.trim(), chosen)
      setCreatedUrl(buildPlaylistUrl(id))
      api.listPlaylists().then(setMine).catch(() => {})
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const handleCopy = async (url: string, key: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(key)
      setTimeout(() => setCopied(null), 1800)
    } catch { /* sin acción */ }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta lista? El link dejará de funcionar.')) return
    try {
      await api.deletePlaylist(id)
      setMine(m => (m ?? []).filter(l => l.id !== id))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) toggle() }}>
      <div style={dialog}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Listas de reproducción</span>
          <button onClick={toggle} style={closeBtn}>✕</button>
        </div>

        {!user ? (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Iniciá sesión para crear listas: se guardan en el servidor y generan un
            link corto que cualquiera puede abrir y reproducir en la app, sin cuenta.
          </p>
        ) : (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
              {([['create', 'Crear lista'], ['mine', `Mis listas${mine ? ` (${mine.length})` : ''}`]] as [Tab, string][]).map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12, fontWeight: 600,
                    background: tab === t ? 'rgba(var(--accent-rgb),0.14)' : 'transparent',
                    color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                    border: `1px solid ${tab === t ? 'rgba(var(--accent-rgb),0.3)' : 'var(--border)'}`,
                  }}
                >{label}</button>
              ))}
            </div>

            {tab === 'create' && !createdUrl && (
              <>
                <label style={label}>Nombre de la lista</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej: Salidas de lineout — semana 12"
                  style={input}
                  autoFocus
                />
                <label style={{ ...label, marginTop: 12 }}>
                  Jugadas ({selected.size} de {plays.length})
                </label>
                <div style={playList}>
                  {plays.map(p => (
                    <label key={p.id} style={playRow}>
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => togglePlay(p.id)}
                      />
                      <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </span>
                      <span style={{ color: 'var(--text-dim)', fontSize: 10, marginLeft: 'auto', flexShrink: 0 }}>
                        {p.category}
                      </span>
                    </label>
                  ))}
                </div>
                {error && <p style={errorText}>{error}</p>}
                <button
                  onClick={handleCreate}
                  disabled={busy || !name.trim() || selected.size === 0}
                  style={primaryBtn}
                >
                  {busy ? 'Creando…' : `Crear lista con ${selected.size} jugada${selected.size === 1 ? '' : 's'}`}
                </button>
              </>
            )}

            {tab === 'create' && createdUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
                  ✓ Lista creada. Compartí este link:
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input readOnly value={createdUrl} onFocus={e => e.target.select()} style={{ ...input, fontFamily: 'monospace', fontSize: 11 }} />
                  <button onClick={() => handleCopy(createdUrl, 'new')} style={{ ...primaryBtn, width: 'auto', marginTop: 0, whiteSpace: 'nowrap' }}>
                    {copied === 'new' ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Quien lo abra verá la lista en modo reproducción y podrá editar copias
                  de las jugadas sin tocar tus originales.
                </p>
                <button onClick={() => { setCreatedUrl(null); setName('') }} style={ghostBtn}>Crear otra lista</button>
              </div>
            )}

            {tab === 'mine' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {mine === null && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)' }}>Cargando…</p>}
                {mine !== null && mine.length === 0 && (
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    Todavía no creaste ninguna lista.
                  </p>
                )}
                {(mine ?? []).map(l => (
                  <div key={l.id} style={listRow}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                        {l.count} jugada{l.count === 1 ? '' : 's'} · {new Date(l.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', flexShrink: 0 }}>
                      <button onClick={() => handleCopy(buildPlaylistUrl(l.id), l.id)} style={ghostBtn}>
                        {copied === l.id ? '¡Copiado!' : 'Copiar link'}
                      </button>
                      <button onClick={() => handleDelete(l.id)} style={{ ...ghostBtn, color: 'var(--red)' }}>Eliminar</button>
                    </div>
                  </div>
                ))}
                {error && <p style={errorText}>{error}</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.6)',
  zIndex: 2000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const dialog: React.CSSProperties = {
  width: 480,
  maxWidth: '92vw',
  maxHeight: '80vh',
  overflowY: 'auto',
  background: 'var(--panel)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: 18,
}

const closeBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 16, cursor: 'pointer',
}

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 11, color: 'var(--text-dim)', fontWeight: 600,
  letterSpacing: '0.5px', textTransform: 'uppercase',
  marginBottom: 6,
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontSize: 12,
  outline: 'none',
  fontFamily: 'inherit',
}

const playList: React.CSSProperties = {
  display: 'flex', flexDirection: 'column',
  maxHeight: 220, overflowY: 'auto',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: 4,
  background: 'var(--panel-alt)',
}

const playRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '5px 8px',
  fontSize: 12,
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
}

const listRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '8px 10px',
  background: 'var(--panel-alt)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
}

const primaryBtn: React.CSSProperties = {
  width: '100%',
  marginTop: 14,
  padding: '9px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--accent)',
  color: '#1a1206',
  fontSize: 13, fontWeight: 700,
  border: 'none',
}

const ghostBtn: React.CSSProperties = {
  padding: '5px 10px',
  borderRadius: 'var(--radius-md)',
  background: 'transparent',
  color: 'var(--text-muted)',
  border: '1px solid var(--border)',
  fontSize: 11,
}

const errorText: React.CSSProperties = {
  margin: '8px 0 0', fontSize: 12, color: 'var(--red)',
}

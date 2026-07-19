import React, { useEffect, useState } from 'react'
import type { Play } from '../types'
import { ApiError, api, type PlayProposal } from '../utils/api'
import { useStore } from '../store/useStore'
import PlayMiniature from './PlayMiniature'

type Mode = 'closed' | 'send' | 'inbox'

export const ProposalsDialog: React.FC<{ onRequireAuth: () => void }> = ({ onRequireAuth }) => {
  const [mode, setMode] = useState<Mode>('closed')
  const [message, setMessage] = useState('')
  const [items, setItems] = useState<PlayProposal[]>([])
  const [listType, setListType] = useState<'inbox' | 'mine'>('inbox')
  const [selected, setSelected] = useState<PlayProposal | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const current = useStore(s => s.plays.find(play => play.id === s.currentPlayId))

  const loadList = async (type: 'inbox' | 'mine') => {
    setBusy(true); setError(null)
    setListType(type)
    try { setItems(type === 'inbox' ? await api.proposalInbox() : await api.myProposals()) } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  useEffect(() => {
    const open = (event: Event) => {
      const next = (event as CustomEvent<'send' | 'inbox'>).detail
      setMode(next); setSelected(null); setError(null); setMessage('')
      if (next === 'inbox') void loadList('inbox')
    }
    window.addEventListener('rugbytactics:proposals', open)
    return () => window.removeEventListener('rugbytactics:proposals', open)
  }, [])

  if (mode === 'closed') return null
  const close = () => setMode('closed')

  const submit = async () => {
    if (!current?.origin?.basePlay) return
    setBusy(true); setError(null)
    const proposed: Play = { ...structuredClone(current), id: current.origin.playId, origin: undefined }
    try {
      await api.submitProposal({
        listId: current.origin.listId,
        playId: current.origin.playId,
        baseData: current.origin.basePlay,
        proposedData: proposed,
        message,
      })
      alert('Propuesta enviada. El dueño puede aceptarla o rechazarla desde su bandeja.')
      close()
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { close(); onRequireAuth() }
      else setError((e as Error).message)
    } finally { setBusy(false) }
  }

  const review = async (proposal: PlayProposal, action: 'accept' | 'reject') => {
    setBusy(true); setError(null)
    try {
      if (action === 'reject') await api.rejectProposal(proposal.id)
      else {
        try { await api.acceptProposal(proposal.id) }
        catch (e) {
          if (!(e instanceof ApiError) || !e.body.conflict || !confirm('Tu original cambió desde que llegó esta propuesta. ¿Aplicarla igualmente?')) throw e
          await api.acceptProposal(proposal.id, true)
        }
        const local = useStore.getState().plays.find(play => play.id === proposal.playId)
        if (local) useStore.getState().replacePlayContent(local.id, proposal.proposedData)
      }
      await loadList('inbox'); setSelected(null)
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  return <div style={overlay} onClick={e => { if (e.target === e.currentTarget) close() }}>
    <section role="dialog" aria-modal="true" aria-label="Propuestas de cambios" style={dialog}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><div style={eyebrow}>COLABORACIÓN</div><h2 style={title}>{mode === 'send' ? 'Proponer cambios' : 'Bandeja de propuestas'}</h2></div>
        <button onClick={close} style={ghost}>✕</button>
      </header>
      {mode === 'send' && current?.origin?.basePlay ? <>
        <p style={copy}>Mandás una propuesta; el original no cambia hasta que su dueño la acepte.</p>
        <div style={compare}>
          <Preview label="BASE COMPARTIDA" play={current.origin.basePlay} />
          <Preview label="TU VERSIÓN" play={{ ...current, id: current.origin.playId }} />
        </div>
        <textarea value={message} maxLength={500} onChange={e => setMessage(e.target.value)} placeholder="Contale qué cambiaste (opcional)" style={textarea} />
        <button disabled={busy} onClick={submit} style={primary}>{busy ? 'Enviando…' : 'Enviar propuesta'}</button>
      </> : mode === 'send' ? <p style={copy}>Esta jugada no conserva un origen compartido válido.</p> : <>
        <div style={{ display: 'flex', gap: 6, margin: '12px 0' }}>
          <button onClick={() => void loadList('inbox')} style={{ ...ghost, color: listType === 'inbox' ? 'var(--accent)' : 'var(--text-muted)', borderColor: listType === 'inbox' ? 'var(--accent)' : 'var(--border)' }}>Recibidas</button>
          <button onClick={() => void loadList('mine')} style={{ ...ghost, color: listType === 'mine' ? 'var(--accent)' : 'var(--text-muted)', borderColor: listType === 'mine' ? 'var(--accent)' : 'var(--border)' }}>Enviadas</button>
        </div>
        {busy && items.length === 0 ? <p style={copy}>Cargando…</p> : items.length === 0 ? <p style={copy}>No tenés propuestas todavía.</p> :
          <div style={{ display: 'grid', gap: 7 }}>{items.map(item => <button key={item.id} onClick={() => setSelected(item)} style={{ ...row, borderColor: selected?.id === item.id ? 'var(--accent)' : 'var(--border)' }}>
            <span><strong>{item.proposedData.name}</strong><small>{item.proposerEmail ?? 'Colaborador'} · {new Date(item.createdAt).toLocaleDateString()}</small></span>
            <b style={{ color: item.status === 'pending' ? 'var(--accent)' : 'var(--text-dim)' }}>{item.status === 'pending' ? 'PENDIENTE' : item.status.toUpperCase()}</b>
          </button>)}</div>}
        {selected && <div style={{ marginTop: 14 }}>
          <div style={compare}><Preview label="BASE" play={selected.baseData} /><Preview label="PROPUESTA" play={selected.proposedData} /></div>
          <p style={copy}>{selected.message || 'Sin mensaje.'}</p>
          <p style={summary}>{describe(selected)}</p>
          {listType === 'inbox' && selected.status === 'pending' && <div style={{ display: 'flex', gap: 8 }}><button disabled={busy} onClick={() => review(selected, 'reject')} style={ghost}>Rechazar</button><button disabled={busy} onClick={() => review(selected, 'accept')} style={primary}>Aceptar cambios</button></div>}
        </div>}
      </>}
      {error && <p style={{ ...copy, color: 'var(--red)' }}>{error}</p>}
    </section>
  </div>
}

const Preview = ({ label, play }: { label: string; play: Play }) => <div style={{ flex: 1 }}><div style={eyebrow}>{label}</div><PlayMiniature play={play} width={190} height={95} /><div style={{ color: 'var(--text)', fontSize: 12, marginTop: 5 }}>{play.name}</div></div>
const describe = (p: PlayProposal) => [...p.summary.metadata, `${p.summary.playersMoved} jugadores movidos`, `${p.summary.trajectoriesChanged} rutas cambiadas`, ...(p.summary.ballChanged ? ['pelota modificada'] : []), ...(p.summary.tacticalElementsChanged ? ['elementos tácticos modificados'] : [])].join(' · ')
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 2300, background: 'rgba(4,7,6,.78)', display: 'grid', placeItems: 'center' }
const dialog: React.CSSProperties = { width: 560, maxWidth: '94vw', maxHeight: '86vh', overflow: 'auto', background: 'var(--panel)', border: '1px solid var(--border)', borderTop: '3px solid var(--accent)', padding: 20, borderRadius: 8, boxShadow: '0 24px 70px #000' }
const title: React.CSSProperties = { margin: '2px 0 0', color: 'var(--text)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: 20 }
const eyebrow: React.CSSProperties = { color: 'var(--accent)', font: '700 9px monospace', letterSpacing: 1.4, marginBottom: 5 }
const copy: React.CSSProperties = { color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5 }
const compare: React.CSSProperties = { display: 'flex', gap: 14, margin: '14px 0' }
const textarea: React.CSSProperties = { width: '100%', minHeight: 72, padding: 10, color: 'var(--text)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 5, resize: 'vertical' }
const primary: React.CSSProperties = { padding: '8px 13px', background: 'var(--accent)', color: '#171006', border: 0, borderRadius: 5, fontWeight: 800, marginLeft: 'auto' }
const ghost: React.CSSProperties = { padding: '7px 11px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 5 }
const row: React.CSSProperties = { width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: 'var(--panel-alt)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 5, fontSize: 10 }
const summary: React.CSSProperties = { ...copy, fontFamily: 'monospace', color: 'var(--accent)' }

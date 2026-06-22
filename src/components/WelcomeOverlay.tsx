import React, { useState } from 'react'

const STORAGE_KEY = 'tr_onboarded_v1'

const MODES = [
  { key: 'S', label: 'Seleccionar', desc: 'Elegí jugadores. Arrastrá en el campo para selección múltiple.', color: 'var(--mode-select)' },
  { key: 'M', label: 'Mover', desc: 'Reposicioná jugadores y la pelota arrastrándolos.', color: 'var(--mode-move)' },
  { key: 'R', label: 'Grabar', desc: 'Arrastrá para registrar el recorrido y animar la jugada.', color: 'var(--mode-record)' },
]

const SHORTCUTS = [
  { k: 'Espacio', d: 'Reproducir / pausar' },
  { k: 'P', d: 'Modo presentación' },
  { k: 'F', d: 'Centrar el campo' },
  { k: 'Ctrl+Z', d: 'Deshacer' },
]

export const WelcomeOverlay: React.FC = () => {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === null } catch { return false }
  })

  if (!open) return null

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
    setOpen(false)
  }

  return (
    <div style={styles.backdrop} onClick={dismiss}>
      <div style={styles.card} onClick={e => e.stopPropagation()}>
        <div style={styles.brandRow}>
          <div style={styles.logo}>TR</div>
          <div>
            <h1 style={styles.h1}>TacticsRugby</h1>
            <p style={styles.tagline}>Diseñá, animá y compartí jugadas como en una pizarra táctica.</p>
          </div>
        </div>

        <div style={styles.sectionLabel}>LOS TRES MODOS</div>
        <div style={styles.modes}>
          {MODES.map(m => (
            <div key={m.key} style={styles.modeRow}>
              <span style={{ ...styles.modeKey, color: m.color, borderColor: m.color }}>{m.key}</span>
              <div>
                <div style={{ ...styles.modeLabel, color: m.color }}>{m.label}</div>
                <div style={styles.modeDesc}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.sectionLabel}>ATAJOS ÚTILES</div>
        <div style={styles.shortcuts}>
          {SHORTCUTS.map(s => (
            <div key={s.k} style={styles.scRow}>
              <kbd style={styles.kbd}>{s.k}</kbd>
              <span style={styles.scDesc}>{s.d}</span>
            </div>
          ))}
        </div>

        <button style={styles.cta} onClick={dismiss}>Empezar a diseñar</button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 2000,
    background: 'rgba(8,11,15,0.72)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
    animation: 'fadeIn 0.2s ease-out',
  },
  card: {
    width: 'min(520px, 100%)',
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: 26,
    boxShadow: '0 24px 70px rgba(0,0,0,0.55)',
  },
  brandRow: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 },
  logo: {
    width: 44, height: 44, borderRadius: 10,
    background: 'var(--accent)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 900, fontSize: 16, letterSpacing: '-1px', flexShrink: 0,
  },
  h1: { fontSize: 21, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.4px', margin: 0 },
  tagline: { fontSize: 13, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4 },
  sectionLabel: {
    fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
    letterSpacing: '1.2px', marginBottom: 10, marginTop: 4,
  },
  modes: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 },
  modeRow: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  modeKey: {
    width: 26, height: 26, borderRadius: 6,
    border: '1.5px solid', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'monospace', fontWeight: 700, fontSize: 13,
    background: 'rgba(255,255,255,0.02)',
  },
  modeLabel: { fontSize: 13, fontWeight: 700, marginBottom: 1 },
  modeDesc: { fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 },
  shortcuts: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px',
    marginBottom: 26,
  },
  scRow: { display: 'flex', alignItems: 'center', gap: 8 },
  kbd: {
    fontFamily: 'monospace', fontSize: 10, fontWeight: 600,
    padding: '2px 6px', borderRadius: 4,
    background: 'var(--panel-alt)', color: 'var(--text-muted)',
    border: '1px solid var(--border)', flexShrink: 0,
  },
  scDesc: { fontSize: 12, color: 'var(--text-muted)' },
  cta: {
    width: '100%', padding: '11px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent)', color: '#fff',
    fontSize: 14, fontWeight: 600, border: 'none',
  },
}

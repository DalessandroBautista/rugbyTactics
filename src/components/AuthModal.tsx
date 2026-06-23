import React, { useState } from 'react'
import { useAuth } from '../store/useAuth'

interface Props {
  onClose: () => void
}

export const AuthModal: React.FC<Props> = ({ onClose }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { login, register, loading, error, clearError } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (tab === 'login') await login(username, password)
      else await register(username, password)
      onClose()
    } catch { /* error mostrado por el store */ }
  }

  const switchTab = (t: 'login' | 'register') => {
    setTab(t)
    clearError()
    setUsername('')
    setPassword('')
  }

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={styles.card}>
        <div style={styles.tabs}>
          <button
            onClick={() => switchTab('login')}
            style={{ ...styles.tab, ...(tab === 'login' ? styles.tabActive : {}) }}
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => switchTab('register')}
            style={{ ...styles.tab, ...(tab === 'register' ? styles.tabActive : {}) }}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Usuario
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="mi_usuario"
              autoFocus
              autoComplete={tab === 'login' ? 'username' : 'new-password'}
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={tab === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              style={styles.input}
            />
          </label>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            style={{ ...styles.btn, opacity: loading || !username.trim() || !password ? 0.5 : 1 }}
          >
            {loading ? 'Cargando…' : tab === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 12, textAlign: 'center' }}>
          Tus jugadas se sincronizan automáticamente entre dispositivos.
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.65)',
    zIndex: 2000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  card: {
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 28,
    width: 340,
    maxWidth: '90vw',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 20,
    background: 'var(--panel-alt)',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    padding: '6px 0',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    background: 'transparent',
    color: 'var(--text-muted)',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
  },
  tabActive: {
    background: 'var(--panel)',
    color: 'var(--text)',
    fontWeight: 700,
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-muted)' },
  input: {
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--panel-alt)',
    color: 'var(--text)',
    fontSize: 13,
    outline: 'none',
  },
  error: {
    margin: 0,
    padding: '8px 10px',
    borderRadius: 6,
    background: 'rgba(248,81,73,0.12)',
    border: '1px solid rgba(248,81,73,0.3)',
    color: 'var(--red)',
    fontSize: 12,
  },
  btn: {
    padding: '9px 0',
    borderRadius: 7,
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    marginTop: 4,
    transition: 'opacity 0.15s',
  },
}

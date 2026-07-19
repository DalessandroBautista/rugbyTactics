import React, { useEffect, useReducer, useRef, useState } from 'react'
import { useAuth } from '../store/useAuth'
import { api } from '../utils/api'
import { authFlowReducer, initialAuthFlow, type AuthPurpose } from '../utils/authFlow'

interface Props {
  onClose: () => void
}

interface CodeInputProps {
  value: string
  onChange: (code: string) => void
}

const CodeInput: React.FC<CodeInputProps> = ({ value, onChange }) => {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? '')

  const update = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    onChange(next.join(''))
    if (digit && index < 5) refs.current[index + 1]?.focus()
  }

  return (
    <div
      style={styles.codeRow}
      onPaste={event => {
        const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
        if (pasted.length === 6) {
          event.preventDefault()
          onChange(pasted)
          refs.current[5]?.focus()
        }
      }}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={element => { refs.current[index] = element }}
          aria-label={'Dígito ' + (index + 1)}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          onChange={event => update(index, event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Backspace' && !digit && index > 0) refs.current[index - 1]?.focus()
          }}
          style={styles.codeInput}
          autoFocus={index === 0}
        />
      ))}
    </div>
  )
}

export const AuthModal: React.FC<Props> = ({ onClose }) => {
  const [flow, dispatch] = useReducer(authFlowReducer, initialAuthFlow)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const login = useAuth(state => state.login)
  const setSession = useAuth(state => state.setSession)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setInterval(() => setResendIn(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendIn])

  const run = async (operation: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await operation()
    } catch (caught) {
      setError((caught as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const requestCode = async (purpose: AuthPurpose) => {
    const result = purpose === 'register'
      ? await api.requestRegisterCode(flow.email || email)
      : purpose === 'login'
        ? await api.requestLoginCode(flow.email || email)
        : await api.requestResetCode(flow.email || email)
    dispatch({
      type: 'CODE_REQUESTED',
      email: flow.email || email,
      purpose,
      challengeId: result.challengeId,
    })
    setCode('')
    setResendIn(60)
  }

  const verifyCode = async () => {
    if (!flow.challengeId || !flow.purpose || code.length !== 6) return
    if (flow.purpose === 'login') {
      const session = await api.verifyLoginCode(flow.challengeId, code)
      setSession(session)
      onClose()
      return
    }
    const result = flow.purpose === 'register'
      ? await api.verifyRegisterCode(flow.challengeId, code)
      : await api.verifyResetCode(flow.challengeId, code)
    dispatch({ type: 'CODE_VERIFIED', flowToken: result.flowToken })
    setPassword('')
    setConfirmPassword('')
  }

  const completePassword = async () => {
    if (!flow.flowToken) return
    if (password.length < 10) throw new Error('La contraseña debe tener al menos 10 caracteres')
    if (password !== confirmPassword) throw new Error('Las contraseñas no coinciden')
    const session = flow.step === 'set-password'
      ? await api.completeRegistration(flow.flowToken, password)
      : await api.completePasswordReset(flow.flowToken, password)
    setSession(session)
    onClose()
  }

  const back = () => {
    setError(null)
    setPassword('')
    setCode('')
    if (flow.step === 'login' || flow.step === 'code') {
      dispatch({ type: 'RESET' })
      return
    }
    dispatch({ type: 'EMAIL_CONTINUED', email: flow.email })
  }

  return (
    <div
      style={styles.overlay}
      onClick={event => { if (event.target === event.currentTarget) onClose() }}
      onKeyDown={event => { if (event.key === 'Escape') onClose() }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="auth-title" style={styles.card}>
        <div style={styles.pitchStripe} />
        <button onClick={onClose} aria-label="Cerrar" style={styles.close}>×</button>
        <div style={styles.brand}>
          <span style={styles.mark}>RT</span>
          <div>
            <div style={styles.eyebrow}>RUGBYTACTICS · ACCESO</div>
            <h2 id="auth-title" style={styles.title}>
              {flow.step === 'email' ? 'Entrá a tu pizarra'
                : flow.step === 'login' ? 'Bienvenido de vuelta'
                : flow.step === 'code' ? 'Revisá tu email'
                : flow.step === 'set-password' ? 'Protegé tu cuenta'
                : 'Nueva contraseña'}
            </h2>
          </div>
        </div>

        {flow.step === 'email' && (
          <form
            style={styles.form}
            onSubmit={event => {
              event.preventDefault()
              if (email.trim()) dispatch({ type: 'EMAIL_CONTINUED', email: email.trim().toLowerCase() })
            }}
          >
            <label style={styles.label}>
              Email
              <input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="entrenador@club.com"
                autoComplete="email"
                autoFocus
                required
                style={styles.input}
              />
            </label>
            <button type="submit" disabled={!email.trim()} style={styles.primary}>Continuar</button>
            <p style={styles.hint}>Tus jugadas, listas y propuestas sincronizadas en todos tus dispositivos.</p>
          </form>
        )}

        {flow.step === 'login' && (
          <form
            style={styles.form}
            onSubmit={event => {
              event.preventDefault()
              run(async () => { await login(flow.email, password); onClose() })
            }}
          >
            <div style={styles.emailPill}>{flow.email}</div>
            <label style={styles.label}>
              Contraseña
              <input
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                style={styles.input}
              />
            </label>
            {error && <p role="alert" style={styles.error}>{error}</p>}
            <button type="submit" disabled={busy || !password} style={styles.primary}>Entrar</button>
            <button type="button" onClick={() => run(() => requestCode('login'))} disabled={busy} style={styles.secondary}>
              Usar un código
            </button>
            <div style={styles.splitActions}>
              <button type="button" onClick={() => run(() => requestCode('register'))} disabled={busy} style={styles.link}>
                Crear cuenta
              </button>
              <button type="button" onClick={() => run(() => requestCode('reset'))} disabled={busy} style={styles.link}>
                Olvidé mi contraseña
              </button>
            </div>
            <button type="button" onClick={back} style={styles.back}>← Cambiar email</button>
          </form>
        )}

        {flow.step === 'code' && (
          <div style={styles.form}>
            <p style={styles.copy}>Ingresá el código de seis dígitos enviado a <strong>{flow.email}</strong>.</p>
            <CodeInput value={code} onChange={setCode} />
            {error && <p role="alert" style={styles.error}>{error}</p>}
            <button onClick={() => run(verifyCode)} disabled={busy || code.length !== 6} style={styles.primary}>
              Verificar código
            </button>
            <button
              onClick={() => flow.purpose && run(() => requestCode(flow.purpose!))}
              disabled={busy || resendIn > 0}
              style={styles.secondary}
            >
              {resendIn > 0 ? 'Reenviar en ' + resendIn + 's' : 'Reenviar código'}
            </button>
            <button onClick={back} style={styles.back}>← Volver</button>
          </div>
        )}

        {(flow.step === 'set-password' || flow.step === 'reset-password') && (
          <form
            style={styles.form}
            onSubmit={event => { event.preventDefault(); run(completePassword) }}
          >
            <p style={styles.copy}>Usá una frase de al menos 10 caracteres que no reutilices en otros servicios.</p>
            <label style={styles.label}>
              Nueva contraseña
              <input
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                autoComplete="new-password"
                autoFocus
                style={styles.input}
              />
            </label>
            <label style={styles.label}>
              Confirmar contraseña
              <input
                type="password"
                value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                style={styles.input}
              />
            </label>
            {error && <p role="alert" style={styles.error}>{error}</p>}
            <button type="submit" disabled={busy || !password || !confirmPassword} style={styles.primary}>
              {flow.step === 'set-password' ? 'Crear cuenta' : 'Guardar contraseña'}
            </button>
            <button type="button" onClick={back} style={styles.back}>← Volver</button>
          </form>
        )}
      </section>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 2400,
    display: 'grid', placeItems: 'center',
    background: 'rgba(4,8,5,0.78)',
    backdropFilter: 'blur(6px)',
    padding: 18,
  },
  card: {
    position: 'relative',
    width: 410, maxWidth: '94vw',
    overflow: 'hidden',
    padding: '30px 30px 26px',
    background: 'linear-gradient(145deg, var(--panel-alt), var(--panel))',
    border: '1px solid #3c493d',
    borderRadius: 14,
    boxShadow: '0 28px 90px rgba(0,0,0,0.58), inset 0 1px rgba(255,255,255,0.03)',
  },
  pitchStripe: {
    position: 'absolute', inset: '0 auto 0 0', width: 5,
    background: 'repeating-linear-gradient(180deg, var(--accent) 0 22px, #77551d 22px 25px)',
  },
  close: {
    position: 'absolute', top: 12, right: 14,
    background: 'transparent', color: 'var(--text-dim)', fontSize: 24, lineHeight: 1,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 13, marginBottom: 24 },
  mark: {
    width: 42, height: 42, display: 'grid', placeItems: 'center',
    borderRadius: 10, background: 'var(--accent)', color: '#171006',
    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18,
    transform: 'rotate(-2deg)',
  },
  eyebrow: {
    color: 'var(--accent)', fontFamily: 'monospace', fontSize: 10,
    letterSpacing: '1.3px', marginBottom: 2,
  },
  title: {
    margin: 0, color: 'var(--text)', fontFamily: 'var(--font-display)',
    fontSize: 26, lineHeight: 1, letterSpacing: '0.3px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  label: {
    display: 'flex', flexDirection: 'column', gap: 6,
    color: 'var(--text-muted)', fontSize: 11, fontWeight: 700,
    letterSpacing: '0.5px', textTransform: 'uppercase',
  },
  input: {
    width: '100%', padding: '11px 12px',
    border: '1px solid var(--border)', borderRadius: 7,
    background: '#0d120f', color: 'var(--text)',
    fontSize: 14, outline: 'none',
  },
  primary: {
    padding: '11px 14px', borderRadius: 7,
    background: 'var(--accent)', color: '#171006',
    fontSize: 13, fontWeight: 800,
  },
  secondary: {
    padding: '9px 14px', borderRadius: 7,
    background: 'transparent', color: 'var(--text)',
    border: '1px solid var(--border)', fontWeight: 600,
  },
  splitActions: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  link: { background: 'transparent', color: 'var(--accent)', fontSize: 11, padding: 2 },
  back: { alignSelf: 'flex-start', background: 'transparent', color: 'var(--text-dim)', padding: '4px 0', fontSize: 11 },
  hint: { margin: '2px 0 0', color: 'var(--text-dim)', fontSize: 11, lineHeight: 1.55 },
  copy: { margin: 0, color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6 },
  emailPill: {
    padding: '7px 10px', borderRadius: 6,
    background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.18)',
    color: 'var(--accent)', fontFamily: 'monospace', fontSize: 11,
  },
  codeRow: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 7 },
  codeInput: {
    minWidth: 0, height: 48, textAlign: 'center',
    background: '#0d120f', color: 'var(--accent)',
    border: '1px solid var(--border)', borderRadius: 7,
    fontFamily: 'monospace', fontWeight: 800, fontSize: 22,
    outline: 'none',
  },
  error: {
    margin: 0, padding: '9px 10px', borderRadius: 6,
    background: 'rgba(229,84,75,0.1)', border: '1px solid rgba(229,84,75,0.25)',
    color: 'var(--red)', fontSize: 11, lineHeight: 1.45,
  },
}

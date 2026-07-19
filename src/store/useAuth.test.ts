import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from './useAuth'

describe('useAuth email sessions', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuth.setState({ user: null, loading: false, error: null })
    vi.restoreAllMocks()
  })

  it('logs in with email and password through the new endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      token: 'session-token',
      user: { id: 9, email: 'coach@example.com' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    await useAuth.getState().login('coach@example.com', 'una contraseña segura')

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login/password', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'coach@example.com', password: 'una contraseña segura' }),
    }))
    expect(useAuth.getState().user?.email).toBe('coach@example.com')
    expect(localStorage.getItem('tr_token')).toBe('session-token')
  })

  it('accepts a session returned by code or registration flows', () => {
    useAuth.getState().setSession({
      token: 'code-session',
      user: { id: 3, email: 'analyst@example.com' },
    })

    expect(useAuth.getState().user?.email).toBe('analyst@example.com')
    expect(localStorage.getItem('tr_token')).toBe('code-session')
  })
})

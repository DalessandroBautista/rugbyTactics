import { create } from 'zustand'
import { api, type AuthSession, type AuthUser } from '../utils/api'

interface AuthStore {
  user: AuthUser | null
  loading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  setSession: (session: AuthSession) => void
  logout: () => void
  checkAuth: () => Promise<void>
  clearError: () => void
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { token, user } = await api.login(email, password)
      localStorage.setItem('tr_token', token)
      set({ user, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
      throw e
    }
  },

  setSession: ({ token, user }) => {
    localStorage.setItem('tr_token', token)
    set({ user, loading: false, error: null })
  },

  logout: () => {
    localStorage.removeItem('tr_token')
    set({ user: null, error: null })
  },

  checkAuth: async () => {
    if (!localStorage.getItem('tr_token')) return
    try {
      const { user } = await api.me()
      set({ user })
    } catch {
      localStorage.removeItem('tr_token')
    }
  },

  clearError: () => set({ error: null }),
}))

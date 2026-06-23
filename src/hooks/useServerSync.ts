import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { useAuth } from '../store/useAuth'
import { api } from '../utils/api'
import type { Play } from '../types'

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

/**
 * Sincroniza jugadas con el servidor cuando el usuario está autenticado.
 * - Al hacer login: fetch del servidor y merge con estado local.
 * - Cuando cambian las jugadas: sync al servidor con debounce de 1.5s.
 * - Si no hay red o el servidor falla: sigue funcionando con localStorage.
 */
export function useServerSync(): SyncStatus {
  const user = useAuth(s => s.user)
  const plays = useStore(s => s.plays)
  const [status, setStatus] = useState<SyncStatus>('idle')
  const syncedUserId = useRef<number | null>(null)

  // Al hacer login (cambia user.id): hacer sync inicial que también trae jugadas del servidor
  useEffect(() => {
    if (!user) { syncedUserId.current = null; return }
    if (syncedUserId.current === user.id) return
    syncedUserId.current = user.id

    setStatus('syncing')
    const localPlays = useStore.getState().plays
    api.syncPlays(localPlays)
      .then((serverPlays: Play[]) => {
        useStore.getState().setPlaysFromServer(serverPlays)
        setStatus('idle')
      })
      .catch(() => setStatus('error'))
  }, [user?.id])

  // Al cambiar jugadas (si ya está logueado): sync con debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!user || syncedUserId.current !== user.id) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setStatus('syncing')
      api.syncPlays(plays)
        .then(() => setStatus('idle'))
        .catch(() => setStatus('error'))
    }, 1500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [plays, user])

  return status
}

import { Play } from '../types'

const STORAGE_KEY = 'tactics-rugby-plays'
const CURRENT_PLAY_KEY = 'tactics-rugby-current-play'
const SAVE_DEBOUNCE_MS = 300

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingPlays: Play[] | null = null

// Mientras el visor de listas compartidas está abierto, la biblioteca local se
// reemplaza temporalmente por las jugadas de la lista: suspender la escritura
// evita pisar las jugadas propias del usuario.
let suspended = false

export function suspendPersistence(value: boolean): void {
  suspended = value
  if (value) {
    // Descartar cualquier escritura pendiente del estado anterior
    if (saveTimer !== null) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    pendingPlays = null
  }
}

function writePlays(plays: Play[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plays))
  } catch (e) {
    console.error('Failed to save plays:', e)
  }
}

/**
 * Guarda con debounce: agrupa ráfagas de cambios (por ejemplo durante un drag)
 * en una sola escritura a localStorage cada SAVE_DEBOUNCE_MS. El último estado
 * pendiente se persiste con flushPlays() (ver beforeunload, abajo).
 */
export function savePlays(plays: Play[]): void {
  if (suspended) return
  pendingPlays = plays
  if (saveTimer !== null) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    if (pendingPlays) {
      writePlays(pendingPlays)
      pendingPlays = null
    }
  }, SAVE_DEBOUNCE_MS)
}

/** Fuerza la escritura del estado pendiente de inmediato. */
export function flushPlays(): void {
  if (saveTimer !== null) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (pendingPlays) {
    writePlays(pendingPlays)
    pendingPlays = null
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPlays)
}

export function loadPlays(): Play[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveCurrentPlayId(id: string): void {
  if (suspended) return
  try {
    localStorage.setItem(CURRENT_PLAY_KEY, id)
  } catch {
    // ignore
  }
}

export function loadCurrentPlayId(): string | null {
  try {
    return localStorage.getItem(CURRENT_PLAY_KEY)
  } catch {
    return null
  }
}

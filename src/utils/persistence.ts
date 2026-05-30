import { Play } from '../types'

const STORAGE_KEY = 'tactics-rugby-plays'
const CURRENT_PLAY_KEY = 'tactics-rugby-current-play'

export function savePlays(plays: Play[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plays))
  } catch (e) {
    console.error('Failed to save plays:', e)
  }
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

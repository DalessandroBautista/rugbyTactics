import { beforeEach, describe, expect, it } from 'vitest'
import { loadCurrentPlayId, loadPlays } from './persistence'

describe('RugbyTactics persistence migration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('copies plays from the legacy key to the RugbyTactics key', () => {
    const legacyPlays = [{ id: 'legacy-play', name: 'Legacy' }]
    localStorage.setItem('tactics-rugby-plays', JSON.stringify(legacyPlays))

    expect(loadPlays()).toEqual(legacyPlays)
    expect(localStorage.getItem('rugby-tactics-plays')).toBe(JSON.stringify(legacyPlays))
    expect(localStorage.getItem('tactics-rugby-plays')).toBe(JSON.stringify(legacyPlays))
  })

  it('copies the current play id from the legacy key', () => {
    localStorage.setItem('tactics-rugby-current-play', 'legacy-play')

    expect(loadCurrentPlayId()).toBe('legacy-play')
    expect(localStorage.getItem('rugby-tactics-current-play')).toBe('legacy-play')
  })
})

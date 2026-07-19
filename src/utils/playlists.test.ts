import { describe, expect, it } from 'vitest'
import type { Play } from '../types'
import { movePlaylistItem, refreshPlaylistSnapshots } from './playlists'

const play = (id: string, name: string): Play => ({
  id, name, description: '', category: 'General', createdAt: '', players: [],
  ball: { x: 0, y: 0, carriedBy: null, trajectory: [], size: 6 }, duration: 1000,
})

describe('playlist editing helpers', () => {
  it('reorders without mutating the snapshots', () => {
    const original = [play('a', 'A'), play('b', 'B'), play('c', 'C')]
    expect(movePlaylistItem(original, 2, 0).map(item => item.id)).toEqual(['c', 'a', 'b'])
    expect(original.map(item => item.id)).toEqual(['a', 'b', 'c'])
  })

  it('refreshes existing plays and preserves deleted local plays as snapshots', () => {
    const snapshots = [play('a', 'Vieja A'), play('missing', 'Snapshot preservado')]
    const result = refreshPlaylistSnapshots(snapshots, [play('a', 'Nueva A')])
    expect(result.plays.map(item => item.name)).toEqual(['Nueva A', 'Snapshot preservado'])
    expect(result.missingIds).toEqual(['missing'])
  })
})

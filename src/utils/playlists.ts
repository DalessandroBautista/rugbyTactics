import type { Play } from '../types'

export function movePlaylistItem(plays: Play[], from: number, to: number): Play[] {
  if (from < 0 || to < 0 || from >= plays.length || to >= plays.length || from === to) return [...plays]
  const next = [...plays]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export function refreshPlaylistSnapshots(snapshots: Play[], library: Play[]): { plays: Play[]; missingIds: string[] } {
  const byId = new Map(library.map(play => [play.id, play]))
  const missingIds: string[] = []
  return {
    plays: snapshots.map(snapshot => {
      const current = byId.get(snapshot.id)
      if (!current) missingIds.push(snapshot.id)
      return current ? structuredClone(current) : snapshot
    }),
    missingIds,
  }
}

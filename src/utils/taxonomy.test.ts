import { describe, expect, it } from 'vitest'
import { migrateCategory, migratePlayTaxonomy, normalizeTags } from './taxonomy'
import type { Play } from '../types'

describe('taxonomy', () => {
  it('migrates legacy categories to RugbyTactics categories', () => {
    expect(migrateCategory('Attack')).toEqual({ category: 'Ataque', extraTags: [] })
    expect(migrateCategory('Defense')).toEqual({ category: 'Defensa', extraTags: [] })
    expect(migrateCategory('Kick')).toEqual({ category: 'Patada', extraTags: [] })
    expect(migrateCategory('Backline')).toEqual({ category: 'Ataque', extraTags: ['backline'] })
  })

  it('normalizes, deduplicates and limits tags', () => {
    const tags = normalizeTags(['  Mitad   de Cancha ', 'mitad de cancha', 'ATAQUE', '', 'x'.repeat(31)])

    expect(tags).toEqual(['mitad de cancha', 'ataque'])
  })

  it('migrates a play category and merges its existing tags', () => {
    const legacy = { category: 'Backline', tags: [' MITAD de cancha '] } as Play
    expect(migratePlayTaxonomy(legacy)).toMatchObject({ category: 'Ataque', tags: ['mitad de cancha', 'backline'] })
  })
})

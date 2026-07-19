const CATEGORY_MIGRATIONS: Record<string, { category: string; extraTags: string[] }> = {
  Attack: { category: 'Ataque', extraTags: [] },
  Defense: { category: 'Defensa', extraTags: [] },
  Kick: { category: 'Patada', extraTags: [] },
  Backline: { category: 'Ataque', extraTags: ['backline'] },
}

export function migrateCategory(category: string): { category: string; extraTags: string[] } {
  return CATEGORY_MIGRATIONS[category] ?? { category, extraTags: [] }
}

export function normalizeTags(tags: string[]): string[] {
  const normalized: string[] = []
  const seen = new Set<string>()

  for (const rawTag of tags) {
    const tag = rawTag.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es')
    if (!tag || tag.length > 30 || seen.has(tag)) continue
    seen.add(tag)
    normalized.push(tag)
    if (normalized.length === 12) break
  }

  return normalized
}

export function migratePlayTaxonomy(play: Play): Play {
  const migrated = migrateCategory(play.category)
  const tags = normalizeTags([...(play.tags ?? []), ...migrated.extraTags])
  return {
    ...play,
    ...(migrated.category ? { category: migrated.category } : {}),
    ...(play.tags !== undefined || tags.length > 0 ? { tags } : {}),
  }
}
import type { Play } from '../types'

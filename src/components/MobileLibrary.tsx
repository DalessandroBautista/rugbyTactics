import React, { useMemo, useState } from 'react'
import type { Play, PlaylistMeta } from '../types'

interface Props {
  plays: Play[]
  playlists?: PlaylistMeta[]
  onView: (id: string) => void
  onEdit: (id: string) => void
  onViewPlaylist?: (id: string) => void
  onPropose?: (id: string) => void
  onAccount?: () => void
  accountLabel?: string
  onDesktop: () => void
}

export const MobileLibrary: React.FC<Props> = ({ plays, playlists = [], onView, onEdit, onViewPlaylist, onPropose, onAccount, accountLabel = 'Iniciar sesión', onDesktop }) => {
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const tags = useMemo(() => Array.from(new Set(plays.flatMap(play => play.tags ?? []))).slice(0, 8), [plays])
  const filtered = plays.filter(play => {
    const term = search.trim().toLocaleLowerCase('es')
    const haystack = [play.name, play.description, play.category, ...(play.tags ?? [])].join(' ').toLocaleLowerCase('es')
    return (!term || haystack.includes(term)) && (!activeTag || play.tags?.includes(activeTag))
  })

  return <main className="mobile-library">
    <header className="mobile-library__header">
      <div><span className="mobile-kicker">RUGBYTACTICS</span><h1>Tus jugadas</h1></div>
      <div className="mobile-library__header-actions">{onAccount && <button className="mobile-icon-button" onClick={onAccount} aria-label={accountLabel}>●</button>}<button className="mobile-icon-button" onClick={onDesktop} aria-label="Abrir editor completo">PC</button></div>
    </header>

    <section className="mobile-library__tools" aria-label="Buscar y filtrar">
      <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar jugada, categoría o etiqueta" />
      {tags.length > 0 && <div className="mobile-tag-row">
        <button className={!activeTag ? 'is-active' : ''} onClick={() => setActiveTag(null)}>Todas</button>
        {tags.map(tag => <button key={tag} className={activeTag === tag ? 'is-active' : ''} onClick={() => setActiveTag(activeTag === tag ? null : tag)}>{tag}</button>)}
      </div>}
    </section>

    {playlists.length > 0 && <section className="mobile-section">
      <div className="mobile-section__heading"><span>LISTAS</span><small>{playlists.length}</small></div>
      <div className="mobile-list-strip">{playlists.map(list => <button key={list.id} className="mobile-playlist-card" onClick={() => onViewPlaylist?.(list.id)}>
        <span className="mobile-playlist-card__icon">▶▶</span><strong>{list.name}</strong><small>{list.count} jugadas</small>
      </button>)}</div>
    </section>}

    <section className="mobile-section">
      <div className="mobile-section__heading"><span>JUGADAS</span><small>{filtered.length}</small></div>
      <div className="mobile-play-grid">
        {filtered.map(play => <article className="mobile-play-card" key={play.id}>
          <div className="mobile-play-card__pitch" aria-hidden="true"><i /><i /><i /><b>RT</b></div>
          <div className="mobile-play-card__body">
            <span className="mobile-play-card__category">{play.category}</span>
            <h2>{play.name}</h2>
            <p>{play.description || `${Math.round(play.duration / 1000)} segundos`}</p>
            <div className="mobile-play-card__actions">
              <button className="mobile-primary" onClick={() => onView(play.id)} aria-label={`Ver ${play.name}`}>▶ Ver</button>
              <button className="mobile-secondary" onClick={() => onEdit(play.id)} aria-label={`Editar ${play.name}`}>✎ Editar</button>
            </div>
            {play.origin && onPropose && <button className="mobile-propose" onClick={() => onPropose(play.id)} aria-label={`Proponer cambios de ${play.name}`}>↗ Proponer cambios</button>}
          </div>
        </article>)}
      </div>
      {filtered.length === 0 && <div className="mobile-empty"><b>Sin resultados</b><span>Probá otra búsqueda o etiqueta.</span></div>}
    </section>
  </main>
}

import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { PLAY_CATEGORIES, TAG_PRESETS, type Play } from '../types'
import { normalizeTags } from '../utils/taxonomy'
import { FieldCanvas } from './FieldCanvas'

export const MobileQuickEditor: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const play = useStore(state => state.plays.find(item => item.id === state.currentPlayId))
  const snapshot = useRef<Play | null>(play ? structuredClone(play) : null)
  const [name, setName] = useState(play?.name ?? '')
  const [description, setDescription] = useState(play?.description ?? '')
  const [category, setCategory] = useState(play?.category ?? 'General')
  const [tags, setTags] = useState(play?.tags ?? [])
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    const previous = useStore.getState().editMode
    useStore.getState().setEditMode('move')
    useStore.getState().fitCanvas()
    return () => useStore.getState().setEditMode(previous)
  }, [])

  if (!play) return null
  const save = () => {
    useStore.getState().updatePlay(play.id, { name: name.trim() || play.name, description: description.trim(), category })
    useStore.getState().updatePlayTags(play.id, tags)
    onExit()
  }
  const cancel = () => {
    if (snapshot.current) useStore.getState().replacePlayContent(play.id, snapshot.current)
    onExit()
  }
  const toggleTag = (tag: string) => setTags(current => normalizeTags(current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag]))

  return <main className="mobile-quick-editor">
    <header className="mobile-quick-editor__header">
      <button onClick={cancel} aria-label="Cancelar edición">✕</button>
      <div><span>EDICIÓN RÁPIDA</span><h1>{name || play.name}</h1></div>
      <button className="mobile-quick-editor__save" onClick={save} aria-label="Guardar cambios">Guardar</button>
    </header>
    <section className="mobile-quick-editor__field" aria-label="Campo editable"><FieldCanvas /></section>
    <section className={`mobile-quick-editor__sheet ${detailsOpen ? 'is-open' : ''}`}>
      <button className="mobile-quick-editor__handle" onClick={() => setDetailsOpen(!detailsOpen)} aria-expanded={detailsOpen}><i />{detailsOpen ? 'Ocultar datos' : 'Nombre y etiquetas'}</button>
      <p className="mobile-quick-editor__hint">Arrastrá jugadores o pelota · pellizcá para acercar</p>
      {detailsOpen && <div className="mobile-quick-editor__form">
        <label>Nombre<input aria-label="Nombre" value={name} onChange={event => setName(event.target.value)} /></label>
        <label>Descripción<textarea aria-label="Descripción" value={description} onChange={event => setDescription(event.target.value)} /></label>
        <label>Categoría<select aria-label="Categoría" value={category} onChange={event => setCategory(event.target.value)}>{PLAY_CATEGORIES.map(item => <option key={item}>{item}</option>)}</select></label>
        <div><span className="mobile-quick-editor__label">Etiquetas</span><div className="mobile-quick-editor__tags">{TAG_PRESETS.map(tag => <button key={tag} className={tags.includes(tag) ? 'is-active' : ''} onClick={() => toggleTag(tag)}>{tag}</button>)}</div></div>
      </div>}
    </section>
  </main>
}

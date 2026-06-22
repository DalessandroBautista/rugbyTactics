import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { PLAY_CATEGORIES } from '../types'
import PlayMiniature from './PlayMiniature'

export const PlayLibrary: React.FC = () => {
  const plays = useStore(s => s.plays)
  const currentPlayId = useStore(s => s.currentPlayId)
  const setCurrentPlay = useStore(s => s.setCurrentPlay)
  const createPlay = useStore(s => s.createPlay)
  const duplicatePlay = useStore(s => s.duplicatePlay)
  const deletePlay = useStore(s => s.deletePlay)
  const updatePlay = useStore(s => s.updatePlay)
  const updatePlayTags = useStore(s => s.updatePlayTags)
  const reorderPlays = useStore(s => s.reorderPlays)
  const showLibrary = useStore(s => s.showLibrary)
  const toggleLibrary = useStore(s => s.toggleLibrary)

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterTag, setFilterTag] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('General')
  const [newDescription, setNewDescription] = useState('')
  const [editingName, setEditingName] = useState<string | null>(null)
  const [editNameValue, setEditNameValue] = useState('')
  const [editingTags, setEditingTags] = useState<string | null>(null)
  const [editTagsValue, setEditTagsValue] = useState('')

  // Drag and drop state
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  if (!showLibrary) return null

  const filtered = plays.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      (p.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()))
    const matchesCategory = filterCategory === 'All' || p.category === filterCategory
    const matchesTag = !filterTag || (p.tags || []).includes(filterTag)
    return matchesSearch && matchesCategory && matchesTag
  })

  // Collect all unique tags
  const allTags = Array.from(new Set(plays.flatMap(p => p.tags || [])))

  const handleCreate = () => {
    if (!newName.trim()) return
    createPlay(newName.trim(), newDescription.trim(), newCategory)
    setNewName('')
    setNewDescription('')
    setNewCategory('General')
    setShowNewForm(false)
  }

  const handleNameSave = (id: string) => {
    if (editNameValue.trim()) {
      updatePlay(id, { name: editNameValue.trim() })
    }
    setEditingName(null)
  }

  const handleTagsSave = (id: string) => {
    const tags = editTagsValue.split(',').map(t => t.trim()).filter(Boolean)
    updatePlayTags(id, tags)
    setEditingTags(null)
  }

  const handleDragStart = (idx: number) => setDragIdx(idx)
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    reorderPlays(dragIdx, idx)
    setDragIdx(idx)
  }
  const handleDragEnd = () => setDragIdx(null)

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) toggleLibrary() }}
    >
      <div style={{
        width: '750px',
        maxWidth: '90vw',
        maxHeight: '85vh',
        background: '#1e1e32',
        borderRadius: '12px',
        border: '1px solid #3a3a4e',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #3a3a4e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Biblioteca de Jugadas</h2>
          <button onClick={toggleLibrary} style={{
            background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '20px',
          }}>✕</button>
        </div>

        <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', borderBottom: '1px solid #3a3a4e', flexWrap: 'wrap' }}>
          <input
            placeholder="Buscar jugadas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={inputStyle}
          />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            style={selectStyle}
          >
            <option value="All">Todas las categorías</option>
            {PLAY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            style={{
              padding: '8px 16px',
              background: '#2ecc71',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px',
              whiteSpace: 'nowrap',
            }}
          >
            + Nueva Jugada
          </button>
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div style={{ padding: '8px 16px', display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: '1px solid #3a3a4e' }}>
            <span style={{ fontSize: 10, color: '#666', marginRight: 4, alignSelf: 'center' }}>Tags:</span>
            <button
              onClick={() => setFilterTag('')}
              style={{
                ...tagChipStyle,
                background: !filterTag ? 'rgba(88,166,255,0.25)' : 'rgba(255,255,255,0.08)',
                color: !filterTag ? '#58a6ff' : '#888',
                border: `1px solid ${!filterTag ? '#58a6ff' : 'transparent'}`,
              }}
            >
              Todos
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
                style={{
                  ...tagChipStyle,
                  background: filterTag === tag ? 'rgba(88,166,255,0.25)' : 'rgba(255,255,255,0.08)',
                  color: filterTag === tag ? '#58a6ff' : '#888',
                  border: `1px solid ${filterTag === tag ? '#58a6ff' : 'transparent'}`,
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {showNewForm && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #3a3a4e', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              placeholder="Nombre de la jugada"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={inputStyle}
              autoFocus
            />
            <input
              placeholder="Descripción (opcional)"
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={selectStyle}>
                {PLAY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={handleCreate} disabled={!newName.trim()} style={{
                padding: '8px 16px',
                background: '#3498db',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
                opacity: newName.trim() ? 1 : 0.5,
              }}>
                Crear
              </button>
            </div>
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
              No se encontraron jugadas. Creá una nueva para empezar.
            </div>
          ) : (
            filtered.map((play, idx) => (
              <div
                key={play.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                onClick={() => setCurrentPlay(play.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: currentPlayId === play.id ? '#2a2a4e' : 'transparent',
                  border: currentPlayId === play.id ? '1px solid #3498db' : '1px solid transparent',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.1s',
                  opacity: dragIdx === idx ? 0.5 : 1,
                }}
              >
                {/* Miniature */}
                <PlayMiniature play={play} width={48} height={34} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingName === play.id ? (
                    <input
                      value={editNameValue}
                      onChange={e => setEditNameValue(e.target.value)}
                      onBlur={() => handleNameSave(play.id)}
                      onKeyDown={e => { if (e.key === 'Enter') handleNameSave(play.id) }}
                      style={{ ...inputStyle, padding: '2px 6px', fontSize: '13px' }}
                      autoFocus
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <div
                      style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        setEditingName(play.id)
                        setEditNameValue(play.name)
                      }}
                    >
                      {play.name}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                    {play.category} · {new Date(play.createdAt).toLocaleDateString()}
                  </div>
                  {/* Tags display */}
                  {play.tags && play.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }}>
                      {play.tags.map(tag => (
                        <span key={tag} style={miniTagStyle}>{tag}</span>
                      ))}
                    </div>
                  )}
                  {/* Tags edit */}
                  {editingTags === play.id ? (
                    <input
                      value={editTagsValue}
                      onChange={e => setEditTagsValue(e.target.value)}
                      onBlur={() => handleTagsSave(play.id)}
                      onKeyDown={e => { if (e.key === 'Enter') handleTagsSave(play.id) }}
                      style={{ ...inputStyle, padding: '2px 6px', fontSize: '11px', marginTop: 3 }}
                      placeholder="tag1, tag2, ..."
                      autoFocus
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <div
                      style={{ fontSize: 10, color: '#555', marginTop: 2, cursor: 'text' }}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        setEditingTags(play.id)
                        setEditTagsValue((play.tags || []).join(', '))
                      }}
                    >
                      + tags
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); duplicatePlay(play.id) }}
                    style={actionButtonStyle}
                    title="Duplicar"
                  >
                    📋
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deletePlay(play.id) }}
                    style={{ ...actionButtonStyle, opacity: plays.length <= 1 ? 0.3 : 1 }}
                    title="Eliminar"
                    disabled={plays.length <= 1}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  border: '1px solid #3a3a4e',
  borderRadius: '6px',
  background: '#2a2a3e',
  color: '#fff',
  fontSize: '13px',
  outline: 'none',
}

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #3a3a4e',
  borderRadius: '6px',
  background: '#2a2a3e',
  color: '#fff',
  fontSize: '13px',
  outline: 'none',
}

const actionButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  padding: '4px',
  borderRadius: '4px',
}

const tagChipStyle: React.CSSProperties = {
  padding: '2px 8px',
  borderRadius: '12px',
  fontSize: 10,
  fontWeight: 600,
  cursor: 'pointer',
}

const miniTagStyle: React.CSSProperties = {
  fontSize: 9,
  padding: '1px 5px',
  borderRadius: '3px',
  background: 'rgba(88,166,255,0.12)',
  color: '#58a6ff',
}

import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { PLAY_CATEGORIES } from '../types'

export const PlayLibrary: React.FC = () => {
  const plays = useStore(s => s.plays)
  const currentPlayId = useStore(s => s.currentPlayId)
  const setCurrentPlay = useStore(s => s.setCurrentPlay)
  const createPlay = useStore(s => s.createPlay)
  const duplicatePlay = useStore(s => s.duplicatePlay)
  const deletePlay = useStore(s => s.deletePlay)
  const updatePlay = useStore(s => s.updatePlay)
  const showLibrary = useStore(s => s.showLibrary)
  const toggleLibrary = useStore(s => s.toggleLibrary)

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('General')
  const [newDescription, setNewDescription] = useState('')
  const [editingName, setEditingName] = useState<string | null>(null)
  const [editNameValue, setEditNameValue] = useState('')

  if (!showLibrary) return null

  const filtered = plays.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = filterCategory === 'All' || p.category === filterCategory
    return matchesSearch && matchesCategory
  })

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
        width: '700px',
        maxWidth: '90vw',
        maxHeight: '80vh',
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
          <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Play Library</h2>
          <button onClick={toggleLibrary} style={{
            background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '20px',
          }}>✕</button>
        </div>

        <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', borderBottom: '1px solid #3a3a4e' }}>
          <input
            placeholder="Search plays..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={inputStyle}
          />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            style={selectStyle}
          >
            <option value="All">All Categories</option>
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
            + New Play
          </button>
        </div>

        {showNewForm && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #3a3a4e', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              placeholder="Play name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={inputStyle}
              autoFocus
            />
            <input
              placeholder="Description (optional)"
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
                Create
              </button>
            </div>
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
              No plays found. Create a new play to get started.
            </div>
          ) : (
            filtered.map(play => (
              <div
                key={play.id}
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
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '14px',
                  flexShrink: 0,
                }}>
                  {play.players.length}
                </div>
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
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); duplicatePlay(play.id) }}
                    style={actionButtonStyle}
                    title="Duplicate"
                  >
                    📋
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deletePlay(play.id) }}
                    style={{ ...actionButtonStyle, opacity: plays.length <= 1 ? 0.3 : 1 }}
                    title="Delete"
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

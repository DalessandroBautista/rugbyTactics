import React, { useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { Player, FIELD_PX, SCALE, rugbyPosition } from '../types'

export const Sidebar: React.FC = () => {
  const plays = useStore(s => s.plays)
  const currentPlayId = useStore(s => s.currentPlayId)
  const selectedPlayerId = useStore(s => s.selectedPlayerId)
  const selectedPlayerIds = useStore(s => s.selectedPlayerIds)
  const selectedBall = useStore(s => s.selectedBall)
  const editMode = useStore(s => s.editMode)
  const setSelectedPlayer = useStore(s => s.setSelectedPlayer)
  const setSelectedBall = useStore(s => s.setSelectedBall)
  const movePlayer = useStore(s => s.movePlayer)
  const setBallCarrier = useStore(s => s.setBallCarrier)
  const clearPlayerTrajectory = useStore(s => s.clearPlayerTrajectory)
  const clearBallTrajectory = useStore(s => s.clearBallTrajectory)
  const addOpponentPlayer = useStore(s => s.addOpponentPlayer)
  const removePlayer = useStore(s => s.removePlayer)
  const updatePlayer = useStore(s => s.updatePlayer)
  const setPlayDuration = useStore(s => s.setPlayDuration)
  const setOverlayImage = useStore(s => s.setOverlayImage)
  const updateOverlayImage = useStore(s => s.updateOverlayImage)
  const clearOverlayImage = useStore(s => s.clearOverlayImage)
  const addZone = useStore(s => s.addZone)
  const removeZone = useStore(s => s.removeZone)

  // Los hooks deben llamarse siempre en el mismo orden, antes de cualquier return
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selectedColorInputRef = useRef<HTMLInputElement>(null)

  const play = plays.find(p => p.id === currentPlayId)
  if (!play) return null

  const homePlayers = play.players.filter(p => p.team === 'home')
  const awayPlayers = play.players.filter(p => p.team === 'away')
  const selectedPlayer = selectedPlayerId !== null
    ? play.players.find(p => p.id === selectedPlayerId)
    : null
  const multiSelected = selectedPlayerIds.length > 1

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataURL = ev.target?.result as string
      setOverlayImage(dataURL)
    }
    reader.readAsDataURL(file)
  }

  const hintColor =
    editMode === 'record' ? 'var(--mode-record)' :
    editMode === 'move'   ? 'var(--mode-move)' :
    'var(--text-dim)'

  return (
    <aside style={styles.sidebar}>

      {/* Play info */}
      <div style={styles.section}>
        <div style={styles.playName}>{play.name}</div>
        <div style={styles.playMeta}>{play.category} · {new Date(play.createdAt).toLocaleDateString()}</div>
        {play.tags && play.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {play.tags.map(tag => (
              <span key={tag} style={styles.tagChip}>{tag}</span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Duración</span>
          <input
            type="number"
            min={1}
            max={120}
            step={1}
            value={Math.round(play.duration / 1000)}
            onChange={(e) => {
              const secs = parseFloat(e.target.value)
              if (!isNaN(secs)) setPlayDuration(play.id, secs * 1000)
            }}
            style={styles.durationInput}
          />
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>seg</span>
        </div>
      </div>

      {/* Home team */}
      <div style={{ ...styles.section, background: 'rgba(59,130,246,0.04)' }}>
        <SectionHeader label="Local" count={homePlayers.length} color="var(--home)" />
        <div style={styles.playerList}>
          {homePlayers.map(player => (
            <PlayerRow
              key={player.id}
              player={player}
              isSelected={selectedPlayerIds.includes(player.id)}
              onClick={() => setSelectedPlayer(player.id)}
              onNameChange={(name) => updatePlayer(player.id, { name })}
              onColorChange={(color) => updatePlayer(player.id, { color })}
            />
          ))}
        </div>
      </div>

      {/* Away team */}
      <div style={{ ...styles.section, background: 'rgba(239,68,68,0.04)' }}>
        <SectionHeader label="Visitante" count={awayPlayers.length} color="var(--away)" />
        <div style={styles.playerList}>
          {awayPlayers.map(player => (
            <PlayerRow
              key={player.id}
              player={player}
              isSelected={selectedPlayerIds.includes(player.id)}
              onClick={() => setSelectedPlayer(player.id)}
              onRemove={() => removePlayer(player.id)}
              onNameChange={(name) => updatePlayer(player.id, { name })}
              onColorChange={(color) => updatePlayer(player.id, { color })}
            />
          ))}
          {awayPlayers.length < 15 && (
            <button onClick={addOpponentPlayer} style={styles.addBtn}>
              + Agregar rival
            </button>
          )}
        </div>
      </div>

      {/* Ball */}
      <div style={styles.section}>
        <SectionHeader label="Pelota" color="#e3b341" />
        <div
          onClick={() => setSelectedBall(true)}
          style={{
            ...styles.ballRow,
            background: selectedBall ? 'rgba(227,179,65,0.12)' : 'transparent',
            borderColor: selectedBall ? 'var(--yellow)' : 'transparent',
          }}
        >
          <div style={styles.ballDot} />
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            {play.ball.carriedBy !== null ? `En manos del #${play.ball.carriedBy}` : 'Pelota libre'}
          </span>
          {play.ball.trajectory.length > 0 && (
            <span style={styles.pts}>{play.ball.trajectory.length}pts</span>
          )}
        </div>
      </div>

      {/* Selected entity detail */}
      {(selectedPlayer || selectedBall || multiSelected) && (
        <div style={{ ...styles.section, background: 'var(--panel-alt)', marginTop: 'auto' }}>
          <div style={styles.sectionLabel}>SELECCIONADO</div>

          {multiSelected && !selectedPlayer && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>
                {selectedPlayerIds.length} jugadores
              </p>
              <div style={styles.actionRow}>
                <SmallBtn
                  onClick={() => {
                    for (const pid of selectedPlayerIds) {
                      movePlayer(pid, FIELD_PX.width / 2, FIELD_PX.halfway - 5 * SCALE)
                    }
                  }}
                >
                  Pos. inicial grupal
                </SmallBtn>
                <SmallBtn
                  onClick={() => {
                    for (const pid of selectedPlayerIds) {
                      clearPlayerTrajectory(pid)
                    }
                  }}
                  danger
                >
                  Borrar rutas grupales
                </SmallBtn>
              </div>
            </div>
          )}

          {selectedPlayer && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{ ...styles.playerDot, background: selectedPlayer.color, cursor: 'pointer' }}
                  onClick={() => selectedColorInputRef.current?.click()}
                  title="Cambiar color"
                >
                  {selectedPlayer.number}
                  <input
                    ref={selectedColorInputRef}
                    type="color"
                    value={selectedPlayer.color}
                    onChange={(e) => updatePlayer(selectedPlayer.id, { color: e.target.value })}
                    style={{ display: 'none' }}
                  />
                </div>
                <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 13 }}>
                  #{selectedPlayer.number} · {selectedPlayer.team === 'away' ? 'Visitante' : 'Local'}
                </span>
              </div>
              <EditableName
                value={selectedPlayer.name || `Jugador ${selectedPlayer.number}`}
                onSave={(name) => updatePlayer(selectedPlayer.id, { name })}
              />
              {rugbyPosition(selectedPlayer.number) && (
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Puesto</span>
                  <span style={{ ...styles.metaValue, fontFamily: 'inherit' }}>
                    {rugbyPosition(selectedPlayer.number)}
                  </span>
                </div>
              )}
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Coordenadas</span>
                <span style={styles.metaValue}>
                  {(selectedPlayer.x / SCALE).toFixed(1)}m · {(selectedPlayer.y / SCALE).toFixed(1)}m
                </span>
              </div>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Trayectoria</span>
                <span style={styles.metaValue}>{selectedPlayer.trajectory.length} pts</span>
              </div>
              <div style={styles.actionRow}>
                <SmallBtn
                  onClick={() => movePlayer(selectedPlayer.id, FIELD_PX.width / 2, FIELD_PX.halfway - 5 * SCALE)}
                >
                  Pos. inicial
                </SmallBtn>
                {selectedPlayer.trajectory.length > 0 && (
                  <SmallBtn onClick={() => clearPlayerTrajectory(selectedPlayer.id)} danger>
                    Borrar ruta
                  </SmallBtn>
                )}
              </div>
              {selectedPlayer.team === 'home' && (
                <SmallBtn
                  onClick={() => setBallCarrier(play.ball.carriedBy === selectedPlayer.id ? null : selectedPlayer.id)}
                  accent={play.ball.carriedBy === selectedPlayer.id}
                >
                  {play.ball.carriedBy === selectedPlayer.id ? 'Soltar pelota' : 'Dar pelota'}
                </SmallBtn>
              )}
            </div>
          )}

          {selectedBall && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Trayectoria</span>
                <span style={styles.metaValue}>{play.ball.trajectory.length} pts</span>
              </div>
              {play.ball.trajectory.length > 0 && (
                <SmallBtn onClick={clearBallTrajectory} danger>Borrar ruta</SmallBtn>
              )}
            </div>
          )}
        </div>
      )}

      {/* Zones */}
      <div style={styles.section}>
        <SectionHeader label="Zonas" color="var(--accent)" />
        <div style={styles.actionRow}>
          <SmallBtn onClick={() => addZone({ shape: 'rect', x: FIELD_PX.width / 2, y: FIELD_PX.halfway, width: 100, height: 60, color: 'var(--accent)', label: 'Zona' })}>
            + Rect
          </SmallBtn>
          <SmallBtn onClick={() => addZone({ shape: 'circle', x: FIELD_PX.width / 2, y: FIELD_PX.halfway, radius: 40, color: '#f39c12', label: 'Zona' })}>
            + Circle
          </SmallBtn>
          <SmallBtn onClick={() => addZone({ shape: 'arrow', x: FIELD_PX.width / 2, y: FIELD_PX.halfway, color: '#3fb950' })}>
            + Flecha
          </SmallBtn>
        </div>
        {play.zones?.map(zone => (
          <div key={zone.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: zone.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 11, color: 'var(--text-muted)' }}>{zone.label || zone.shape}</span>
            <button onClick={() => removeZone(zone.id)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
          </div>
        ))}
      </div>

      {/* Overlay image */}
      <div style={styles.section}>
        <SectionHeader label="Imagen referencia" color="var(--text-dim)" />
        {play.overlayImage ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={styles.metaRow}>
              <span style={styles.metaLabel}>Opacidad</span>
              <span style={styles.metaValue}>{Math.round(play.overlayImage.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(play.overlayImage.opacity * 100)}
              onChange={(e) => updateOverlayImage({ opacity: parseInt(e.target.value) / 100 })}
              style={{ width: '100%' }}
            />
            <SmallBtn onClick={clearOverlayImage} danger>Quitar imagen</SmallBtn>
          </div>
        ) : (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            <SmallBtn onClick={() => fileInputRef.current?.click()}>Cargar imagen</SmallBtn>
          </>
        )}
      </div>

      {/* Status hint */}
      <div style={{ ...styles.hint, color: hintColor }}>
        {editMode === 'record'
          ? 'Seleccioná jugadores, luego G o Grabar'
          : editMode === 'move'
            ? 'Arrastrá para mover · Multi para selección grupal'
            : 'Click para seleccionar · Arrastrá para selección múltiple'}
      </div>
    </aside>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ label: string; count?: number; color?: string }> = ({ label, count, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
    {color && <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />}
    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '1px' }}>{label.toUpperCase()}</span>
    {count !== undefined && (
      <span style={{
        fontSize: 9, color: 'var(--text-dim)', marginLeft: 'auto',
        background: 'var(--panel-alt)', padding: '1px 6px', borderRadius: 10,
        fontFamily: 'monospace', letterSpacing: 0, border: '1px solid var(--border-subtle)',
      }}>{count}</span>
    )}
  </div>
)

const PlayerRow: React.FC<{
  player: Player
  isSelected: boolean
  onClick: () => void
  onRemove?: () => void
  onNameChange?: (name: string) => void
  onColorChange?: (color: string) => void
}> = ({ player, isSelected, onClick, onRemove, onNameChange, onColorChange }) => {
  const colorRef = useRef<HTMLInputElement>(null)
  const selBorder = player.team === 'home' ? 'rgba(59,130,246,0.35)' : 'rgba(239,68,68,0.35)'

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 6px',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        background: isSelected ? 'var(--panel-hover)' : 'transparent',
        border: `1px solid ${isSelected ? selBorder : 'transparent'}`,
        marginBottom: 2,
        transition: 'background 0.1s',
        minHeight: 30,
      }}
    >
      <div
        onClick={(e) => { e.stopPropagation(); colorRef.current?.click() }}
        style={{
          width: 24, height: 24,
          borderRadius: '50%',
          background: player.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: '#fff',
          flexShrink: 0,
          cursor: 'pointer',
          boxShadow: isSelected ? `0 0 0 2px ${player.color}55` : 'none',
          transition: 'box-shadow 0.1s',
        }}
        title="Cambiar color"
      >
        {player.number}
        <input
          ref={colorRef}
          type="color"
          value={player.color}
          onChange={(e) => onColorChange?.(e.target.value)}
          style={{ display: 'none' }}
        />
      </div>
      <span
        onDoubleClick={(e) => {
          e.stopPropagation()
          const name = prompt('Nombre del jugador:', player.name || `Jugador ${player.number}`)
          if (name !== null) onNameChange?.(name)
        }}
        style={{ flex: 1, fontSize: 12, color: isSelected ? 'var(--text)' : 'var(--text-muted)' }}
        title={rugbyPosition(player.number) ? `${rugbyPosition(player.number)} — doble clic para editar` : 'Doble clic para editar nombre'}
      >
        {player.name || `Jugador ${player.number}`}
      </span>
      {player.trajectory.length > 0 && (
        <span style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'monospace' }}>
          {player.trajectory.length}p
        </span>
      )}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          style={{
            width: 16, height: 16,
            borderRadius: '50%',
            background: 'transparent',
            color: 'var(--text-dim)',
            fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
            border: 'none',
            padding: 0,
          }}
          title="Quitar jugador"
        >×</button>
      )}
    </div>
  )
}

const EditableName: React.FC<{ value: string; onSave: (name: string) => void }> = ({ value, onSave }) => {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { setEditing(false); if (val.trim()) onSave(val.trim()) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { setEditing(false); if (val.trim()) onSave(val.trim()) }
          if (e.key === 'Escape') { setEditing(false); setVal(value) }
        }}
        style={styles.nameInput}
      />
    )
  }

  return (
    <div
      onDoubleClick={() => { setEditing(true); setVal(value) }}
      style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'text', padding: '2px 0' }}
      title="Doble clic para editar nombre"
    >
      {value}
    </div>
  )
}

const SmallBtn: React.FC<{
  onClick: () => void
  danger?: boolean
  accent?: boolean
  children: React.ReactNode
}> = ({ onClick, danger, accent, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '4px 10px',
      borderRadius: 'var(--radius-sm)',
      fontSize: 11,
      fontWeight: 500,
      background: danger ? 'rgba(248,81,73,0.12)' : accent ? 'rgba(var(--accent-rgb),0.12)' : 'var(--panel-alt)',
      color: danger ? 'var(--red)' : accent ? 'var(--accent)' : 'var(--text-muted)',
      border: `1px solid ${danger ? 'rgba(248,81,73,0.28)' : accent ? 'rgba(var(--accent-rgb),0.28)' : 'var(--border)'}`,
    }}
  >
    {children}
  </button>
)

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 224,
    minWidth: 224,
    background: 'var(--panel)',
    borderLeft: '1px solid var(--border)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  section: {
    padding: '10px 12px',
    borderBottom: '1px solid var(--border)',
  },
  playName: {
    fontWeight: 600,
    fontSize: 13,
    color: 'var(--text)',
    marginBottom: 3,
  },
  playMeta: {
    fontSize: 11,
    color: 'var(--text-dim)',
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: 'var(--text-dim)',
    letterSpacing: '1px',
    marginBottom: 8,
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
  },
  playerDot: {
    width: 24, height: 24,
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 700, color: '#fff',
    flexShrink: 0,
  },
  ballRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 6px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'background 0.1s',
    minHeight: 30,
  },
  ballDot: {
    width: 14, height: 10,
    borderRadius: '50%',
    background: '#f1c40f',
    border: '1px solid #c9a800',
    flexShrink: 0,
  },
  addBtn: {
    marginTop: 6,
    padding: '5px 8px',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    color: 'var(--away)',
    border: '1px dashed rgba(239,68,68,0.35)',
    fontSize: 11,
    width: '100%',
    textAlign: 'left',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
  },
  metaLabel: { color: 'var(--text-dim)' },
  metaValue: { color: 'var(--text-muted)', fontFamily: 'monospace' },
  actionRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  hint: {
    padding: '10px 12px',
    fontSize: 10,
    lineHeight: 1.5,
    marginTop: 'auto',
    borderTop: '1px solid var(--border)',
    transition: 'color 0.25s',
  },
  pts: {
    fontSize: 9,
    color: 'var(--text-dim)',
    marginLeft: 'auto',
    fontFamily: 'monospace',
  },
  tagChip: {
    fontSize: 9,
    padding: '1px 6px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(var(--accent-rgb),0.1)',
    color: 'var(--accent)',
    border: '1px solid rgba(var(--accent-rgb),0.22)',
  },
  nameInput: {
    fontSize: 12,
    color: 'var(--text)',
    background: 'var(--panel-alt)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '2px 4px',
    outline: 'none',
    width: '100%',
    fontFamily: 'inherit',
  },
  durationInput: {
    width: 52,
    fontSize: 12,
    color: 'var(--text)',
    background: 'var(--panel-alt)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '3px 6px',
    outline: 'none',
    fontFamily: 'monospace',
  },
}

import React from 'react'
import { useStore } from '../store/useStore'
import { FIELD_PX, SCALE } from '../types'

export const Sidebar: React.FC = () => {
  const plays = useStore(s => s.plays)
  const currentPlayId = useStore(s => s.currentPlayId)
  const selectedPlayerId = useStore(s => s.selectedPlayerId)
  const selectedBall = useStore(s => s.selectedBall)
  const editMode = useStore(s => s.editMode)
  const setSelectedPlayer = useStore(s => s.setSelectedPlayer)
  const setSelectedBall = useStore(s => s.setSelectedBall)
  const movePlayer = useStore(s => s.movePlayer)
  const setBallCarrier = useStore(s => s.setBallCarrier)
  const updatePlay = useStore(s => s.updatePlay)
  const clearPlayerTrajectory = useStore(s => s.clearPlayerTrajectory)
  const clearBallTrajectory = useStore(s => s.clearBallTrajectory)

  const play = plays.find(p => p.id === currentPlayId)

  if (!play) return null

  const selectedPlayer = selectedPlayerId !== null
    ? play.players.find(p => p.id === selectedPlayerId)
    : null

  return (
    <div style={{
      width: '240px',
      minWidth: '240px',
      background: '#1e1e32',
      borderLeft: '1px solid #3a3a4e',
      overflowY: 'auto',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      fontFamily: 'sans-serif',
    }}>
      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
        {play.name}
      </div>

      <div style={{ fontSize: '11px', color: '#888' }}>
        {play.category} · {new Date(play.createdAt).toLocaleDateString()}
      </div>

      <div style={{ borderTop: '1px solid #3a3a4e', paddingTop: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#aaa', marginBottom: '8px' }}>
          PLAYERS
        </div>
        {play.players.map(player => (
          <div
            key={player.id}
            onClick={() => { setSelectedPlayer(player.id); setSelectedBall(false) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              background: selectedPlayerId === player.id ? '#2a2a4e' : 'transparent',
              border: selectedPlayerId === player.id ? '1px solid #3498db' : '1px solid transparent',
              marginBottom: '4px',
              transition: 'all 0.1s',
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: player.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 'bold',
              flexShrink: 0,
            }}>
              {player.number}
            </div>
            <div style={{ flex: 1, fontSize: '12px', color: '#ccc' }}>
              Player {player.number}
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              {player.trajectory.length > 0 ? `${player.trajectory.length} pts` : ''}
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #3a3a4e', paddingTop: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#aaa', marginBottom: '8px' }}>
          BALL
        </div>
        <div
          onClick={() => { setSelectedBall(true); setSelectedPlayer(null) }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 8px',
            borderRadius: '6px',
            cursor: 'pointer',
            background: selectedBall ? '#2a2a4e' : 'transparent',
            border: selectedBall ? '1px solid #f1c40f' : '1px solid transparent',
            transition: 'all 0.1s',
          }}
        >
          <div style={{
            width: '20px',
            height: '14px',
            borderRadius: '50%',
            background: '#f1c40f',
            border: '1px solid #d4a017',
            flexShrink: 0,
          }} />
          <div style={{ fontSize: '12px', color: '#ccc' }}>
            {play.ball.carriedBy !== null
              ? `Carried by #${play.ball.carriedBy}`
              : 'Free ball'}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            {play.ball.trajectory.length > 0 ? `${play.ball.trajectory.length} pts` : ''}
          </div>
        </div>
      </div>

      {selectedPlayer && (
        <div style={{ borderTop: '1px solid #3a3a4e', paddingTop: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#aaa', marginBottom: '8px' }}>
            SELECTED: #{selectedPlayer.number}
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
            Position: ({Math.round(selectedPlayer.x)}, {Math.round(selectedPlayer.y)})
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
            Trajectory: {selectedPlayer.trajectory.length} points
          </div>
          <button
            onClick={() => {
              movePlayer(selectedPlayer.id, FIELD_PX.width / 2, FIELD_PX.halfway - 5 * SCALE)
            }}
            style={smallButtonStyle}
          >
            Reset Position
          </button>
          {selectedPlayer.trajectory.length > 0 && (
            <button
              onClick={() => clearPlayerTrajectory(selectedPlayer.id)}
              style={{ ...smallButtonStyle, background: '#c0392b' }}
            >
              Clear Trajectory
            </button>
          )}
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>Ball Carrier</div>
            <button
              onClick={() => {
                const currentBall = play.ball.carriedBy
                setBallCarrier(currentBall === selectedPlayer.id ? null : selectedPlayer.id)
              }}
              style={{
                ...smallButtonStyle,
                background: play.ball.carriedBy === selectedPlayer.id ? '#e67e22' : '#555',
              }}
            >
              {play.ball.carriedBy === selectedPlayer.id ? 'Drop Ball' : 'Give Ball'}
            </button>
          </div>
        </div>
      )}

      {selectedBall && (
        <div style={{ borderTop: '1px solid #3a3a4e', paddingTop: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#aaa', marginBottom: '8px' }}>
            SELECTED: BALL
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
            Position: ({Math.round(play.ball.x)}, {Math.round(play.ball.y)})
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
            Trajectory: {play.ball.trajectory.length} points
          </div>
          <button
            onClick={() => {
              setBallCarrier(null)
            }}
            style={smallButtonStyle}
          >
            Drop Ball Here
          </button>
          {play.ball.trajectory.length > 0 && (
            <button
              onClick={clearBallTrajectory}
              style={{ ...smallButtonStyle, background: '#c0392b' }}
            >
              Clear Trajectory
            </button>
          )}
        </div>
      )}

      <div style={{ borderTop: '1px solid #3a3a4e', paddingTop: '12px', marginTop: 'auto' }}>
        <div style={{ fontSize: '11px', color: '#555', marginBottom: '4px' }}>
          Mode: {editMode.toUpperCase()}
        </div>
        <div style={{ fontSize: '11px', color: '#555' }}>
          {editMode === 'record' && (selectedPlayerId !== null || selectedBall)
            ? 'Press G to start/stop recording'
            : editMode === 'move'
              ? 'Drag players to reposition'
              : 'Click a player or ball to select'}
        </div>
      </div>
    </div>
  )
}

const smallButtonStyle: React.CSSProperties = {
  padding: '4px 10px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  background: '#555',
  color: '#fff',
  marginRight: '4px',
  marginBottom: '4px',
}

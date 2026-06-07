import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Stage, Layer, Rect, Line, Circle, Text, Group } from 'react-konva'
import { useStore } from '../store/useStore'
import { FIELD_PX, SCALE } from '../types'
import { savePlays } from '../utils/persistence'
import { useAnimation } from '../hooks/useAnimation'
import { useRecording } from '../hooks/useRecording'
import { TrajectoryPath } from './TrajectoryPath'

const FIELD_COLOR = '#3d8c3d'
const LINE_COLOR = '#ffffff'
const LINE_WIDTH = 2

function screenToField(sx: number, sy: number, panX: number, panY: number, zoom: number): { lx: number; ly: number } {
  const layerX = (sx - panX) / zoom
  const layerY = (sy - panY) / zoom
  const gx = FIELD_PX.width / 2
  const gy = FIELD_PX.totalLength / 2
  const lx = gy - layerY
  const ly = layerX - gx
  return { lx, ly }
}

export const FieldCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  const plays = useStore(s => s.plays)
  const currentPlayId = useStore(s => s.currentPlayId)
  const editMode = useStore(s => s.editMode)
  const isRecording = useStore(s => s.isRecording)
  const recordedMovements = useStore(s => s.recordedMovements)
  const selectedPlayerId = useStore(s => s.selectedPlayerId)
  const selectedPlayerIds = useStore(s => s.selectedPlayerIds)
  const multiSelect = useStore(s => s.multiSelect)
  const selectedBall = useStore(s => s.selectedBall)
  const view = useStore(s => s.view)
  const setZoom = useStore(s => s.setZoom)
  const setPan = useStore(s => s.setPan)
  const setEditMode = useStore(s => s.setEditMode)
  const setSelectedPlayer = useStore(s => s.setSelectedPlayer)
  const toggleSelectedPlayer = useStore(s => s.toggleSelectedPlayer)
  const startRecording = useStore(s => s.startRecording)
  const finishRecording = useStore(s => s.finishRecording)

  useAnimation()
  const { handleDrag, resetLastPoint } = useRecording()
  const dragContext = useRef<{
    draggedId: number
    startX: number
    startY: number
    initialPositions: Record<number, { x: number; y: number }>
  } | null>(null)
  const isPanning = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })
  const minZoomRef = useRef(0.3)
  const clickedPlayerRef = useRef(false)

  const play = plays.find(p => p.id === currentPlayId)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setSize({ w: rect.width, h: rect.height })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    if (size.w > 0 && size.h > 0) {
      const visW = FIELD_PX.totalLength
      const visH = FIELD_PX.width
      const z = Math.min((size.w - 20) / visW, (size.h - 20) / visH)
      minZoomRef.current = z
      const cx = FIELD_PX.width / 2 + FIELD_PX.totalLength / 2
      const cy = FIELD_PX.totalLength / 2 - FIELD_PX.width / 2
      setPan(size.w / 2 - cx * z, size.h / 2 - cy * z)
      setZoom(z)
    }
  }, [size.w, size.h])

  // Native wheel zoom on the container div (more reliable than Konva onWheel)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = container.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      const state = useStore.getState()
      const oldZ = state.view.zoom
      const factor = 1.08
      const newZ = Math.max(minZoomRef.current, Math.min(5, e.deltaY > 0 ? oldZ / factor : oldZ * factor))

      // Zoom toward pointer
      state.setPan(mx - (mx - state.view.panX) * (newZ / oldZ), my - (my - state.view.panY) * (newZ / oldZ))
      state.setZoom(newZ)
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [])

  // Native mousedown for selection (fires before Konva processes events)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onMouseDown = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      const state = useStore.getState()
      const play = state.plays.find(pl => pl.id === state.currentPlayId)
      if (!play) return

      const fieldPos = screenToField(mx, my, state.view.panX, state.view.panY, state.view.zoom)

      const clickedPlayer = play.players.find(player => {
        const dx = player.x - fieldPos.lx
        const dy = player.y - fieldPos.ly
        return Math.sqrt(dx * dx + dy * dy) < 30
      })

      if (clickedPlayer) {
        clickedPlayerRef.current = true
        if (state.multiSelect) {
          state.toggleSelectedPlayer(clickedPlayer.id)
        } else {
          state.setSelectedPlayer(clickedPlayer.id)
        }
        state.setSelectedBall(false)
        return
      }

      const clickedBall = Math.sqrt((play.ball.x - fieldPos.lx) ** 2 + (play.ball.y - fieldPos.ly) ** 2) < 20
      if (clickedBall) {
        clickedPlayerRef.current = true
        state.setSelectedPlayer(null)
        state.setSelectedBall(true)
        return
      }

      // Empty space - deselect all
      state.setSelectedPlayer(null)
      state.setSelectedBall(false)
    }

    container.addEventListener('mousedown', onMouseDown)
    return () => container.removeEventListener('mousedown', onMouseDown)
  }, [])

  // Stage only handles panning (selection is done by native mousedown listener)
  const handleStageMouseDown = useCallback((e: any) => {
    // If native handler already detected a player/ball click, skip panning
    if (clickedPlayerRef.current) {
      clickedPlayerRef.current = false
      return
    }

    const stg = e.target.getStage()
    if (!stg) return
    const p = stg.getPointerPosition()
    if (!p) return

    isPanning.current = true
    lastPan.current = { x: p.x, y: p.y }
  }, [])

  const handleStageMouseMove = useCallback((e: any) => {
    if (!isPanning.current) return
    const p = e.target.getStage()?.getPointerPosition()
    if (!p) return
    const state = useStore.getState()
    state.setPan(state.view.panX + p.x - lastPan.current.x, state.view.panY + p.y - lastPan.current.y)
    lastPan.current = { x: p.x, y: p.y }
  }, [])

  const handleStageMouseUp = useCallback(() => { isPanning.current = false }, [])

  const handleStageTap = useCallback((e: any) => {
    const state = useStore.getState()
    state.setSelectedPlayer(null)
    state.setSelectedBall(false)
  }, [])

  const handlePlayerDragStart = useCallback((id: number, x: number, y: number) => {
    if (editMode === 'move') {
      const state = useStore.getState()
      const play = state.plays.find(p => p.id === state.currentPlayId)
      if (!play) return
      const initialPositions: Record<number, { x: number; y: number }> = {}
      for (const pid of state.selectedPlayerIds) {
        const p = play.players.find(pl => pl.id === pid)
        if (p) initialPositions[pid] = { x: p.x, y: p.y }
      }
      dragContext.current = { draggedId: id, startX: x, startY: y, initialPositions }
    }
  }, [editMode])

  const handlePlayerDragMove = useCallback((id: number, x: number, y: number) => {
    const state = useStore.getState()
    if (state.editMode === 'record') {
      if (!state.isRecording) {
        state.setSelectedPlayer(id)
        state.startRecording()
      }
      const freshState = useStore.getState()
      if (freshState.isRecording) handleDrag(id, x, y)
    } else if (state.editMode === 'move') {
      const ctx = dragContext.current
      if (!ctx || ctx.draggedId !== id) return
      const dx = x - ctx.startX
      const dy = y - ctx.startY
      if (dx === 0 && dy === 0) return
      const play = state.plays.find(p => p.id === state.currentPlayId)
      if (!play) return
      const selectedSet = new Set(state.selectedPlayerIds)
      const newPlayers = play.players.map(p => {
        if (p.id !== id && selectedSet.has(p.id)) {
          const init = ctx.initialPositions[p.id]
          if (init) return { ...p, x: init.x + dx, y: init.y + dy }
        }
        return p
      })
      const newPlays = state.plays.map(p =>
        p.id === state.currentPlayId ? { ...p, players: newPlayers } : p
      )
      useStore.setState({ plays: newPlays, isDirty: true })
    }
  }, [handleDrag])

  const handlePlayerDragEnd = useCallback((id: number, x: number, y: number) => {
    const state = useStore.getState()
    const mode = state.editMode
    if (mode === 'move') {
      state.movePlayer(id, x, y)
      const curPlay = state.plays.find(p => p.id === state.currentPlayId)
      if (curPlay && curPlay.ball.carriedBy === id) state.moveBall(x, y)
    }
    if (mode === 'record' && state.isRecording) {
      handleDrag(id, x, y)
      state.finishRecording()
    }
    dragContext.current = null
    resetLastPoint()
  }, [handleDrag, resetLastPoint])

  const handleBallDragMove = useCallback((x: number, y: number) => {
    const state = useStore.getState()
    if (state.editMode === 'record') {
      if (!state.isRecording) {
        state.setSelectedBall(true)
        state.startRecording()
      }
      const freshState = useStore.getState()
      if (freshState.isRecording) handleDrag(-1, x, y)
    }
  }, [handleDrag])

  const handleBallDragEnd = useCallback((x: number, y: number) => {
    const state = useStore.getState()
    if (state.editMode === 'move') { state.moveBall(x, y); state.setBallCarrier(null) }
    if (state.editMode === 'record' && state.isRecording) {
      handleDrag(-1, x, y)
      state.finishRecording()
    }
    resetLastPoint()
  }, [handleDrag, resetLastPoint])

  if (!play || size.w === 0) {
    return <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#1a1a2e' }} />
  }

  const W = FIELD_PX.width
  const H = FIELD_PX.totalLength
  const IGL = FIELD_PX.inGoalLength

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#1a1a2e', overflow: 'hidden' }}>
      <Stage
        width={size.w}
        height={size.h}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onMouseLeave={handleStageMouseUp}
        onTap={handleStageTap}
      >
        <Layer x={view.panX} y={view.panY} scaleX={view.zoom} scaleY={view.zoom}>
          <Group
            x={FIELD_PX.width / 2}
            y={FIELD_PX.totalLength / 2}
            rotation={-90}
          >
          <Rect x={0} y={0} width={W} height={H} fill={FIELD_COLOR} />
          <Rect x={0} y={IGL} width={W} height={H - 2 * IGL} fill="#3fa53f" />

          {[
            [0, 0, W, 0], [W, 0, W, H], [W, H, 0, H], [0, H, 0, 0],
            [0, H / 2, W, H / 2],
            [0, IGL, W, IGL], [0, H - IGL, W, H - IGL],
            [0, IGL + 10 * SCALE, W, IGL + 10 * SCALE],
            [0, H - IGL - 10 * SCALE, W, H - IGL - 10 * SCALE],
            [5 * SCALE, 0, 5 * SCALE, H], [W - 5 * SCALE, 0, W - 5 * SCALE, H],
            [15 * SCALE, IGL, 15 * SCALE, H - IGL],
            [W - 15 * SCALE, IGL, W - 15 * SCALE, H - IGL],
          ].map((pts, i) => (
            <Line
              key={`line-${i}`}
              points={pts}
              stroke={LINE_COLOR}
              strokeWidth={LINE_WIDTH}
              dash={i === 3 || i === 4 || (i >= 6 && i <= 8) || (i >= 10) ? [8, 8] : undefined}
            />
          ))}

          {[
            { text: 'Línea de marca', y: IGL },
            { text: '5m', y: IGL + 5 * SCALE },
            { text: '10m', y: IGL + 10 * SCALE },
            { text: 'Mediocampo', y: H / 2 },
            { text: '10m', y: H - IGL - 10 * SCALE },
            { text: '5m', y: H - IGL - 5 * SCALE },
            { text: 'Línea de marca', y: H - IGL },
          ].map((label, i) => (
            <Text
              key={`label-h-${i}`}
              x={-8}
              y={label.y - 7}
              text={label.text}
              fontSize={9}
              fill="rgba(255,255,255,0.7)"
              fontStyle="bold"
              align="right"
              width={FIELD_PX.width + 16}
              listening={false}
            />
          ))}

          {[
            { text: '5m', x: 5 * SCALE, y: IGL - 14 },
            { text: '15m', x: 15 * SCALE, y: IGL - 14 },
            { text: '5m', x: W - 5 * SCALE, y: IGL - 14 },
            { text: '15m', x: W - 15 * SCALE, y: IGL - 14 },
          ].map((label, i) => (
            <Text
              key={`label-v-${i}`}
              x={label.x}
              y={label.y}
              text={label.text}
              fontSize={9}
              fill="rgba(255,255,255,0.7)"
              fontStyle="bold"
              align="center"
              width={30}
              offsetX={15}
              listening={false}
            />
          ))}

          {play.players.map(player => (
            <TrajectoryPath
              key={`t-${player.id}`}
              points={player.trajectory}
              color={player.color}
              showNodes={selectedPlayerId === player.id}
              onNodeDragEnd={(i, x, y) => useStore.getState().updateTrajectoryPoint(player.id, i, x, y)}
              onNodeClick={(i) => useStore.getState().deleteTrajectoryPoint(player.id, i)}
            />
          ))}

          {play.ball.trajectory.length > 0 && (
            <TrajectoryPath
              points={play.ball.trajectory}
              color="#f1c40f"
              isBall
              showNodes={selectedBall}
              onNodeDragEnd={(i, x, y) => {
                const s = useStore.getState()
                const pl = s.plays.find(p => p.id === s.currentPlayId)
                if (!pl) return
                const t = pl.ball.trajectory.map((pt, idx) => idx === i ? { ...pt, x, y } : pt)
                const np = s.plays.map(p => p.id === s.currentPlayId ? { ...p, ball: { ...p.ball, trajectory: t } } : p)
                useStore.setState({ plays: np })
                savePlays(np)
              }}
              onNodeClick={(i) => {
                const s = useStore.getState()
                const pl = s.plays.find(p => p.id === s.currentPlayId)
                if (!pl) return
                const t = pl.ball.trajectory.filter((_, idx) => idx !== i)
                const np = s.plays.map(p => p.id === s.currentPlayId ? { ...p, ball: { ...p.ball, trajectory: t } } : p)
                useStore.setState({ plays: np })
                savePlays(np)
              }}
            />
          )}

          {isRecording && recordedMovements.map(m => {
            const c = m.playerId === -1 ? '#f1c40f' : play.players.find(p => p.id === m.playerId)?.color || '#fff'
            return <TrajectoryPath key={`r-${m.playerId}`} points={m.points} color={c} isBall={m.playerId === -1} />
          })}

          {play.players.map(player => (
            <Group
              key={player.id}
              x={player.x}
              y={player.y}
              draggable={editMode === 'move' || editMode === 'record'}
              onDragStart={(e) => handlePlayerDragStart(player.id, e.target.x(), e.target.y())}
              onDragMove={(e) => handlePlayerDragMove(player.id, e.target.x(), e.target.y())}
              onDragEnd={(e) => handlePlayerDragEnd(player.id, e.target.x(), e.target.y())}
            >
              <Circle
                radius={9}
                fill={player.color}
                stroke={selectedPlayerIds.includes(player.id) ? '#fff' : 'rgba(0,0,0,0.2)'}
                strokeWidth={selectedPlayerIds.includes(player.id) ? 2 : 1}
                shadowColor="rgba(0,0,0,0.3)"
                shadowBlur={selectedPlayerIds.includes(player.id) ? 5 : 3}
                shadowOffsetY={1}
              />
              <Text
                text={String(player.number)}
                fontSize={9}
                fontStyle="bold"
                fill="#fff"
                width={18}
                height={18}
                offsetX={9}
                offsetY={9}
                align="center"
                verticalAlign="middle"
                listening={false}
              />
            </Group>
          ))}

          <Group
            x={play.ball.x}
            y={play.ball.y}
            draggable={editMode === 'move' || editMode === 'record'}
            onDragMove={(e) => handleBallDragMove(e.target.x(), e.target.y())}
            onDragEnd={(e) => handleBallDragEnd(e.target.x(), e.target.y())}
          >
            <Circle radius={5} fill="#f1c40f" stroke={selectedBall ? '#fff' : '#c9a800'} strokeWidth={selectedBall ? 2 : 1} />
            <Circle radius={1.5} fill="#c9a800" listening={false} />
          </Group>
          </Group>
        </Layer>
      </Stage>
    </div>
  )
}

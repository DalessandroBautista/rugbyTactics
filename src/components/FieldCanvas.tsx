import React, { useRef, useEffect, useState, useCallback } from 'react'
import Konva from 'konva'
import { Stage, Layer, Rect, Circle, Text, Group, Image as KonvaImage, Arrow } from 'react-konva'
import { useStore } from '../store/useStore'
import { FIELD_PX, TacticalZone } from '../types'
import { savePlays } from '../utils/persistence'
import { recordStageVideo, downloadVideo, shareOrDownloadVideo, pickVideoMime } from '../utils/export'
import { useAnimation } from '../hooks/useAnimation'
import { useRecording } from '../hooks/useRecording'
import { playerOrientation, movementOrientation } from '../utils/orientation'
import { TrajectoryPath } from './TrajectoryPath'
import { FieldMarkings } from './FieldMarkings'
import { PlayerToken } from './PlayerToken'
import { BallToken } from './BallToken'
import { MovementTrail } from './MovementTrail'
import { SpeechBubble } from './SpeechBubble'
import { calculatePinchZoom } from '../utils/mobile'

// Convierte coordenadas de campo a coordenadas de pantalla (para el rubber-band).
// Replica la transformación del Group contenedor: traslación al centro del
// campo + rotación de -90° + pan/zoom del Layer. Debe mantenerse en sincronía
// con el <Group> que envuelve a jugadores y pelota más abajo.
function fieldToScreen(px: number, py: number, panX: number, panY: number, zoom: number) {
  const layerX = py + FIELD_PX.width / 2
  const layerY = -px + FIELD_PX.totalLength / 2
  return { sx: layerX * zoom + panX, sy: layerY * zoom + panY }
}

function snapPos(x: number, y: number, snap: boolean, size: number) {
  if (!snap) return { x, y }
  return {
    x: Math.round(x / size) * size,
    y: Math.round(y / size) * size,
  }
}

export const FieldCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  const plays = useStore(s => s.plays)
  const currentPlayId = useStore(s => s.currentPlayId)
  const editMode = useStore(s => s.editMode)
  const isRecording = useStore(s => s.isRecording)
  const recordedMovements = useStore(s => s.recordedMovements)
  const selectedPlayerId = useStore(s => s.selectedPlayerId)
  const selectedPlayerIds = useStore(s => s.selectedPlayerIds)
  const selectedBall = useStore(s => s.selectedBall)
  const view = useStore(s => s.view)
  const requestFit = useStore(s => s.requestFit)
  const setZoom = useStore(s => s.setZoom)
  const setPan = useStore(s => s.setPan)
  const setExportPNG = useStore(s => s.setExportPNG)
  const setExportVideo = useStore(s => s.setExportVideo)
  const snapToGrid = useStore(s => s.snapToGrid)
  const snapSize = useStore(s => s.snapSize)
  const isPlaying = useStore(s => s.isPlaying)
  const currentTime = useStore(s => s.currentTime)
  const animatedPositions = useStore(s => s.animatedPositions)
  const animatedBall = useStore(s => s.animatedBall)
  const halfField = useStore(s => s.halfField)
  const showVision = useStore(s => s.showVision)

  useAnimation()
  const { handleDrag, resetLastPoint } = useRecording()

  // Register exportPNG function with store
  useEffect(() => {
    setExportPNG(() => {
      const stage = stageRef.current
      if (!stage) return
      const st = useStore.getState()
      const play = st.plays.find(p => p.id === st.currentPlayId)
      if (!play) return
      const filename = `${play.name || 'jugada'}.png`

      // Smart crop: exportar solo el área donde están los jugadores.
      // Convierte cada posición de jugador al sistema de coordenadas del stage
      // usando la misma transformación que fieldToScreen (usada en rubber-band).
      const { zoom, panX, panY } = st.view
      const screenPts = play.players.map(p => {
        const ap = st.animatedPositions?.[p.id]
        const fx = ap?.x ?? p.x
        const fy = ap?.y ?? p.y
        return fieldToScreen(fx, fy, panX, panY, zoom)
      })
      const ab = st.animatedBall
      screenPts.push(fieldToScreen(ab?.x ?? play.ball.x, ab?.y ?? play.ball.y, panX, panY, zoom))

      const SX = screenPts.map(p => p.sx)
      const SY = screenPts.map(p => p.sy)
      const PAD = Math.max(80, 80 * zoom)
      const x = Math.max(0, Math.min(...SX) - PAD)
      const y = Math.max(0, Math.min(...SY) - PAD)
      const w = Math.min(stage.width(), Math.max(...SX) + PAD) - x
      const h = Math.min(stage.height(), Math.max(...SY) + PAD) - y

      const url = stage.toDataURL({ pixelRatio: 3, x, y, width: w, height: h })
      if (url) {
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
      }
    })
    return () => setExportPNG(null)
  }, [setExportPNG])

  // Registrar la grabación de video (mp4/webm) con el store
  useEffect(() => {
    setExportVideo(async () => {
      const stage = stageRef.current
      const st = useStore.getState()
      const cur = st.plays.find(p => p.id === st.currentPlayId)
      if (!stage || !cur) return
      if (!pickVideoMime()) {
        console.warn('Este navegador no soporta grabación de video')
        return
      }

      // Smart crop: calcular bounding box de todas las posiciones y trayectorias
      // para exportar solo el área de acción, igual que el export PNG.
      const { zoom, panX, panY } = st.view
      const pts: Array<{ sx: number; sy: number }> = []
      cur.players.forEach(p => {
        pts.push(fieldToScreen(p.x, p.y, panX, panY, zoom))
        p.trajectory.forEach(pt => pts.push(fieldToScreen(pt.x, pt.y, panX, panY, zoom)))
      })
      pts.push(fieldToScreen(cur.ball.x, cur.ball.y, panX, panY, zoom))
      cur.ball.trajectory.forEach(pt => pts.push(fieldToScreen(pt.x, pt.y, panX, panY, zoom)))

      const PAD = Math.max(80, 80 * zoom)
      const cropX = Math.max(0, Math.min(...pts.map(p => p.sx)) - PAD)
      const cropY = Math.max(0, Math.min(...pts.map(p => p.sy)) - PAD)
      const cropMaxX = Math.min(stage.width(), Math.max(...pts.map(p => p.sx)) + PAD)
      const cropMaxY = Math.min(stage.height(), Math.max(...pts.map(p => p.sy)) + PAD)
      const cropW = Math.max(200, cropMaxX - cropX)
      const cropH = Math.max(200, cropMaxY - cropY)
      // 2x pixel ratio: números de jugadores y detalles visibles en el video
      const PIXEL_RATIO = 2

      // Calcular duración real: último movimiento + 2 segundos de buffer
      let lastMoveTime = 0
      for (const p of cur.players) {
        for (const pt of p.trajectory) {
          if (pt.time > lastMoveTime) lastMoveTime = pt.time
        }
      }
      for (const pt of cur.ball.trajectory) {
        if (pt.time > lastMoveTime) lastMoveTime = pt.time
      }
      // Mínimo 2 segundos, máximo cur.duration
      const recDuration = Math.min(cur.duration, Math.max(2000, lastMoveTime + 2000))

      useStore.setState({ isExportingVideo: true })
      st.setCurrentTime(0)
      st.setIsPlaying(false)
      await new Promise((r) => setTimeout(r, 80))
      st.setIsPlaying(true)
      let result: { blob: Blob; ext: string } | null = null
      try {
        result = await recordStageVideo(
          () => stage.toCanvas({ x: cropX, y: cropY, width: cropW, height: cropH, pixelRatio: PIXEL_RATIO }) as HTMLCanvasElement,
          Math.round(cropW * PIXEL_RATIO),
          Math.round(cropH * PIXEL_RATIO),
          recDuration,
        )
      } catch (err) {
        console.error('Fallo al grabar el video:', err)
      }
      useStore.getState().setIsPlaying(false)
      useStore.setState({ isExportingVideo: false })
      if (result) await shareOrDownloadVideo(result.blob, cur.name, result.ext)
    })
    return () => setExportVideo(null)
  }, [setExportVideo])

  const dragContext = useRef<{
    draggedId: number
    startX: number
    startY: number
    initialPositions: Record<number, { x: number; y: number }>
  } | null>(null)

  // Contexto para grabación en bloque: graba simultáneamente todos los jugadores seleccionados
  const multiRecordRef = useRef<{
    draggedId: number
    startX: number
    startY: number
    lastX: number
    lastY: number
    initialPositions: Record<number, { x: number; y: number }>
  } | null>(null)

  const isPanning = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })
  const hasMoved = useRef(false)
  const minZoomRef = useRef(0.3)
  const pinchRef = useRef<{ distance: number; center: { x: number; y: number } } | null>(null)

  // Per-player click tracking to distinguish click from drag
  const playerInteraction = useRef<{
    id: number
    wasSelected: boolean
    didDrag: boolean
    additive: boolean
  } | null>(null)

  // Rubber band selection state
  const rubberBandStart = useRef<{ x: number; y: number } | null>(null)
  const [rubberBandRect, setRubberBandRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  const play = plays.find(p => p.id === currentPlayId)

  // ── Fit to screen ──────────────────────────────────────────────────────────
  const fitToScreen = useCallback(() => {
    if (size.w === 0 || size.h === 0) return
    const visW = halfField ? FIELD_PX.halfway : FIELD_PX.totalLength
    const visH = FIELD_PX.width
    const z = Math.min((size.w - 20) / visW, (size.h - 20) / visH)
    minZoomRef.current = z
    // En medio campo mostramos solo la mitad atacante (py = halfway..totalLength).
    // Centro en coords de layer: layerX = centerPy + width/2, layerY = totalLength/2 - width/2
    const cx = halfField
      ? FIELD_PX.halfway * 1.5 + FIELD_PX.width / 2
      : FIELD_PX.width / 2 + FIELD_PX.totalLength / 2
    const cy = FIELD_PX.totalLength / 2 - FIELD_PX.width / 2
    setPan(size.w / 2 - cx * z, size.h / 2 - cy * z)
    setZoom(z)
  }, [size.w, size.h, halfField, setPan, setZoom])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) setSize({ w: rect.width, h: rect.height })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Initial fit when container size is known
  useEffect(() => {
    if (size.w > 0 && size.h > 0) fitToScreen()
  }, [size.w, size.h]) // intentionally not including fitToScreen to avoid loop

  // External fit requests (from "Centrar" button)
  useEffect(() => {
    if (requestFit > 0) fitToScreen()
  }, [requestFit, fitToScreen])

  // Overlay image loading
  const [overlayImgEl, setOverlayImgEl] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!play?.overlayImage?.dataURL) { setOverlayImgEl(null); return }
    const img = new window.Image()
    img.src = play.overlayImage.dataURL
    img.onload = () => setOverlayImgEl(img)
  }, [play?.overlayImage?.dataURL])

  // Wheel zoom
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
      const rawNew = e.deltaY > 0 ? oldZ / factor : oldZ * factor
      const newZ = Math.max(minZoomRef.current, Math.min(5, rawNew))

      // If zooming back to minimum, snap to centered fit
      if (newZ <= minZoomRef.current && rawNew < minZoomRef.current) {
        fitToScreen()
        return
      }

      state.setPan(
        mx - (mx - state.view.panX) * (newZ / oldZ),
        my - (my - state.view.panY) * (newZ / oldZ),
      )
      state.setZoom(newZ)
    }
    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [fitToScreen])

  // ── Player interaction handlers ─────────────────────────────────────────────
  // onMouseDown: select immediately so drag includes this player in the selection
  const handlePlayerMouseDown = useCallback((e: any, playerId: number) => {
    e.cancelBubble = true
    const state = useStore.getState()
    // Acumular a la selección con el toggle Multi o manteniendo Shift
    const additive = state.multiSelect || !!e.evt?.shiftKey
    const alreadySelected = state.selectedPlayerIds.includes(playerId)
    playerInteraction.current = { id: playerId, wasSelected: alreadySelected, didDrag: false, additive }

    if (additive) {
      if (!alreadySelected) {
        state.toggleSelectedPlayer(playerId)
      }
      // Si ya estaba seleccionado, esperamos al onClick (sin drag) para quitarlo
    } else if (!alreadySelected) {
      // Solo reemplaza la selección si el jugador no era parte de ella;
      // preserva la selección grupal al arrastrar a cualquier miembro
      state.setSelectedPlayer(playerId)
    }
    useStore.setState({ selectedBall: false })
  }, [])

  // onClick: only fires when mouse didn't move. Handles deselect-toggle for multi.
  const handlePlayerClick = useCallback((e: any, playerId: number) => {
    e.cancelBubble = true
    const info = playerInteraction.current
    if (!info || info.id !== playerId || info.didDrag) return
    const state = useStore.getState()
    if (info.additive && info.wasSelected) {
      state.toggleSelectedPlayer(playerId)
    }
  }, [])

  const handleBallClick = useCallback((e: any) => {
    e.cancelBubble = true
    useStore.getState().setSelectedPlayer(null)
    useStore.getState().setSelectedBall(true)
  }, [])

  // ── Stage events (panning + rubber band + deselect on empty) ────────────
  const handleStageMouseDown = useCallback((e: any) => {
    const stage = e.target.getStage()
    if (!stage) return
    const pos = stage.getPointerPosition()
    if (!pos) return
    hasMoved.current = false

    if (e.target !== stage) return  // shape clicked — its own handlers run

    const state = useStore.getState()
    const evt = e.evt as MouseEvent

    // Shift + click izquierdo en modo select → banda de goma (selección múltiple)
    // Middle click → siempre paneo
    const wantsRubberBand = state.editMode === 'select' && evt?.shiftKey
    const wantsPan = !wantsRubberBand  // todo lo demás es paneo

    if (wantsRubberBand) {
      rubberBandStart.current = { x: pos.x, y: pos.y }
      setRubberBandRect({ x: pos.x, y: pos.y, w: 0, h: 0 })
    }

    if (wantsPan) {
      isPanning.current = true
      lastPan.current = { x: pos.x, y: pos.y }
    }
  }, [])

  const handleStageMouseMove = useCallback((e: any) => {
    const stage = e.target.getStage()
    const pos = stage?.getPointerPosition()
    if (!pos) return
    hasMoved.current = true

    if (rubberBandStart.current) {
      const rx = Math.min(rubberBandStart.current.x, pos.x)
      const ry = Math.min(rubberBandStart.current.y, pos.y)
      const rw = Math.abs(pos.x - rubberBandStart.current.x)
      const rh = Math.abs(pos.y - rubberBandStart.current.y)
      if (rw > 4 || rh > 4) setRubberBandRect({ x: rx, y: ry, w: rw, h: rh })
      return
    }

    if (isPanning.current) {
      const state = useStore.getState()
      state.setPan(state.view.panX + pos.x - lastPan.current.x, state.view.panY + pos.y - lastPan.current.y)
      lastPan.current = { x: pos.x, y: pos.y }
    }
  }, [])

  const handleStageMouseUp = useCallback(() => {
    if (rubberBandStart.current) {
      if (rubberBandRect && (rubberBandRect.w > 4 || rubberBandRect.h > 4)) {
        const state = useStore.getState()
        const currentPlay = state.plays.find(p => p.id === state.currentPlayId)
        if (currentPlay) {
          const rb = rubberBandRect
          const ids = currentPlay.players
            .filter(player => {
              const ap = state.animatedPositions?.[player.id]
              const fx = ap?.x ?? player.x
              const fy = ap?.y ?? player.y
              const { sx, sy } = fieldToScreen(fx, fy, state.view.panX, state.view.panY, state.view.zoom)
              return sx >= rb.x && sx <= rb.x + rb.w && sy >= rb.y && sy <= rb.y + rb.h
            })
            .map(p => p.id)
          if (ids.length > 0) {
            useStore.setState({ selectedPlayerIds: ids, selectedPlayerId: ids[0], selectedBall: false })
          }
        }
      }
      rubberBandStart.current = null
      setRubberBandRect(null)
    }
    isPanning.current = false
  }, [rubberBandRect])

  const handleStageClick = useCallback((e: any) => {
    if (hasMoved.current) return
    if (e.target !== e.target.getStage()) return
    useStore.getState().setSelectedPlayer(null)
    useStore.getState().setSelectedBall(false)
  }, [])

  const handleStageDblClick = useCallback((e: any) => {
    if (e.target === e.target.getStage()) fitToScreen()
  }, [fitToScreen])

  const handleStageTouchStart = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt?.touches as TouchList | undefined
    if (!touches || touches.length !== 2) return
    e.evt.preventDefault()
    const first = touches[0]
    const second = touches[1]
    pinchRef.current = {
      distance: Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY),
      center: { x: (first.clientX + second.clientX) / 2, y: (first.clientY + second.clientY) / 2 },
    }
    isPanning.current = false
  }, [])

  const handleStageTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt?.touches as TouchList | undefined
    const previous = pinchRef.current
    if (!touches || touches.length !== 2 || !previous) return
    e.evt.preventDefault()
    const first = touches[0]
    const second = touches[1]
    const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const center = { x: (first.clientX + second.clientX) / 2 - rect.left, y: (first.clientY + second.clientY) / 2 - rect.top }
    const state = useStore.getState()
    const newZoom = calculatePinchZoom({ zoom: state.view.zoom, previousDistance: previous.distance, distance, minimum: minZoomRef.current })
    const ratio = newZoom / state.view.zoom
    state.setPan(center.x - (center.x - state.view.panX) * ratio, center.y - (center.y - state.view.panY) * ratio)
    state.setZoom(newZoom)
    pinchRef.current = { distance, center }
  }, [])

  const handleStageTouchEnd = useCallback(() => { pinchRef.current = null }, [])

  // ── Player drag handlers ──────────────────────────────────────────────────
  const handlePlayerDragStart = useCallback((id: number, x: number, y: number) => {
    if (playerInteraction.current?.id === id) {
      playerInteraction.current.didDrag = true
    }
    if (editMode === 'move' || editMode === 'select') {
      const state = useStore.getState()
      const currentPlay = state.plays.find(p => p.id === state.currentPlayId)
      if (!currentPlay) return
      const initialPositions: Record<number, { x: number; y: number }> = {}
      for (const pid of state.selectedPlayerIds) {
        const p = currentPlay.players.find(pl => pl.id === pid)
        if (p) initialPositions[pid] = { x: p.x, y: p.y }
      }
      dragContext.current = { draggedId: id, startX: x, startY: y, initialPositions }
    }
    if (editMode === 'record') {
      const state = useStore.getState()
      if (state.selectedPlayerIds.length > 1) {
        const play = state.plays.find(p => p.id === state.currentPlayId)
        if (play) {
          const initialPositions: Record<number, { x: number; y: number }> = {}
          for (const pid of state.selectedPlayerIds) {
            const p = play.players.find(pl => pl.id === pid)
            if (p) {
              const ap = state.animatedPositions?.[pid]
              initialPositions[pid] = ap ? { x: ap.x, y: ap.y } : { x: p.x, y: p.y }
            }
          }
          multiRecordRef.current = { draggedId: id, startX: x, startY: y, lastX: x, lastY: y, initialPositions }
        }
      }
    }
  }, [editMode])

  const handlePlayerDragMove = useCallback((id: number, x: number, y: number) => {
    const state = useStore.getState()
    if (state.editMode === 'record') {
      if (!state.isRecording && (state.selectedPlayerIds.length > 0 || state.selectedBall)) {
        state.startRecording()
      }
      const st2 = useStore.getState()
      if (st2.isRecording) {
        handleDrag(id, x, y)
        // Grabación en bloque: mover y grabar todos los jugadores seleccionados juntos
        const ctx = multiRecordRef.current
        if (ctx && ctx.draggedId === id) {
          const dist = Math.sqrt((x - ctx.lastX) ** 2 + (y - ctx.lastY) ** 2)
          if (dist >= 3) {
            ctx.lastX = x
            ctx.lastY = y
            const totalDx = x - ctx.startX
            const totalDy = y - ctx.startY
            const newAnimPos: Record<number, { x: number; y: number }> = {}
            for (const pid of st2.selectedPlayerIds) {
              if (pid === id) continue
              const init = ctx.initialPositions[pid]
              if (init) {
                const nx = init.x + totalDx
                const ny = init.y + totalDy
                st2.addRecordingPoint(pid, nx, ny)
                newAnimPos[pid] = { x: nx, y: ny }
              }
            }
            if (Object.keys(newAnimPos).length > 0) {
              useStore.setState(s => ({
                animatedPositions: { ...(s.animatedPositions ?? {}), ...newAnimPos },
              }))
            }
          }
        }
      }
    } else if (state.editMode === 'move' || state.editMode === 'select') {
      const ctx = dragContext.current
      if (!ctx || ctx.draggedId !== id) return
      const snapped = snapPos(x, y, snapToGrid, snapSize)
      const dx = snapped.x - ctx.startX
      const dy = snapped.y - ctx.startY
      if (dx === 0 && dy === 0) return
      const currentPlay = state.plays.find(p => p.id === state.currentPlayId)
      if (!currentPlay) return
      const selectedSet = new Set(state.selectedPlayerIds)
      const newPlayers = currentPlay.players.map(p => {
        if (!selectedSet.has(p.id)) return p
        if (p.id === id) return { ...p, x: snapped.x, y: snapped.y }
        const init = ctx.initialPositions[p.id]
        return init ? { ...p, x: init.x + dx, y: init.y + dy } : p
      })

      // Si la pelota tiene portador y está entre los seleccionados, moverla también
      let newBall = currentPlay.ball
      const carrierId = currentPlay.ball.carriedBy
      if (carrierId !== null && selectedSet.has(carrierId)) {
        const carrierNew = newPlayers.find(p => p.id === carrierId)
        if (carrierNew) newBall = { ...newBall, x: carrierNew.x, y: carrierNew.y }
      }

      const newPlays = state.plays.map(p =>
        p.id === state.currentPlayId ? { ...p, players: newPlayers, ball: newBall } : p
      )
      useStore.setState({ plays: newPlays, isDirty: true, animatedPositions: null, animatedBall: null })
    }
  }, [handleDrag])

  const handlePlayerDragEnd = useCallback((id: number, x: number, y: number) => {
    const state = useStore.getState()
    const mode = state.editMode
    if (mode === 'move' || mode === 'select') {
      const ctx = dragContext.current
      const play = state.plays.find(p => p.id === state.currentPlayId)
      if (play && ctx && state.selectedPlayerIds.length > 1) {
        const snapped = snapPos(x, y, snapToGrid, snapSize)
        const dx = snapped.x - ctx.startX
        const dy = snapped.y - ctx.startY
        const selectedSet = new Set(state.selectedPlayerIds)
        const newPlayers = play.players.map(p => {
          if (!selectedSet.has(p.id)) return p
          if (p.id === id) return { ...p, x: snapped.x, y: snapped.y }
          const init = ctx.initialPositions[p.id]
          return init ? { ...p, x: init.x + dx, y: init.y + dy } : p
        })

        // Si la pelota tiene portador y está entre los seleccionados, moverla también
        let newBall = play.ball
        const carrierId = play.ball.carriedBy
        if (carrierId !== null && selectedSet.has(carrierId)) {
          const carrierNew = newPlayers.find(p => p.id === carrierId)
          if (carrierNew) newBall = { ...newBall, x: carrierNew.x, y: carrierNew.y }
        }

        const newPlays = state.plays.map(p =>
          p.id === state.currentPlayId ? { ...p, players: newPlayers, ball: newBall } : p
        )
        state.pushHistory()
        useStore.setState({ plays: newPlays, isDirty: true, animatedPositions: null, animatedBall: null })
        savePlays(newPlays)
      } else {
        state.movePlayer(id, x, y)
        if (play && play.ball.carriedBy === id) state.moveBall(x, y)
        savePlays(useStore.getState().plays)
      }
    }
    if (mode === 'record' && state.isRecording) {
      handleDrag(id, x, y)
      const ctx = multiRecordRef.current
      if (ctx && ctx.draggedId === id) {
        const totalDx = x - ctx.startX
        const totalDy = y - ctx.startY
        for (const pid of state.selectedPlayerIds) {
          if (pid === id) continue
          const init = ctx.initialPositions[pid]
          if (init) state.addRecordingPoint(pid, init.x + totalDx, init.y + totalDy)
        }
        multiRecordRef.current = null
      }
      // finishRecording actualiza animatedPositions internamente (merge con previas)
      state.finishRecording()
    }
    dragContext.current = null
    resetLastPoint()
  }, [handleDrag, resetLastPoint])

  const handleBallDragMove = useCallback((x: number, y: number) => {
    const state = useStore.getState()
    if (state.editMode === 'record') {
      if (!state.isRecording) { state.setSelectedBall(true); state.startRecording() }
      if (useStore.getState().isRecording) handleDrag(-1, x, y)
    }
  }, [handleDrag])

  const handleBallDragEnd = useCallback((x: number, y: number) => {
    const state = useStore.getState()
    if (state.editMode === 'move') { state.moveBall(x, y); state.setBallCarrier(null) }
    if (state.editMode === 'record' && state.isRecording) { handleDrag(-1, x, y); state.finishRecording() }
    resetLastPoint()
  }, [handleDrag, resetLastPoint])

  if (!play || size.w === 0) {
    return <div ref={containerRef} style={{ width: '100%', height: '100%', background: 'var(--bg)' }} />
  }

  // En modo 'select', los jugadores YA seleccionados son arrastrables para mover el bloque.
  // Los no seleccionados solo son clickeables (para seleccionar/deseleccionar).
  const getIsDraggable = (playerId: number) =>
    editMode === 'move' || editMode === 'record' ||
    (editMode === 'select' && selectedPlayerIds.includes(playerId))
  // Cursor: grab en todos los modos (siempre se puede panear), crosshair solo en grabación
  const cursorStyle = editMode === 'record' ? 'crosshair' : 'grab'

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', background: 'var(--bg)', overflow: 'hidden', cursor: cursorStyle }}>
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onMouseLeave={handleStageMouseUp}
        onClick={handleStageClick}
        onDblClick={handleStageDblClick}
        onTouchStart={handleStageTouchStart}
        onTouchMove={handleStageTouchMove}
        onTouchEnd={handleStageTouchEnd}
      >
        {/* Field layer */}
        <Layer x={view.panX} y={view.panY} scaleX={view.zoom} scaleY={view.zoom}>
          <Group
            x={FIELD_PX.width / 2} y={FIELD_PX.totalLength / 2} rotation={-90}
            {...(halfField ? {
              clipX: 0, clipY: FIELD_PX.halfway,
              clipWidth: FIELD_PX.width, clipHeight: FIELD_PX.halfway,
            } : {})}
          >

            {/* Marcas del campo (césped, líneas, postes, etiquetas) */}
            <FieldMarkings />

            {/* Overlay image */}
            {overlayImgEl && play?.overlayImage && (
              <KonvaImage
                image={overlayImgEl}
                x={play.overlayImage.x}
                y={play.overlayImage.y}
                width={play.overlayImage.width}
                height={play.overlayImage.height}
                opacity={play.overlayImage.opacity}
                draggable={editMode === 'move'}
                onDragEnd={(e) => useStore.getState().updateOverlayImage({ x: e.target.x(), y: e.target.y() })}
              />
            )}

            {/* Tactical zones */}
            {play.zones?.map((zone: TacticalZone) => (
              <Group key={zone.id} x={zone.x} y={zone.y} draggable={editMode === 'move'}
                onDragEnd={(e) => useStore.getState().updateZone(zone.id, { x: e.target.x(), y: e.target.y() })}>
                {zone.shape === 'rect' && zone.width && zone.height && (
                  <Rect x={-zone.width / 2} y={-zone.height / 2} width={zone.width} height={zone.height}
                    fill={zone.color} opacity={0.2} stroke={zone.color} strokeWidth={1} />
                )}
                {zone.shape === 'circle' && zone.radius && (
                  <Circle x={0} y={0} radius={zone.radius}
                    fill={zone.color} opacity={0.2} stroke={zone.color} strokeWidth={1} />
                )}
                {zone.shape === 'arrow' && (
                  <Arrow x={0} y={0} points={[0, 0, 60, 0]} fill={zone.color} stroke={zone.color}
                    strokeWidth={3} opacity={0.5} />
                )}
                {zone.label && <Text text={zone.label} fontSize={8} fill={zone.color} y={-14} offsetX={20} width={40} align="center" listening={false} />}
              </Group>
            ))}

            {/* Trajectory paths */}
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

            {/* Recording preview */}
            {isRecording && recordedMovements.map(m => {
              const c = m.playerId === -1 ? '#f1c40f' : play.players.find(p => p.id === m.playerId)?.color || '#fff'
              return <TrajectoryPath key={`r-${m.playerId}`} points={m.points} color={c} isBall={m.playerId === -1} />
            })}

            {/* Estela de movimiento durante la reproducción */}
            {isPlaying && (
              <MovementTrail players={play.players} ball={play.ball} currentTime={currentTime} />
            )}

            {/* Jugadores */}
            {play.players.map(player => {
              const ap = animatedPositions?.[player.id]
              return (
                <PlayerToken
                  key={player.id}
                  player={player}
                  x={ap?.x ?? player.x}
                  y={ap?.y ?? player.y}
                  isSelected={selectedPlayerIds.includes(player.id)}
                  isAway={player.team === 'away'}
                  isCarrier={play.ball.carriedBy === player.id}
                  draggable={getIsDraggable(player.id)}
                  orientation={
                    // Durante la reproducción, la mirada sigue la dirección del movimiento
                    (isPlaying ? movementOrientation(player.trajectory, currentTime) : null)
                      ?? playerOrientation(player, play)
                  }
                  showVision={showVision}
                  showRotateHandle={
                    showVision && editMode !== 'record' && !isPlaying &&
                    selectedPlayerIds.length === 1 && selectedPlayerIds[0] === player.id
                  }
                  onRotate={(deg) => useStore.getState().setPlayerOrientation(player.id, deg)}
                  onRotateEnd={(deg) => useStore.getState().setPlayerOrientation(player.id, deg, true)}
                  onMouseDown={(e) => handlePlayerMouseDown(e, player.id)}
                  onClick={(e) => handlePlayerClick(e, player.id)}
                  onTap={(e) => {
                    e.cancelBubble = true
                    const state = useStore.getState()
                    if (state.multiSelect) state.toggleSelectedPlayer(player.id)
                    else state.setSelectedPlayer(player.id)
                    state.setSelectedBall(false)
                  }}
                  onDragStart={(x, y) => handlePlayerDragStart(player.id, x, y)}
                  onDragMove={(x, y) => handlePlayerDragMove(player.id, x, y)}
                  onDragEnd={(x, y) => handlePlayerDragEnd(player.id, x, y)}
                />
              )
            })}

            {/* Pelota */}
            <BallToken
              x={animatedBall?.x ?? play.ball.x}
              y={animatedBall?.y ?? play.ball.y}
              selected={selectedBall}
              draggable={editMode === 'move' || editMode === 'record'}
              onClick={handleBallClick}
              onTap={handleBallClick}
              onDragMove={handleBallDragMove}
              onDragEnd={handleBallDragEnd}
            />

            {/* Burbujas de diálogo — siempre visibles en edición, por tiempo en playback */}
            {(play.speechBubbles ?? []).map(bubble => {
              const visible = !isPlaying || (currentTime >= bubble.startTime && currentTime < bubble.startTime + bubble.duration)
              return (
                <SpeechBubble key={bubble.id} bubble={bubble} visible={visible} />
              )
            })}

          </Group>
        </Layer>

        {/* Rubber band overlay (screen space) */}
        <Layer>
          {rubberBandRect && rubberBandRect.w > 4 && (
            <Rect
              x={rubberBandRect.x}
              y={rubberBandRect.y}
              width={rubberBandRect.w}
              height={rubberBandRect.h}
              fill="rgba(224,168,63,0.08)"
              stroke="#e0a83f"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}

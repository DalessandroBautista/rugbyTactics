import { create } from 'zustand'
import {
  Play,
  Player,
  Ball,
  TrajectoryPoint,
  EditMode,
  PlaybackSpeed,
  ViewState,
  DEFAULT_PLAYER_COLORS,
  AWAY_PLAYER_COLOR,
  ATTACK_FORMATION,
  FIELD_PX,
  SCALE,
  TacticalZone,
  OverlayImage,
} from '../types'
import { loadPlays, savePlays, loadCurrentPlayId, saveCurrentPlayId } from '../utils/persistence'
import { getInterpolatedPosition } from '../utils/interpolation'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

// Clon profundo para snapshots de historial. structuredClone es nativo y más
// rápido que JSON.parse(JSON.stringify()); con fallback por si no existe.
function clonePlays(plays: Play[]): Play[] {
  return typeof structuredClone === 'function'
    ? structuredClone(plays)
    : JSON.parse(JSON.stringify(plays))
}

function createInitialPlayers(): Player[] {
  return Array.from({ length: 15 }, (_, i) => {
    const number = i + 1
    const f = ATTACK_FORMATION[number]
    return {
      id: number,
      number,
      team: 'home' as const,
      color: DEFAULT_PLAYER_COLORS[i % DEFAULT_PLAYER_COLORS.length],
      x: f.ax * SCALE,
      y: f.ay * SCALE,
      trajectory: [],
    }
  })
}

function createInitialBall(): Ball {
  return {
    x: FIELD_PX.width / 2,
    y: FIELD_PX.halfway,
    carriedBy: null,
    trajectory: [],
    size: 6,
  }
}

function createPlay(name: string, description: string, category: string): Play {
  return {
    id: generateId(),
    name,
    description,
    category,
    createdAt: new Date().toISOString(),
    players: createInitialPlayers(),
    ball: createInitialBall(),
    duration: 40000,
  }
}

interface RecordedMovement {
  playerId: number
  points: TrajectoryPoint[]
}

interface PlayStore {
  plays: Play[]
  currentPlayId: string | null
  editMode: EditMode
  isPlaying: boolean
  isRecording: boolean
  currentTime: number
  playbackSpeed: PlaybackSpeed
  view: ViewState
  selectedPlayerId: number | null
  selectedPlayerIds: number[]
  selectedBall: boolean
  recordedMovements: RecordedMovement[]
  recordingStartTime: number | null
  recordingTimeOffset: number
  showExportDialog: boolean
  showLibrary: boolean
  showFormation: 'lineout' | 'scrum' | null
  isDirty: boolean
  multiSelect: boolean
  requestFit: number
  loopPlayback: boolean
  presentationMode: boolean
  halfField: boolean
  // Posiciones efímeras de la animación. No tocan `plays` (que conserva las
  // posiciones base), por lo que reproducir no muta ni re-renderiza todo el árbol.
  animatedPositions: Record<number, { x: number; y: number }> | null
  animatedBall: { x: number; y: number } | null
  history: Play[][]       // stack de snapshots anteriores (máx 50)
  future: Play[][]        // stack para redo

  getCurrentPlay: () => Play | null
  setCurrentPlay: (id: string) => void

  createPlay: (name: string, description: string, category: string) => void
  duplicatePlay: (id: string) => void
  deletePlay: (id: string) => void
  resetPlay: (id: string) => void
  resetMovements: (id: string) => void
  updatePlay: (id: string, updates: Partial<Play>) => void
  setPlayDuration: (id: string, duration: number) => void
  addOpponentPlayer: () => void
  removePlayer: (id: number) => void

  setEditMode: (mode: EditMode) => void
  setSelectedPlayer: (id: number | null) => void
  toggleSelectedPlayer: (id: number) => void
  setSelectedBall: (selected: boolean) => void

  movePlayer: (id: number, x: number, y: number) => void
  moveBall: (x: number, y: number) => void
  setBallCarrier: (playerId: number | null) => void

  startRecording: () => void
  stopRecording: () => void
  addRecordingPoint: (playerId: number, x: number, y: number) => void
  finishRecording: () => void
  updateTrajectoryPoint: (playerId: number, pointIndex: number, x: number, y: number) => void
  deleteTrajectoryPoint: (playerId: number, pointIndex: number) => void
  addTrajectoryPoint: (playerId: number, point: TrajectoryPoint) => void
  clearPlayerTrajectory: (playerId: number) => void
  clearBallTrajectory: () => void

  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void
  setPlaybackSpeed: (speed: PlaybackSpeed) => void
  resetPlayback: () => void
  setAnimatingPositions: (positions: Record<number, { x: number; y: number }>, ballPos: { x: number; y: number } | null) => void
  clearAnimatingPositions: () => void

  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void

  toggleExportDialog: () => void
  toggleLibrary: () => void
  setShowFormation: (type: 'lineout' | 'scrum' | null) => void
  toggleMultiSelect: () => void
  fitCanvas: () => void
  toggleLoopPlayback: () => void
  togglePresentationMode: () => void
  toggleHalfField: () => void

  loadFromJson: (json: string) => void
  exportToJson: () => string | null

  pushHistory: () => void
  undo: () => void
  redo: () => void

  exportPNG: (() => void) | null
  setExportPNG: (fn: (() => void) | null) => void

  exportVideo: (() => void) | null
  setExportVideo: (fn: (() => void) | null) => void
  isExportingVideo: boolean

  snapToGrid: boolean
  snapSize: number
  toggleSnapToGrid: () => void

  updatePlayer: (id: number, updates: Partial<Pick<Player, 'name' | 'color' | 'number'>>) => void

  updatePlayTags: (id: string, tags: string[]) => void

  mirrorPlay: (id: string) => void

  addZone: (zone: Omit<TacticalZone, 'id'>) => void
  removeZone: (id: string) => void
  updateZone: (id: string, updates: Partial<TacticalZone>) => void

  setOverlayImage: (dataURL: string) => void
  updateOverlayImage: (updates: Partial<OverlayImage>) => void
  clearOverlayImage: () => void

  reorderPlays: (fromIndex: number, toIndex: number) => void

  setPlaysFromServer: (plays: Play[]) => void
}

export const useStore = create<PlayStore>((set, get) => {
  const storedPlays = loadPlays()
  const storedCurrentId = loadCurrentPlayId()
  const initialPlays = storedPlays.length > 0 ? storedPlays : [createPlay('Nueva Jugada', '', 'General')]
  const initialPlayId = storedCurrentId && initialPlays.find(p => p.id === storedCurrentId) ? storedCurrentId : initialPlays[0].id

  /**
   * Aplica `updater` a la jugada actual y centraliza el patrón repetido:
   * snapshot de historial (opcional), reemplazo inmutable en `plays`,
   * `isDirty`, persistencia y campos extra del estado.
   */
  const updateCurrentPlay = (
    updater: (play: Play) => Play,
    opts: { history?: boolean; save?: boolean; extra?: Partial<PlayStore> } = {},
  ) => {
    const state = get()
    const play = state.plays.find(p => p.id === state.currentPlayId)
    if (!play) return
    if (opts.history) get().pushHistory()
    const newPlays = state.plays.map(p => (p.id === state.currentPlayId ? updater(p) : p))
    set({ plays: newPlays, isDirty: true, ...(opts.extra ?? {}) })
    if (opts.save !== false) savePlays(newPlays)
  }

  return {
    plays: initialPlays,
    currentPlayId: initialPlayId,
    editMode: 'select',
    isPlaying: false,
    isRecording: false,
    currentTime: 0,
    playbackSpeed: 1,
    view: { zoom: 1, panX: 0, panY: 0 },
    selectedPlayerId: null,
    selectedPlayerIds: [],
    selectedBall: false,
    recordedMovements: [],
    recordingStartTime: null,
    recordingTimeOffset: 0,
    showExportDialog: false,
    showLibrary: false,
    showFormation: null,
    isDirty: false,
    multiSelect: false,
    requestFit: 0,
    loopPlayback: false,
    presentationMode: false,
    halfField: false,
    animatedPositions: null,
    animatedBall: null,
    history: [],
    future: [],
    exportPNG: null,
    exportVideo: null,
    isExportingVideo: false,
    snapToGrid: false,
    snapSize: SCALE,

    getCurrentPlay: () => {
      const state = get()
      return state.plays.find(p => p.id === state.currentPlayId) || null
    },

    setCurrentPlay: (id) => {
      set({ currentPlayId: id, currentTime: 0, isPlaying: false, selectedPlayerId: null, selectedPlayerIds: [], selectedBall: false, animatedPositions: null, animatedBall: null })
      saveCurrentPlayId(id)
    },

    createPlay: (name, description, category) => {
      const state = get()
      const newPlay = createPlay(name, description, category)
      set({ plays: [...state.plays, newPlay], currentPlayId: newPlay.id, currentTime: 0, isPlaying: false, isDirty: true })
      savePlays([...state.plays, newPlay])
      saveCurrentPlayId(newPlay.id)
    },

    duplicatePlay: (id) => {
      const state = get()
      const original = state.plays.find(p => p.id === id)
      if (!original) return
      const duplicate: Play = {
        ...clonePlays([original])[0],
        id: generateId(),
        name: original.name + ' (copia)',
        createdAt: new Date().toISOString(),
      }
      const newPlays = [...state.plays, duplicate]
      set({ plays: newPlays, isDirty: true })
      savePlays(newPlays)
    },

    deletePlay: (id) => {
      const state = get()
      const newPlays = state.plays.filter(p => p.id !== id)
      if (newPlays.length === 0) return
      get().pushHistory()  // permite deshacer el borrado con Ctrl+Z
      const newId = state.currentPlayId === id ? newPlays[0].id : state.currentPlayId
      set({ plays: newPlays, currentPlayId: newId, isDirty: true })
      savePlays(newPlays)
    },

    updatePlay: (id, updates) => {
      const state = get()
      const newPlays = state.plays.map(p => p.id === id ? { ...p, ...updates } : p)
      set({ plays: newPlays, isDirty: true })
      savePlays(newPlays)
    },

    setPlayDuration: (id, duration) => {
      const state = get()
      const d = Math.max(1000, Math.round(duration))
      const newPlays = state.plays.map(p => p.id === id ? { ...p, duration: d } : p)
      set({ plays: newPlays, isDirty: true })
      savePlays(newPlays)
    },

    resetPlay: (id) => {
      const state = get()
      get().pushHistory()
      const newPlays = state.plays.map(p => {
        if (p.id !== id) return p
        return {
          ...p,
          players: createInitialPlayers(),
          ball: createInitialBall(),
          duration: 40000,
        }
      })
      set({ plays: newPlays, isDirty: true, currentTime: 0, isPlaying: false, animatedPositions: null, animatedBall: null })
      savePlays(newPlays)
    },

    resetMovements: (id) => {
      const state = get()
      get().pushHistory()
      const newPlays = state.plays.map(p => {
        if (p.id !== id) return p
        const players = p.players.map(pl => ({ ...pl, trajectory: [] }))
        const ball = { ...p.ball, trajectory: [] }
        return { ...p, players, ball }
      })
      set({ plays: newPlays, isDirty: true, currentTime: 0, isPlaying: false, animatedPositions: null, animatedBall: null })
      savePlays(newPlays)
    },

    addOpponentPlayer: () => {
      const state = get()
      const play = state.plays.find(p => p.id === state.currentPlayId)
      if (!play) return
      const awayPlayers = play.players.filter(p => p.team === 'away')
      if (awayPlayers.length >= 15) return
      get().pushHistory()
      const maxId = awayPlayers.length > 0 ? Math.max(...awayPlayers.map(p => p.id)) : 100
      const number = awayPlayers.length + 1
      const col = awayPlayers.length % 5
      const row = Math.floor(awayPlayers.length / 5)
      const newPlayer: Player = {
        id: maxId + 1,
        number,
        team: 'away',
        color: AWAY_PLAYER_COLOR,
        x: FIELD_PX.width / 2 + (col - 2) * 4 * SCALE,
        y: FIELD_PX.halfway + 5 * SCALE + row * 4 * SCALE,
        trajectory: [],
      }
      const newPlays = state.plays.map(p =>
        p.id === state.currentPlayId ? { ...p, players: [...p.players, newPlayer] } : p
      )
      set({ plays: newPlays, isDirty: true })
      savePlays(newPlays)
    },

    removePlayer: (id) => {
      const state = get()
      const play = state.plays.find(p => p.id === state.currentPlayId)
      if (!play) return
      get().pushHistory()
      const newPlays = state.plays.map(p => {
        if (p.id !== state.currentPlayId) return p
        return { ...p, players: p.players.filter(pl => pl.id !== id) }
      })
      const newSelectedIds = state.selectedPlayerIds.filter(i => i !== id)
      set({
        plays: newPlays,
        isDirty: true,
        selectedPlayerIds: newSelectedIds,
        selectedPlayerId: newSelectedIds.includes(state.selectedPlayerId ?? -1) ? state.selectedPlayerId : null,
      })
      savePlays(newPlays)
    },

    setEditMode: (mode) => set({ editMode: mode }),
    setSelectedPlayer: (id) => set({ selectedPlayerId: id, selectedPlayerIds: id !== null ? [id] : [], selectedBall: false }),
    toggleSelectedPlayer: (id) => set(state => {
      const ids = state.selectedPlayerIds.includes(id)
        ? state.selectedPlayerIds.filter(i => i !== id)
        : [...state.selectedPlayerIds, id]
      return { selectedPlayerIds: ids, selectedPlayerId: id, selectedBall: false }
    }),
    setSelectedBall: (selected) => set({ selectedBall: selected, selectedPlayerId: null, selectedPlayerIds: [] }),

    movePlayer: (id, x, y) => {
      updateCurrentPlay(
        play => ({ ...play, players: play.players.map(p => (p.id === id ? { ...p, x, y } : p)) }),
        { history: true, extra: { animatedPositions: null, animatedBall: null } },
      )
    },

    moveBall: (x, y) => {
      updateCurrentPlay(
        play => ({ ...play, ball: { ...play.ball, x, y } }),
        { history: true, extra: { animatedPositions: null, animatedBall: null } },
      )
    },

    setBallCarrier: (playerId) => {
      updateCurrentPlay(play => {
        const player = playerId ? play.players.find(pl => pl.id === playerId) : null
        const ballX = player ? player.x : play.ball.x
        const ballY = player ? player.y : play.ball.y
        return { ...play, ball: { ...play.ball, carriedBy: playerId, x: ballX, y: ballY } }
      }, { save: false })
    },

    startRecording: () => {
      const state = get()
      const play = state.plays.find(p => p.id === state.currentPlayId)
      if (!play) return

      // El offset es el tiempo actual de la jugada: la grabación se encadena desde aquí.
      const timeOffset = state.currentTime
      const movements: RecordedMovement[] = []

      for (const playerId of state.selectedPlayerIds) {
        const player = play.players.find(p => p.id === playerId)
        if (player) {
          // Usar posición animada (si existe) o interpolada desde la trayectoria actual,
          // para que la nueva grabación arranque exactamente desde donde está el jugador.
          const animPos = state.animatedPositions?.[playerId]
          let startX = player.x
          let startY = player.y
          if (animPos) {
            startX = animPos.x
            startY = animPos.y
          } else if (player.trajectory.length > 0 && timeOffset > 0) {
            const pos = getInterpolatedPosition(player.trajectory, timeOffset, { x: player.x, y: player.y })
            if (pos) { startX = pos.x; startY = pos.y }
          }
          movements.push({ playerId, points: [{ x: startX, y: startY, time: timeOffset }] })
        }
      }

      if (state.selectedBall) {
        const animBall = state.animatedBall
        let startX = play.ball.x
        let startY = play.ball.y
        if (animBall) {
          startX = animBall.x
          startY = animBall.y
        } else if (play.ball.trajectory.length > 0 && timeOffset > 0) {
          const pos = getInterpolatedPosition(play.ball.trajectory, timeOffset, { x: play.ball.x, y: play.ball.y })
          if (pos) { startX = pos.x; startY = pos.y }
        }
        movements.push({ playerId: -1, points: [{ x: startX, y: startY, time: timeOffset }] })
      }

      if (movements.length === 0) return

      set({
        isPlaying: false,
        isRecording: true,
        recordingStartTime: performance.now(),
        recordingTimeOffset: timeOffset,
        recordedMovements: movements,
      })
    },

    stopRecording: () => {
      const state = get()
      if (!state.isRecording) return
      set({ isRecording: false })
    },

    addRecordingPoint: (playerId, x, y) => {
      const state = get()
      if (!state.isRecording || state.recordingStartTime === null) return
      // Los timestamps son absolutos: elapsed desde el inicio de la sesión + offset del play.
      const elapsed = performance.now() - state.recordingStartTime + state.recordingTimeOffset
      set({
        recordedMovements: state.recordedMovements.map(m =>
          m.playerId === playerId
            ? { ...m, points: [...m.points, { x, y, time: elapsed }] }
            : m
        ),
      })
    },

    finishRecording: () => {
      const state = get()
      if (!state.isRecording) return
      const play = state.plays.find(p => p.id === state.currentPlayId)
      if (!play) return
      get().pushHistory()

      const timeOffset = state.recordingTimeOffset
      let newPlays = [...state.plays]
      let maxDuration = play.duration
      let newCurrentTime = timeOffset

      // Posiciones finales de cada jugador/pelota grabados, para mantenerlos
      // visualmente en su posición de destino después de terminar la grabación.
      const finalAnimPos: Record<number, { x: number; y: number }> = {}
      let finalAnimBall: { x: number; y: number } | null = state.animatedBall

      for (const movement of state.recordedMovements) {
        if (movement.points.length < 2) continue
        const lastPoint = movement.points[movement.points.length - 1]
        const lastTime = lastPoint.time
        maxDuration = Math.max(maxDuration, lastTime)
        newCurrentTime = Math.max(newCurrentTime, lastTime)

        if (movement.playerId === -1) {
          finalAnimBall = { x: lastPoint.x, y: lastPoint.y }
          newPlays = newPlays.map(p => {
            if (p.id !== state.currentPlayId) return p
            // Conservar puntos anteriores al offset y agregar los nuevos encadenados.
            const before = p.ball.trajectory.filter(pt => pt.time < timeOffset)
            return { ...p, ball: { ...p.ball, trajectory: [...before, ...movement.points] } }
          })
        } else {
          finalAnimPos[movement.playerId] = { x: lastPoint.x, y: lastPoint.y }
          newPlays = newPlays.map(p => {
            if (p.id !== state.currentPlayId) return p
            const newPlayers = p.players.map(pl => {
              if (pl.id !== movement.playerId) return pl
              const before = pl.trajectory.filter(pt => pt.time < timeOffset)
              return { ...pl, trajectory: [...before, ...movement.points] }
            })
            return { ...p, players: newPlayers }
          })
        }
      }

      // Aplicar duración actualizada a la jugada actual
      newPlays = newPlays.map(p =>
        p.id === state.currentPlayId ? { ...p, duration: maxDuration } : p
      )

      // Hacer merge de las posiciones finales con las previas para que los
      // jugadores grabados anteriormente no reviertan a su posición base.
      const mergedAnimPos = Object.keys(finalAnimPos).length > 0
        ? { ...(state.animatedPositions ?? {}), ...finalAnimPos }
        : state.animatedPositions

      set({
        plays: newPlays,
        isRecording: false,
        recordingStartTime: null,
        recordingTimeOffset: 0,
        recordedMovements: [],
        isDirty: true,
        currentTime: newCurrentTime,
        animatedPositions: mergedAnimPos,
        animatedBall: finalAnimBall,
      })
      savePlays(newPlays)
    },

    updateTrajectoryPoint: (playerId, pointIndex, x, y) => {
      updateCurrentPlay(play => ({
        ...play,
        players: play.players.map(pl =>
          pl.id === playerId
            ? { ...pl, trajectory: pl.trajectory.map((pt, i) => (i === pointIndex ? { ...pt, x, y } : pt)) }
            : pl,
        ),
      }), { history: true })
    },

    deleteTrajectoryPoint: (playerId, pointIndex) => {
      updateCurrentPlay(play => ({
        ...play,
        players: play.players.map(pl =>
          pl.id === playerId ? { ...pl, trajectory: pl.trajectory.filter((_, i) => i !== pointIndex) } : pl,
        ),
      }), { history: true })
    },

    addTrajectoryPoint: (playerId, point) => {
      updateCurrentPlay(play => ({
        ...play,
        players: play.players.map(pl =>
          pl.id === playerId ? { ...pl, trajectory: [...pl.trajectory, point] } : pl,
        ),
      }), { history: true })
    },

    clearPlayerTrajectory: (playerId) => {
      updateCurrentPlay(play => ({
        ...play,
        players: play.players.map(pl => (pl.id === playerId ? { ...pl, trajectory: [] } : pl)),
      }), { history: true })
    },

    clearBallTrajectory: () => {
      updateCurrentPlay(play => ({ ...play, ball: { ...play.ball, trajectory: [] } }), { history: true })
    },

    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setCurrentTime: (time) => set({ currentTime: time }),
    setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

    resetPlayback: () => {
      set({ currentTime: 0, isPlaying: false, animatedPositions: null, animatedBall: null })
    },

    // Solo actualiza el estado efímero de animación. NO muta `plays`: las
    // posiciones base se conservan y el canvas las combina al renderizar.
    setAnimatingPositions: (positions, ballPos) => {
      set({ animatedPositions: positions, animatedBall: ballPos })
    },

    clearAnimatingPositions: () => set({ animatedPositions: null, animatedBall: null }),

    setZoom: (zoom) => set(state => ({ view: { ...state.view, zoom: Math.max(0.1, Math.min(10, zoom)) } })),
    setPan: (x, y) => set(state => ({ view: { ...state.view, panX: x, panY: y } })),

    toggleExportDialog: () => set(state => ({ showExportDialog: !state.showExportDialog })),
    toggleLibrary: () => set(state => ({ showLibrary: !state.showLibrary })),
    setShowFormation: (type) => set({ showFormation: type }),
    toggleMultiSelect: () => set(state => ({ multiSelect: !state.multiSelect })),
    fitCanvas: () => set(state => ({ requestFit: state.requestFit + 1 })),
    toggleLoopPlayback: () => set(state => ({ loopPlayback: !state.loopPlayback })),
    toggleHalfField: () => set(state => ({ halfField: !state.halfField, requestFit: state.requestFit + 1 })),
    togglePresentationMode: () => set(state => ({
      presentationMode: !state.presentationMode,
      // al entrar: salir de edición, deseleccionar, recentrar
      editMode: !state.presentationMode ? 'select' : state.editMode,
      selectedPlayerId: null,
      selectedPlayerIds: [],
      selectedBall: false,
      isPlaying: false,
      currentTime: 0,
      requestFit: state.requestFit + 1,
    })),

    loadFromJson: (json) => {
      try {
        const play = JSON.parse(json) as Play
        const state = get()
        const existingIndex = state.plays.findIndex(p => p.id === play.id)
        let newPlays: Play[]
        if (existingIndex >= 0) {
          newPlays = state.plays.map((p, i) => i === existingIndex ? play : p)
        } else {
          newPlays = [...state.plays, play]
        }
        set({ plays: newPlays, currentPlayId: play.id, isDirty: true })
        savePlays(newPlays)
        saveCurrentPlayId(play.id)
      } catch {
        console.error('Invalid JSON')
      }
    },

    exportToJson: () => {
      const state = get()
      const play = state.plays.find(p => p.id === state.currentPlayId)
      return play ? JSON.stringify(play, null, 2) : null
    },

    pushHistory: () => {
      const state = get()
      const snapshot = clonePlays(state.plays)
      set({
        history: [...state.history.slice(-49), snapshot],
        future: [],
      })
    },

    undo: () => {
      const state = get()
      if (state.history.length === 0) return
      const prev = state.history[state.history.length - 1]
      const currentSnapshot = clonePlays(state.plays)
      set({
        plays: prev,
        history: state.history.slice(0, -1),
        future: [currentSnapshot, ...state.future.slice(0, 49)],
        isDirty: true,
      })
      savePlays(prev)
    },

    redo: () => {
      const state = get()
      if (state.future.length === 0) return
      const next = state.future[0]
      const currentSnapshot = clonePlays(state.plays)
      set({
        plays: next,
        history: [...state.history.slice(-49), currentSnapshot],
        future: state.future.slice(1),
        isDirty: true,
      })
      savePlays(next)
    },

    setExportPNG: (fn) => set({ exportPNG: fn }),
    setExportVideo: (fn) => set({ exportVideo: fn }),

    toggleSnapToGrid: () => set(state => ({ snapToGrid: !state.snapToGrid })),

    updatePlayer: (id, updates) => {
      updateCurrentPlay(play => ({
        ...play,
        players: play.players.map(pl => (pl.id === id ? { ...pl, ...updates } : pl)),
      }), { history: true })
    },

    updatePlayTags: (id, tags) => {
      const state = get()
      const newPlays = state.plays.map(p => p.id === id ? { ...p, tags } : p)
      set({ plays: newPlays, isDirty: true })
      savePlays(newPlays)
    },

    mirrorPlay: (id) => {
      const state = get()
      const play = state.plays.find(p => p.id === id)
      if (!play) return
      get().pushHistory()
      const newPlayers = play.players.map(p => ({
        ...p,
        x: -p.x,
        trajectory: p.trajectory.map(pt => ({ ...pt, x: -pt.x })),
      }))
      const newBall = {
        ...play.ball,
        x: -play.ball.x,
        trajectory: play.ball.trajectory.map(pt => ({ ...pt, x: -pt.x })),
      }
      const newPlay = { ...play, players: newPlayers, ball: newBall }
      const newPlays = state.plays.map(p => p.id === id ? newPlay : p)
      set({ plays: newPlays, isDirty: true })
      savePlays(newPlays)
    },

    addZone: (zone) => {
      const newZone: TacticalZone = { ...zone, id: generateId() }
      updateCurrentPlay(play => ({ ...play, zones: [...(play.zones ?? []), newZone] }))
    },

    removeZone: (id) => {
      updateCurrentPlay(play => ({ ...play, zones: (play.zones ?? []).filter(z => z.id !== id) }))
    },

    updateZone: (id, updates) => {
      updateCurrentPlay(play => ({
        ...play,
        zones: (play.zones ?? []).map(z => (z.id === id ? { ...z, ...updates } : z)),
      }))
    },

    setOverlayImage: (dataURL) => {
      const overlay: OverlayImage = {
        dataURL,
        x: FIELD_PX.width / 2 - 100,
        y: FIELD_PX.totalLength / 2 - 100,
        width: 200,
        height: 200,
        opacity: 0.5,
      }
      updateCurrentPlay(play => ({ ...play, overlayImage: overlay }))
    },

    updateOverlayImage: (updates) => {
      updateCurrentPlay(play =>
        play.overlayImage ? { ...play, overlayImage: { ...play.overlayImage, ...updates } } : play,
      )
    },

    clearOverlayImage: () => {
      updateCurrentPlay(play => {
        const { overlayImage: _omit, ...rest } = play
        return rest as Play
      })
    },

    reorderPlays: (from, to) => {
      const state = get()
      const newPlays = [...state.plays]
      const [moved] = newPlays.splice(from, 1)
      newPlays.splice(to, 0, moved)
      set({ plays: newPlays, isDirty: true })
      savePlays(newPlays)
    },

    setPlaysFromServer: (serverPlays) => {
      // Merge: server manda como fuente de verdad.
      // Las jugadas locales que no están en el servidor (aún no sincronizadas) se conservan.
      const state = get()
      const serverIds = new Set(serverPlays.map(p => p.id))
      const localOnly = state.plays.filter(p => !serverIds.has(p.id))
      const merged = [...serverPlays, ...localOnly]
      set({ plays: merged })
      savePlays(merged)
    },
  }
})

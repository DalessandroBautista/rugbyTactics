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
  FIELD_PX,
  SCALE,
  PLAY_CATEGORIES,
} from '../types'
import { loadPlays, savePlays, loadCurrentPlayId, saveCurrentPlayId } from '../utils/persistence'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

function createInitialPlayers(): Player[] {
  const startX = FIELD_PX.width / 2
  const startY = FIELD_PX.halfway - 5 * SCALE
  return Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    number: i + 1,
    color: DEFAULT_PLAYER_COLORS[i % DEFAULT_PLAYER_COLORS.length],
    x: startX + ((i % 5) - 2) * 4 * SCALE,
    y: startY + Math.floor(i / 5) * 4 * SCALE,
    trajectory: [],
  }))
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
  showExportDialog: boolean
  showLibrary: boolean
  showFormation: 'lineout' | 'scrum' | null
  isDirty: boolean
  multiSelect: boolean

  getCurrentPlay: () => Play | null
  setCurrentPlay: (id: string) => void

  createPlay: (name: string, description: string, category: string) => void
  duplicatePlay: (id: string) => void
  deletePlay: (id: string) => void
  resetPlay: (id: string) => void
  resetMovements: (id: string) => void
  updatePlay: (id: string, updates: Partial<Play>) => void

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

  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void

  toggleExportDialog: () => void
  toggleLibrary: () => void
  setShowFormation: (type: 'lineout' | 'scrum' | null) => void
  toggleMultiSelect: () => void

  loadFromJson: (json: string) => void
  exportToJson: () => string | null
}

export const useStore = create<PlayStore>((set, get) => {
  const storedPlays = loadPlays()
  const storedCurrentId = loadCurrentPlayId()
  const initialPlays = storedPlays.length > 0 ? storedPlays : [createPlay('Nueva Jugada', '', 'General')]
  const initialPlayId = storedCurrentId && initialPlays.find(p => p.id === storedCurrentId) ? storedCurrentId : initialPlays[0].id

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
    showExportDialog: false,
    showLibrary: false,
    showFormation: null,
    isDirty: false,
    multiSelect: false,

    getCurrentPlay: () => {
      const state = get()
      return state.plays.find(p => p.id === state.currentPlayId) || null
    },

    setCurrentPlay: (id) => {
      set({ currentPlayId: id, currentTime: 0, isPlaying: false, selectedPlayerId: null, selectedPlayerIds: [], selectedBall: false })
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
        ...JSON.parse(JSON.stringify(original)),
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

    resetPlay: (id) => {
      const state = get()
      const newPlays = state.plays.map(p => {
        if (p.id !== id) return p
        return {
          ...p,
          players: createInitialPlayers(),
          ball: createInitialBall(),
          duration: 40000,
        }
      })
      set({ plays: newPlays, isDirty: true, currentTime: 0, isPlaying: false })
      savePlays(newPlays)
    },

    resetMovements: (id) => {
      const state = get()
      const newPlays = state.plays.map(p => {
        if (p.id !== id) return p
        const players = p.players.map(pl => ({ ...pl, trajectory: [] }))
        const ball = { ...p.ball, trajectory: [] }
        return { ...p, players, ball }
      })
      set({ plays: newPlays, isDirty: true, currentTime: 0, isPlaying: false })
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
      const state = get()
      const play = state.plays.find(p => p.id === state.currentPlayId)
      if (!play) return
      const newPlayers = play.players.map(p =>
        p.id === id ? { ...p, x, y } : p
      )
      const newPlays = state.plays.map(p =>
        p.id === state.currentPlayId ? { ...p, players: newPlayers } : p
      )
      set({ plays: newPlays, isDirty: true })
    },

    moveBall: (x, y) => {
      const state = get()
      const newPlays = state.plays.map(p => {
        if (p.id !== state.currentPlayId) return p
        return { ...p, ball: { ...p.ball, x, y } }
      })
      set({ plays: newPlays, isDirty: true })
    },

    setBallCarrier: (playerId) => {
      const state = get()
      const newPlays = state.plays.map(p => {
        if (p.id !== state.currentPlayId) return p
        const player = playerId ? p.players.find(pl => pl.id === playerId) : null
        const ballX = player ? player.x : p.ball.x
        const ballY = player ? player.y : p.ball.y
        return { ...p, ball: { ...p.ball, carriedBy: playerId, x: ballX, y: ballY } }
      })
      set({ plays: newPlays, isDirty: true })
    },

    startRecording: () => {
      const state = get()
      if (state.selectedPlayerId === null && !state.selectedBall) return
      if (state.selectedPlayerId !== null) {
        const playerId = state.selectedPlayerId
        const play = state.plays.find(p => p.id === state.currentPlayId)
        if (!play) return
        const player = play.players.find(p => p.id === playerId)
        if (!player) return
        const startPoint: TrajectoryPoint = { x: player.x, y: player.y, time: 0 }
        set({
          isRecording: true,
          recordingStartTime: performance.now(),
          recordedMovements: [{ playerId, points: [startPoint] }],
        })
      } else if (state.selectedBall) {
        const play = state.plays.find(p => p.id === state.currentPlayId)
        if (!play) return
        const startPoint: TrajectoryPoint = { x: play.ball.x, y: play.ball.y, time: 0 }
        set({
          isRecording: true,
          recordingStartTime: performance.now(),
          recordedMovements: [{ playerId: -1, points: [startPoint] }],
        })
      }
    },

    stopRecording: () => {
      const state = get()
      if (!state.isRecording) return
      set({ isRecording: false })
    },

    addRecordingPoint: (playerId, x, y) => {
      const state = get()
      if (!state.isRecording || state.recordingStartTime === null) return
      const elapsed = performance.now() - state.recordingStartTime
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
      let newPlays = [...state.plays]
      let maxDuration = play.duration
      for (const movement of state.recordedMovements) {
        if (movement.points.length < 2) continue
        if (movement.playerId === -1) {
          newPlays = newPlays.map(p => {
            if (p.id !== state.currentPlayId) return p
            maxDuration = Math.max(maxDuration, movement.points[movement.points.length - 1].time)
            return { ...p, ball: { ...p.ball, trajectory: movement.points }, duration: maxDuration }
          })
        } else {
          newPlays = newPlays.map(p => {
            if (p.id !== state.currentPlayId) return p
            const newPlayers = p.players.map(pl =>
              pl.id === movement.playerId
                ? { ...pl, trajectory: movement.points }
                : pl
            )
            maxDuration = Math.max(maxDuration, movement.points[movement.points.length - 1].time)
            return { ...p, players: newPlayers, duration: maxDuration }
          })
        }
      }
      set({
        plays: newPlays,
        isRecording: false,
        recordingStartTime: null,
        recordedMovements: [],
        isDirty: true,
      })
      savePlays(newPlays)
    },

    updateTrajectoryPoint: (playerId, pointIndex, x, y) => {
      const state = get()
      const play = state.plays.find(p => p.id === state.currentPlayId)
      if (!play) return
      const newPlays = state.plays.map(p => {
        if (p.id !== state.currentPlayId) return p
        const newPlayers = p.players.map(pl => {
          if (pl.id !== playerId) return pl
          const newTrajectory = pl.trajectory.map((pt, i) =>
            i === pointIndex ? { ...pt, x, y } : pt
          )
          return { ...pl, trajectory: newTrajectory }
        })
        return { ...p, players: newPlayers }
      })
      set({ plays: newPlays, isDirty: true })
      savePlays(newPlays)
    },

    deleteTrajectoryPoint: (playerId, pointIndex) => {
      const state = get()
      const play = state.plays.find(p => p.id === state.currentPlayId)
      if (!play) return
      const newPlays = state.plays.map(p => {
        if (p.id !== state.currentPlayId) return p
        const newPlayers = p.players.map(pl => {
          if (pl.id !== playerId) return pl
          const newTrajectory = pl.trajectory.filter((_, i) => i !== pointIndex)
          return { ...pl, trajectory: newTrajectory }
        })
        return { ...p, players: newPlayers }
      })
      set({ plays: newPlays, isDirty: true })
      savePlays(newPlays)
    },

    addTrajectoryPoint: (playerId, point) => {
      const state = get()
      const play = state.plays.find(p => p.id === state.currentPlayId)
      if (!play) return
      const newPlays = state.plays.map(p => {
        if (p.id !== state.currentPlayId) return p
        const newPlayers = p.players.map(pl => {
          if (pl.id !== playerId) return pl
          return { ...pl, trajectory: [...pl.trajectory, point] }
        })
        return { ...p, players: newPlayers }
      })
      set({ plays: newPlays, isDirty: true })
      savePlays(newPlays)
    },

    clearPlayerTrajectory: (playerId) => {
      const state = get()
      const play = state.plays.find(p => p.id === state.currentPlayId)
      if (!play) return
      const newPlays = state.plays.map(p => {
        if (p.id !== state.currentPlayId) return p
        const newPlayers = p.players.map(pl =>
          pl.id === playerId ? { ...pl, trajectory: [] } : pl
        )
        return { ...p, players: newPlayers }
      })
      set({ plays: newPlays, isDirty: true })
      savePlays(newPlays)
    },

    clearBallTrajectory: () => {
      const state = get()
      const newPlays = state.plays.map(p => {
        if (p.id !== state.currentPlayId) return p
        return { ...p, ball: { ...p.ball, trajectory: [] } }
      })
      set({ plays: newPlays, isDirty: true })
      savePlays(newPlays)
    },

    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setCurrentTime: (time) => set({ currentTime: time }),
    setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

    resetPlayback: () => {
      set({ currentTime: 0, isPlaying: false })
    },

    setAnimatingPositions: (positions, ballPos) => {
      const state = get()
      const play = state.plays.find(p => p.id === state.currentPlayId)
      if (!play) return
      const newPlayers = play.players.map(p => {
        const pos = positions[p.id]
        return pos ? { ...p, x: pos.x, y: pos.y } : p
      })
      const newBall = ballPos ? { ...play.ball, x: ballPos.x, y: ballPos.y } : play.ball
      const newPlays = state.plays.map(p =>
        p.id === state.currentPlayId ? { ...p, players: newPlayers, ball: newBall } : p
      )
      set({ plays: newPlays })
    },

    setZoom: (zoom) => set(state => ({ view: { ...state.view, zoom: Math.max(0.3, Math.min(2, zoom)) } })),
    setPan: (x, y) => set(state => ({ view: { ...state.view, panX: x, panY: y } })),

    toggleExportDialog: () => set(state => ({ showExportDialog: !state.showExportDialog })),
    toggleLibrary: () => set(state => ({ showLibrary: !state.showLibrary })),
    setShowFormation: (type) => set({ showFormation: type }),
    toggleMultiSelect: () => set(state => ({ multiSelect: !state.multiSelect })),

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
  }
})

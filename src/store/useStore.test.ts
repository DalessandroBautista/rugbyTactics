import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from './useStore'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useStore', () => {
  beforeEach(() => {
    localStorageMock.clear()
    // Reset store to initial state
    useStore.setState({
      plays: useStore.getState().plays.length > 0
        ? useStore.getState().plays
        : [useStore.getState().plays[0]],
      currentPlayId: useStore.getState().currentPlayId,
      history: [],
      future: [],
      selectedPlayerId: null,
      selectedPlayerIds: [],
      selectedBall: false,
    })
  })

  it('creates a play with 15 home players', () => {
    const state = useStore.getState()
    const play = state.plays.find(p => p.id === state.currentPlayId)
    expect(play).toBeDefined()
    expect(play!.players.filter(p => p.team === 'home').length).toBe(15)
  })

  it('movePlayer updates position correctly', () => {
    const state = useStore.getState()
    const player = state.plays[0].players[0]

    useStore.getState().movePlayer(player.id, 100, 200)

    const newState = useStore.getState()
    const updatedPlayer = newState.plays.find(p => p.id === newState.currentPlayId)!.players.find(p => p.id === player.id)
    expect(updatedPlayer!.x).toBe(100)
    expect(updatedPlayer!.y).toBe(200)
  })

  it('undo restores previous position after movePlayer', () => {
    const state = useStore.getState()
    const player = state.plays[0].players[0]
    const originalX = player.x
    const originalY = player.y

    useStore.getState().movePlayer(player.id, 100, 200)
    expect(useStore.getState().history.length).toBeGreaterThan(0)

    useStore.getState().undo()

    const restored = useStore.getState().plays.find(p => p.id === useStore.getState().currentPlayId)!.players.find(p => p.id === player.id)
    expect(restored!.x).toBe(originalX)
    expect(restored!.y).toBe(originalY)
  })

  it('redo restores position after undo', () => {
    const state = useStore.getState()
    const player = state.plays[0].players[0]

    useStore.getState().movePlayer(player.id, 100, 200)
    useStore.getState().undo()
    useStore.getState().redo()

    const redone = useStore.getState().plays.find(p => p.id === useStore.getState().currentPlayId)!.players.find(p => p.id === player.id)
    expect(redone!.x).toBe(100)
    expect(redone!.y).toBe(200)
  })

  it('toggleSelectedPlayer adds and removes correctly', () => {
    const state = useStore.getState()
    const playerId = state.plays[0].players[0].id

    useStore.getState().toggleSelectedPlayer(playerId)
    expect(useStore.getState().selectedPlayerIds).toContain(playerId)

    useStore.getState().toggleSelectedPlayer(playerId)
    expect(useStore.getState().selectedPlayerIds).not.toContain(playerId)
  })

  it('setAnimatingPositions does NOT mutate base player positions in plays', () => {
    const state = useStore.getState()
    const player = state.plays[0].players[0]
    const baseX = player.x
    const baseY = player.y

    useStore.getState().setAnimatingPositions({ [player.id]: { x: 999, y: 888 } }, { x: 1, y: 2 })

    // El estado efímero refleja la animación
    expect(useStore.getState().animatedPositions![player.id]).toEqual({ x: 999, y: 888 })
    expect(useStore.getState().animatedBall).toEqual({ x: 1, y: 2 })
    // Pero las posiciones base en `plays` no cambian
    const stillBase = useStore.getState().plays[0].players.find(p => p.id === player.id)!
    expect(stillBase.x).toBe(baseX)
    expect(stillBase.y).toBe(baseY)
  })

  it('clearAnimatingPositions resets the ephemeral state', () => {
    useStore.getState().setAnimatingPositions({ 1: { x: 5, y: 5 } }, { x: 0, y: 0 })
    useStore.getState().clearAnimatingPositions()
    expect(useStore.getState().animatedPositions).toBeNull()
    expect(useStore.getState().animatedBall).toBeNull()
  })

  it('movePlayer clears any active animation state', () => {
    const player = useStore.getState().plays[0].players[0]
    useStore.getState().setAnimatingPositions({ [player.id]: { x: 7, y: 7 } }, null)
    useStore.getState().movePlayer(player.id, 50, 60)
    expect(useStore.getState().animatedPositions).toBeNull()
  })
})

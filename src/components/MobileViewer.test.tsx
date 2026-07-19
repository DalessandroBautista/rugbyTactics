import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '../store/useStore'
import { MobileViewer } from './MobileViewer'

vi.mock('./FieldCanvas', () => ({ FieldCanvas: () => <div data-testid="field" /> }))

describe('MobileViewer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    if (useStore.getState().playlistViewer) useStore.getState().closePlaylistViewer()
    useStore.setState({ isPlaying: false, currentTime: 0, playlistViewer: null })
  })

  afterEach(() => {
    if (useStore.getState().playlistViewer) useStore.getState().closePlaylistViewer()
    vi.useRealTimers()
  })

  it('asks the user to rotate while keeping playback available', () => {
    render(<MobileViewer isLandscape={false} onExit={() => {}} />)
    expect(screen.getByRole('status').textContent).toContain('Gir')
    expect(screen.getByRole('button', { name: 'Reproducir' })).toBeTruthy()
  })

  it('hides controls after three seconds of playback and restores them on tap', () => {
    render(<MobileViewer isLandscape onExit={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }))
    act(() => { vi.advanceTimersByTime(3_000) })
    expect(screen.queryByRole('button', { name: 'Pausar' })).toBeNull()
    fireEvent.click(screen.getByTestId('mobile-viewer'))
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeTruthy()
  })

  it('advances to the next playlist play after the current one finishes', () => {
    const first = structuredClone(useStore.getState().plays[0])
    first.id = 'mobile-first'
    first.duration = 100
    const second = structuredClone(first)
    second.id = 'mobile-second'
    second.name = 'Segunda jugada'
    useStore.getState().openPlaylistViewer({ id: 'mobile-list', name: 'Lista móvil', plays: [first, second] })
    render(<MobileViewer isLandscape onExit={() => {}} />)

    act(() => useStore.setState({ currentTime: first.duration, isPlaying: false }))
    act(() => { vi.advanceTimersByTime(1_550) })

    expect(useStore.getState().currentPlayId).toBe(second.id)
    expect(useStore.getState().isPlaying).toBe(true)
  })
})

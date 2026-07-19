import { describe, expect, it } from 'vitest'
import { calculatePinchZoom, enterImmersiveMode, exitImmersiveMode, initialMobileView, isMobileDevice, mobileViewReducer, shouldShowViewerControls } from './mobile'

describe('mobile experience', () => {
  it('uses the shortest screen side so rotation does not switch to desktop', () => {
    expect(isMobileDevice({ width: 390, height: 844, coarsePointer: true })).toBe(true)
    expect(isMobileDevice({ width: 844, height: 390, coarsePointer: true })).toBe(true)
    expect(isMobileDevice({ width: 1440, height: 900, coarsePointer: false })).toBe(false)
  })

  it('recognises mobile browsers when an embedded browser misreports its pointer', () => {
    expect(isMobileDevice({ width: 390, height: 844, coarsePointer: false, mobileBrowser: true })).toBe(true)
    expect(isMobileDevice({ width: 390, height: 844, coarsePointer: false, mobileBrowser: false })).toBe(false)
  })

  it('moves between library, viewer and quick edit', () => {
    expect(mobileViewReducer('library', { type: 'VIEW' })).toBe('viewer')
    expect(mobileViewReducer('library', { type: 'EDIT' })).toBe('quick-edit')
    expect(mobileViewReducer('quick-edit', { type: 'BACK' })).toBe('library')
    expect(mobileViewReducer('viewer', { type: 'BACK' })).toBe('library')
  })

  it('opens shared content directly in the mobile viewer', () => {
    expect(initialMobileView({ mobile: true, shared: true })).toBe('viewer')
    expect(initialMobileView({ mobile: true, shared: false })).toBe('library')
    expect(initialMobileView({ mobile: false, shared: true })).toBe('desktop')
  })

  it('keeps controls visible while paused and hides them after inactivity', () => {
    expect(shouldShowViewerControls({ playing: false, manuallyVisible: false, idleMs: 9_000 })).toBe(true)
    expect(shouldShowViewerControls({ playing: true, manuallyVisible: true, idleMs: 2_999 })).toBe(true)
    expect(shouldShowViewerControls({ playing: true, manuallyVisible: true, idleMs: 3_000 })).toBe(false)
  })

  it('falls back safely when fullscreen or orientation lock is rejected', async () => {
    const entered = await enterImmersiveMode({
      requestFullscreen: async () => { throw new Error('unsupported') },
      lockLandscape: async () => { throw new Error('not allowed') },
    })
    expect(entered).toEqual({ fullscreen: false, orientationLocked: false })
  })

  it('only exits immersive capabilities started by the app', async () => {
    let fullscreenExits = 0
    let unlocks = 0
    await exitImmersiveMode(
      { fullscreen: true, orientationLocked: false },
      { exitFullscreen: async () => { fullscreenExits += 1 }, unlockOrientation: () => { unlocks += 1 } },
    )
    expect(fullscreenExits).toBe(1)
    expect(unlocks).toBe(0)
  })

  it('calculates bounded pinch zoom', () => {
    expect(calculatePinchZoom({ zoom: 1, previousDistance: 100, distance: 150, minimum: 0.5 })).toBe(1.5)
    expect(calculatePinchZoom({ zoom: 0.6, previousDistance: 100, distance: 50, minimum: 0.5 })).toBe(0.5)
  })
})

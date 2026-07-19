export type MobileView = 'library' | 'viewer' | 'quick-edit' | 'desktop'
export type MobileViewAction = { type: 'VIEW' | 'EDIT' | 'DESKTOP' | 'BACK' }

export function initialMobileView(input: { mobile: boolean; shared: boolean }): MobileView {
  if (!input.mobile) return 'desktop'
  return input.shared ? 'viewer' : 'library'
}

export function isMobileDevice(input: { width: number; height: number; coarsePointer: boolean; mobileBrowser?: boolean }): boolean {
  return (input.coarsePointer || input.mobileBrowser === true) && Math.min(input.width, input.height) <= 768
}

export function mobileViewReducer(view: MobileView, action: MobileViewAction): MobileView {
  if (action.type === 'VIEW') return 'viewer'
  if (action.type === 'EDIT') return 'quick-edit'
  if (action.type === 'DESKTOP') return 'desktop'
  if (action.type === 'BACK') return view === 'desktop' ? 'desktop' : 'library'
  return view
}

export function shouldShowViewerControls(input: {
  playing: boolean
  manuallyVisible: boolean
  idleMs: number
}): boolean {
  if (!input.playing) return true
  return input.manuallyVisible && input.idleMs < 3_000
}

export interface ImmersiveState { fullscreen: boolean; orientationLocked: boolean }

export async function enterImmersiveMode(capabilities: {
  requestFullscreen?: () => Promise<void>
  lockLandscape?: () => Promise<void>
}): Promise<ImmersiveState> {
  let fullscreen = false
  let orientationLocked = false
  try {
    await capabilities.requestFullscreen?.()
    fullscreen = Boolean(capabilities.requestFullscreen)
  } catch { /* progressive enhancement */ }
  try {
    await capabilities.lockLandscape?.()
    orientationLocked = Boolean(capabilities.lockLandscape)
  } catch { /* progressive enhancement */ }
  return { fullscreen, orientationLocked }
}

export async function exitImmersiveMode(
  state: ImmersiveState,
  capabilities: { exitFullscreen?: () => Promise<void>; unlockOrientation?: () => void },
): Promise<void> {
  if (state.orientationLocked) {
    try { capabilities.unlockOrientation?.() } catch { /* already unlocked */ }
  }
  if (state.fullscreen) {
    try { await capabilities.exitFullscreen?.() } catch { /* already exited */ }
  }
}

export function calculatePinchZoom(input: {
  zoom: number
  previousDistance: number
  distance: number
  minimum: number
}): number {
  if (input.previousDistance <= 0) return input.zoom
  return Math.max(input.minimum, Math.min(5, input.zoom * (input.distance / input.previousDistance)))
}

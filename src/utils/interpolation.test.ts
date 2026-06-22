import { describe, it, expect } from 'vitest'
import { getInterpolatedPosition, getTrajectoryDuration } from './interpolation'
import { TrajectoryPoint } from '../types'

describe('getInterpolatedPosition', () => {
  const trajectory: TrajectoryPoint[] = [
    { x: 0, y: 0, time: 0 },
    { x: 100, y: 200, time: 1000 },
    { x: 200, y: 400, time: 2000 },
  ]

  it('returns first point when time=0', () => {
    const result = getInterpolatedPosition(trajectory, 0, { x: 0, y: 0 })
    expect(result).toEqual({ x: 0, y: 0 })
  })

  it('returns last point when time=maxTime', () => {
    const result = getInterpolatedPosition(trajectory, 2000, { x: 0, y: 0 })
    expect(result).toEqual({ x: 200, y: 400 })
  })

  it('returns midpoint when time=half', () => {
    const result = getInterpolatedPosition(trajectory, 1000, { x: 0, y: 0 })
    expect(result).toEqual({ x: 100, y: 200 })
  })

  it('interpolates correctly at 25% of first segment', () => {
    const result = getInterpolatedPosition(trajectory, 250, { x: 0, y: 0 })
    expect(result).toEqual({ x: 25, y: 50 })
  })

  it('interpolates correctly at 75% of total duration', () => {
    const result = getInterpolatedPosition(trajectory, 1500, { x: 0, y: 0 })
    expect(result).toEqual({ x: 150, y: 300 })
  })

  it('returns null for empty trajectory', () => {
    const result = getInterpolatedPosition([], 500, { x: 0, y: 0 })
    expect(result).toBeNull()
  })

  it('returns the single point for single-point trajectory', () => {
    const single: TrajectoryPoint[] = [{ x: 50, y: 75, time: 0 }]
    const result = getInterpolatedPosition(single, 999, { x: 0, y: 0 })
    expect(result).toEqual({ x: 50, y: 75 })
  })

  it('returns last point when time exceeds max', () => {
    const result = getInterpolatedPosition(trajectory, 5000, { x: 0, y: 0 })
    expect(result).toEqual({ x: 200, y: 400 })
  })
})

describe('getTrajectoryDuration', () => {
  it('returns 0 for empty trajectory', () => {
    expect(getTrajectoryDuration([])).toBe(0)
  })

  it('returns last point time', () => {
    const trajectory: TrajectoryPoint[] = [
      { x: 0, y: 0, time: 0 },
      { x: 100, y: 100, time: 500 },
      { x: 200, y: 200, time: 1500 },
    ]
    expect(getTrajectoryDuration(trajectory)).toBe(1500)
  })
})

import { describe, expect, it } from 'vitest'
import { buildOffsets, indexAt, visibleRange } from './virtualWindow'

const keys = (n: number): string[] => Array.from({ length: n }, (_, i) => `k${i}`)

describe('buildOffsets', () => {
  it('uses the cached height of a measured row and the estimate for the rest', () => {
    const offsets = buildOffsets(['a', 'b', 'c'], new Map([['b', 100]]), 40)
    expect(Array.from(offsets)).toEqual([0, 40, 140, 180])
  })
  it('is [0] for no rows', () => {
    expect(Array.from(buildOffsets([], new Map(), 40))).toEqual([0])
  })
})

describe('indexAt', () => {
  const offsets = buildOffsets(keys(4), new Map(), 10) // 0 10 20 30 40
  it('finds the row that holds the position', () => {
    expect(indexAt(offsets, 0)).toBe(0)
    expect(indexAt(offsets, 9.9)).toBe(0)
    expect(indexAt(offsets, 10)).toBe(1)
    expect(indexAt(offsets, 35)).toBe(3)
  })
  it('clamps past the end', () => {
    expect(indexAt(offsets, 1000)).toBe(3)
    expect(indexAt(buildOffsets([], new Map(), 10), 5)).toBe(0)
  })
})

describe('visibleRange', () => {
  const offsets = buildOffsets(keys(1000), new Map(), 50) // 50 000 px
  it('renders the first rows and the overscan at the top', () => {
    expect(visibleRange(offsets, 0, 500, 100)).toEqual({ start: 0, end: 13 })
  })
  it('renders rows around a scroll position', () => {
    const { start, end } = visibleRange(offsets, 10_000, 500, 100)
    expect(start).toBe(Math.floor(9_900 / 50))
    expect(end).toBe(Math.floor(10_600 / 50) + 1)
  })
  it('stays small for a long list and ends at the last row', () => {
    const r = visibleRange(offsets, 49_500, 500, 100)
    expect(r.end).toBe(1000)
    expect(r.end - r.start).toBeLessThan(20)
  })
  it('clamps an overshooting scroll position (used before the first scroll event)', () => {
    expect(visibleRange(offsets, Number.MAX_SAFE_INTEGER, 500, 0).end).toBe(1000)
    expect(visibleRange(offsets, -50, 500, 0).start).toBe(0)
  })
  it('follows measured heights', () => {
    const tall = buildOffsets(keys(10), new Map([['k0', 1000]]), 50)
    expect(visibleRange(tall, 500, 200, 0)).toEqual({ start: 0, end: 1 })
  })
  it('handles an empty list and a list shorter than the viewport', () => {
    expect(visibleRange(buildOffsets([], new Map(), 50), 0, 500, 100)).toEqual({ start: 0, end: 0 })
    expect(visibleRange(buildOffsets(keys(3), new Map(), 50), 0, 500, 100)).toEqual({ start: 0, end: 3 })
  })
})

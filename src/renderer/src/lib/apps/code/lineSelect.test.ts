import { describe, expect, it } from 'vitest'
import { rowAtY } from './lineSelect'

describe('rowAtY (UX-186)', () => {
  const rects = [
    { top: 0, bottom: 17 },
    { top: 17, bottom: 34 },
    { top: 34, bottom: 51 }
  ]

  it('finds the row under the pointer', () => {
    expect(rowAtY(rects, 0)).toBe(0)
    expect(rowAtY(rects, 16.9)).toBe(0)
    expect(rowAtY(rects, 17)).toBe(1)
    expect(rowAtY(rects, 40)).toBe(2)
  })

  it('clamps a drag above the first or below the last row', () => {
    expect(rowAtY(rects, -30)).toBe(0)
    expect(rowAtY(rects, 400)).toBe(2)
    expect(rowAtY([], 5)).toBe(-1)
  })
})

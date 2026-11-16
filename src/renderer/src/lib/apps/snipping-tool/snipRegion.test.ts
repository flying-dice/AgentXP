import { describe, expect, it } from 'vitest'
import { clipToArea, isUsable, rectFromDrag, windowAt } from './snipRegion'

const area = { width: 800, height: 600 }

describe('rectFromDrag', () => {
  it('normalises any drag direction and clamps', () => {
    expect(rectFromDrag({ x: 100, y: 80 }, { x: 40, y: 20 }, area)).toEqual({ x: 40, y: 20, width: 60, height: 60 })
    expect(rectFromDrag({ x: 700, y: 500 }, { x: 900, y: 700 }, area)).toEqual({ x: 700, y: 500, width: 100, height: 100 })
    expect(rectFromDrag({ x: -5, y: -5 }, { x: 10, y: 10 }, area)).toEqual({ x: 0, y: 0, width: 10, height: 10 })
  })
  it('rejects tiny rectangles', () => {
    expect(isUsable({ x: 0, y: 0, width: 3, height: 50 })).toBe(false)
    expect(isUsable({ x: 0, y: 0, width: 4, height: 4 })).toBe(true)
  })
})

describe('windowAt', () => {
  const back = { id: 1, bounds: { x: 0, y: 0, width: 300, height: 300 } }
  const front = { id: 2, bounds: { x: 100, y: 100, width: 300, height: 300 } }
  it('picks the top-most window', () => {
    expect(windowAt([back, front], { x: 150, y: 150 })?.id).toBe(2)
    expect(windowAt([back, front], { x: 50, y: 50 })?.id).toBe(1)
    expect(windowAt([back, front], { x: 700, y: 50 })).toBeNull()
  })
  it('clips to the area', () => {
    expect(clipToArea({ x: -10, y: 500, width: 100, height: 200 }, area)).toEqual({ x: 0, y: 500, width: 90, height: 100 })
  })
})

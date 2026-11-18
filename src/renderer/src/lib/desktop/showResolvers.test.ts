import { describe, expect, it } from 'vitest'
import { clipRect, cursorFollowsWindow, cursorPoint, glideStart, pageBoxRect, placeCallout, unionRect } from './showResolvers'

const area = { x: 0, y: 0, width: 1600, height: 960 }
const size = { width: 260, height: 110 }

describe('show geometry', () => {
  it('unionRect covers the first and the last line', () => {
    expect(unionRect([{ x: 10, y: 100, width: 500, height: 16 }, { x: 10, y: 148, width: 500, height: 16 }])).toEqual({ x: 10, y: 100, width: 500, height: 64 })
    expect(unionRect([])).toBeNull()
  })

  it('clipRect keeps the part inside, null when outside', () => {
    expect(clipRect({ x: -10, y: 5, width: 50, height: 50 }, { x: 0, y: 0, width: 20, height: 20 })).toEqual({ x: 0, y: 5, width: 20, height: 15 })
    expect(clipRect({ x: 100, y: 100, width: 5, height: 5 }, { x: 0, y: 0, width: 20, height: 20 })).toBeNull()
  })

  it('pageBoxRect offsets a Browser box by the page area and clips it to the page', () => {
    expect(pageBoxRect({ x: 200, y: 150, width: 800, height: 500 }, { x: 10, y: 20, width: 100, height: 30 })).toEqual({ x: 210, y: 170, width: 100, height: 30 })
    expect(pageBoxRect({ x: 200, y: 150, width: 800, height: 500 }, { x: 750, y: 480, width: 100, height: 30 })).toEqual({ x: 950, y: 630, width: 50, height: 20 })
    expect(pageBoxRect({ x: 200, y: 150, width: 800, height: 500 }, { x: 900, y: 10, width: 10, height: 10 })).toBeNull()
  })

  it('cursorPoint lands inside the top-left part of the target', () => {
    expect(cursorPoint({ x: 100, y: 200, width: 500, height: 64 })).toEqual({ x: 124, y: 212 })
    expect(cursorPoint({ x: 100, y: 200, width: 10, height: 8 })).toEqual({ x: 105, y: 204 })
  })

  it('glideStart: the last position, else the chat, else the target', () => {
    expect(glideStart({ x: 1, y: 2 }, { x: 0, y: 0, width: 100, height: 100 }, { x: 9, y: 9 })).toEqual({ x: 1, y: 2 })
    expect(glideStart(null, { x: 0, y: 0, width: 100, height: 60 }, { x: 9, y: 9 })).toEqual({ x: 50, y: 30 })
    expect(glideStart(null, null, { x: 9, y: 9 })).toEqual({ x: 9, y: 9 })
  })
})

describe('placeCallout', () => {
  it('to the right of the target when there is room, the tail at the target', () => {
    const p = placeCallout({ x: 300, y: 300, width: 400, height: 48 }, size, area)
    expect(p).toMatchObject({ side: 'right', x: 714, y: 296 })
    expect(p.tail).toBe(24)
  })

  it('to the left near the right edge of the screen', () => {
    const p = placeCallout({ x: 1300, y: 300, width: 250, height: 40 }, size, area)
    expect(p.side).toBe('left')
    expect(p.x + size.width).toBeLessThanOrEqual(1300)
  })

  it('below a target as wide as the screen (a maximized window), above one at the bottom', () => {
    expect(placeCallout({ x: 0, y: 100, width: 1600, height: 40 }, size, area).side).toBe('below')
    expect(placeCallout({ x: 0, y: 900, width: 1600, height: 40 }, size, area).side).toBe('above')
  })

  it('always fully inside the area, also when nothing fits (a target that fills the screen) and near the top', () => {
    for (const target of [
      { x: 0, y: 0, width: 1600, height: 960 },
      { x: 1590, y: 0, width: 10, height: 10 },
      { x: 0, y: 950, width: 40, height: 10 },
      { x: 200, y: -50, width: 100, height: 60 }
    ]) {
      const p = placeCallout(target, size, area)
      expect(p.x).toBeGreaterThanOrEqual(6)
      expect(p.y).toBeGreaterThanOrEqual(6)
      expect(p.x + size.width).toBeLessThanOrEqual(1594)
      expect(p.y + size.height).toBeLessThanOrEqual(954)
      expect(p.tail).toBeGreaterThanOrEqual(12)
    }
  })

  it('in a small window by the left edge the callout goes to its right', () => {
    expect(placeCallout({ x: 8, y: 400, width: 120, height: 20 }, size, { x: 0, y: 0, width: 900, height: 600 })).toMatchObject({ side: 'right', x: 142 })
  })
})

describe('cursorFollowsWindow', () => {
  const anchor = { windowId: 7, bounds: { x: 100, y: 80, width: 640, height: 480 }, windowState: 'normal' }
  const at = (bounds: Partial<typeof anchor.bounds>, windowState = 'normal') => ({ bounds: { ...anchor.bounds, ...bounds }, windowState })

  it('stays while its window does not change', () => {
    expect(cursorFollowsWindow(anchor, at({}))).toEqual({ kind: 'stay' })
  })

  it('goes at once when its window is closed or minimized', () => {
    expect(cursorFollowsWindow(anchor, undefined)).toEqual({ kind: 'hide' })
    expect(cursorFollowsWindow(anchor, at({}, 'minimized'))).toEqual({ kind: 'hide' })
  })

  it('goes when its window is maximized, restored or resized (the content moved inside it)', () => {
    expect(cursorFollowsWindow(anchor, at({}, 'maximized'))).toEqual({ kind: 'hide' })
    expect(cursorFollowsWindow({ ...anchor, windowState: 'maximized' }, at({}))).toEqual({ kind: 'hide' })
    expect(cursorFollowsWindow(anchor, at({ width: 700 }))).toEqual({ kind: 'hide' })
    expect(cursorFollowsWindow(anchor, at({ x: 0, height: 400 }))).toEqual({ kind: 'hide' })
  })

  it('moves with its window when the window was only moved', () => {
    expect(cursorFollowsWindow(anchor, at({ x: 160, y: 50 }))).toEqual({ kind: 'move', dx: 60, dy: -30 })
  })
})

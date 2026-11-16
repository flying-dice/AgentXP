import { describe, expect, it } from 'vitest'
import { MIN_WINDOW_SIZE, belowBar, minYBelow, fitInsideWorkArea, fitToArea, helpBounds, frameStyle, moveBounds, resizeBounds, shouldSnapMaximize } from './geometry'

const b = { x: 100, y: 100, width: 400, height: 300 }
const area = { width: 1000, height: 700 }

describe('resizeBounds', () => {
  it('grows from the east and south edges', () => {
    expect(resizeBounds(b, 'e', 50, 0)).toEqual({ ...b, width: 450 })
    expect(resizeBounds(b, 's', 0, 40)).toEqual({ ...b, height: 340 })
    expect(resizeBounds(b, 'se', 10, 10)).toEqual({ ...b, width: 410, height: 310 })
  })
  it('keeps the opposite edge fixed when resizing from west and north', () => {
    expect(resizeBounds(b, 'w', -60, 0)).toEqual({ x: 40, y: 100, width: 460, height: 300 })
    expect(resizeBounds(b, 'n', 0, -30)).toEqual({ x: 100, y: 70, width: 400, height: 330 })
    expect(resizeBounds(b, 'nw', 20, 20)).toEqual({ x: 120, y: 120, width: 380, height: 280 })
  })
  it('stops at the minimum size without moving the fixed edge', () => {
    const r = resizeBounds(b, 'w', 500, 0)
    expect(r.width).toBe(MIN_WINDOW_SIZE.width)
    expect(r.x + r.width).toBe(b.x + b.width)
    const s = resizeBounds(b, 'n', 0, 900)
    expect(s.height).toBe(MIN_WINDOW_SIZE.height)
    expect(s.y + s.height).toBe(b.y + b.height)
  })
  it('does not push the top above the desktop', () => {
    const r = resizeBounds(b, 'n', 0, -500)
    expect(r.y).toBe(0)
    expect(r.y + r.height).toBe(400)
  })
  it('does not grow past the area on the east and south', () => {
    expect(resizeBounds(b, 'e', 2000, 0, area).width).toBe(900)
    expect(resizeBounds(b, 's', 0, 2000, area).height).toBe(600)
  })
})

describe('moveBounds', () => {
  it('moves by the delta', () => {
    expect(moveBounds(b, 10, -20, area)).toEqual({ ...b, x: 110, y: 80 })
  })
  it('keeps the title bar reachable', () => {
    expect(moveBounds(b, 0, -500, area).y).toBe(0)
    expect(moveBounds(b, 0, 5000, area).y).toBe(670)
    expect(moveBounds(b, 5000, 0, area).x).toBe(910)
    expect(moveBounds(b, -5000, 0, area).x).toBe(-310)
  })
})

describe('snap and fit', () => {
  it('snaps to maximise at the top edge', () => {
    expect(shouldSnapMaximize(0)).toBe(true)
    expect(shouldSnapMaximize(2)).toBe(true)
    expect(shouldSnapMaximize(40)).toBe(false)
  })
  it('fits windows into the area', () => {
    expect(fitToArea({ x: 2000, y: -40, width: 5000, height: 50 }, area)).toEqual({ x: 910, y: 0, width: 1000, height: MIN_WINDOW_SIZE.height })
  })
  it('maximised frames start below the top bar', () => {
    expect(frameStyle(b, true)).toContain('top:0;')
    expect(frameStyle(b, false)).toBe('left:100px;top:100px;width:400px;height:300px;')
  })
})

describe('belowBar', () => {
  for (const height of [52, 68]) {
    it(`puts a window that starts under a bar of ${height} px just below it`, () => {
      const bar = { left: 300, right: 800, height }
      expect(minYBelow(height)).toBe(height + 4)
      expect(belowBar({ x: 400, y: 20, width: 200, height: 200 }, bar).y).toBe(height + 4)
    })
  }
  it('leaves windows that are clear of the bar alone (same object)', () => {
    const bar = { left: 300, right: 800, height: 52 }
    const low = { x: 400, y: 80, width: 200, height: 200 }
    const side = { x: 0, y: 0, width: 200, height: 200 }
    expect(belowBar(low, bar)).toBe(low)
    expect(belowBar(side, bar)).toBe(side)
  })
})

describe('fitInsideWorkArea (UX-148)', () => {
  const area = { width: 900, height: 500 }
  it('leaves a window that fits', () => {
    const b = { x: 100, y: 80, width: 400, height: 300 }
    expect(fitInsideWorkArea(b, area, 68)).toEqual(b)
  })
  it('shrinks a window that is larger than the area and keeps it below the bar', () => {
    const r = fitInsideWorkArea({ x: 150, y: 70, width: 800, height: 560 }, area, 68)
    expect(r.y).toBe(72)
    expect(r.y + r.height).toBeLessThanOrEqual(500)
    expect(r.x + r.width).toBeLessThanOrEqual(900)
  })
  it('moves a window that sticks out to the right or bottom back in', () => {
    expect(fitInsideWorkArea({ x: 700, y: 400, width: 400, height: 200 }, area, 0)).toEqual({ x: 500, y: 300, width: 400, height: 200 })
  })
})

describe('helpBounds (UX-165)', () => {
  it('is 760 x 520 and centred below the bar on a large desktop', () => {
    const b = helpBounds({ width: 1280, height: 730 }, 68)
    expect(b).toMatchObject({ width: 760, height: 520 })
    expect(b.x).toBe(260)
    expect(b.y).toBeGreaterThanOrEqual(minYBelow(68))
    expect(b.y + b.height).toBeLessThanOrEqual(730)
  })
  it('takes the work area minus 40 px on a small one, never narrower than 640', () => {
    expect(helpBounds({ width: 720, height: 500 }, 68)).toMatchObject({ width: 680 })
    expect(helpBounds({ width: 660, height: 500 }, 68).width).toBe(640)
    expect(helpBounds({ width: 600, height: 500 }, 68).width).toBe(600)
  })
})

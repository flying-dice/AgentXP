import { describe, expect, it } from 'vitest'
import { MIN_WINDOW_SIZE, widenBounds, belowBar, minYBelow, fitInsideWorkArea, fitToArea, helpBounds, placeBesideOpener, CHAT_MIN_WIDTH, OPENER_CASCADE, frameStyle, moveBounds, resizeBounds, shouldSnapMaximize } from './geometry'

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

describe('placeBesideOpener (UX-181)', () => {
  const area = { width: 1280, height: 730 }
  const chat = { x: 100, y: 72, width: 520, height: 600 }
  const inside = (b: { x: number; y: number; width: number; height: number }): boolean => b.x >= 0 && b.y >= 72 && b.x + b.width <= area.width && b.y + b.height <= area.height
  const covers = (a: typeof chat, b: typeof chat): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

  it('leaves a window that is clear of its opener where it is', () => {
    const opened = { x: 700, y: 100, width: 500, height: 400 }
    expect(placeBesideOpener('explorer', opened, chat, area, 68, 2)).toEqual(opened)
  })
  it('moves a window that covers its opener to the right of it', () => {
    const b = placeBesideOpener('explorer', { x: 150, y: 100, width: 600, height: 400 }, chat, area, 68, 2)
    expect(covers(b, chat)).toBe(false)
    expect(b.x).toBeGreaterThanOrEqual(chat.x + chat.width)
    expect(inside(b)).toBe(true)
  })
  it('goes below the opener when there is no room beside it', () => {
    const wide = { x: 100, y: 72, width: 1100, height: 300 }
    const b = placeBesideOpener('code', { x: 150, y: 100, width: 900, height: 330 }, wide, area, 68, 2)
    expect(covers(b, wide)).toBe(false)
    expect(inside(b)).toBe(true)
  })
  it('pulls a window that runs to the bottom of the screen inside the work area', () => {
    const b = placeBesideOpener('chat', { x: 700, y: 400, width: 500, height: 600 }, null, area, 68, 2)
    expect(inside(b)).toBe(true)
  })
  it('cascades 28 px from the opener when the work area has no room beside it (UX-203)', () => {
    const full = { x: 0, y: 72, width: 1280, height: 658 }
    const b = placeBesideOpener('code', { x: 80, y: 100, width: 820, height: 600 }, full, area, 68, 2, 'explorer')
    expect(b.x).toBe(full.x + OPENER_CASCADE)
    expect(b.y).toBe(full.y + OPENER_CASCADE)
    expect(inside(b)).toBe(true)
  })
  it('gives a second chat the size of the first, at least 560 px wide (UX-203)', () => {
    const first = { x: 20, y: 72, width: 600, height: 560 }
    const roomy = placeBesideOpener('chat', { x: 150, y: 100, width: 450, height: 400 }, first, area, 68, 2, 'chat')
    expect(roomy).toMatchObject({ width: 600, height: 560 })
    expect(covers(roomy, first)).toBe(false)
    // No room for the same size beside it: the second chat cascades at the same size, not squeezed.
    const wide = { x: 100, y: 72, width: 600, height: 560 }
    const cascaded = placeBesideOpener('chat', { x: 150, y: 100, width: 450, height: 400 }, wide, area, 68, 2, 'chat')
    expect(cascaded).toMatchObject({ x: wide.x + OPENER_CASCADE, y: wide.y + OPENER_CASCADE, width: 600, height: 560 })
    const narrow = placeBesideOpener('chat', { x: 150, y: 100, width: 450, height: 400 }, { ...first, width: 400 }, area, 68, 2, 'chat')
    expect(narrow.width).toBe(CHAT_MIN_WIDTH)
  })
})

describe('widenBounds', () => {
  it('grows to the right while there is room', () => {
    expect(widenBounds({ x: 100, y: 50, width: 480, height: 320 }, 300, area)).toEqual({ x: 100, y: 50, width: 780, height: 320 })
  })
  it('moves left at the edge of the work area and never gets wider than it', () => {
    expect(widenBounds({ x: 600, y: 50, width: 400, height: 320 }, 300, area)).toEqual({ x: 300, y: 50, width: 700, height: 320 })
    expect(widenBounds({ x: 0, y: 50, width: 900, height: 320 }, 300, area)).toEqual({ x: 0, y: 50, width: 1000, height: 320 })
  })
})

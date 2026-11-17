import { describe, expect, it } from 'vitest'
import { handleCursor, handlePoint, nearestPort, resizeShape, rotationAt, rotationHandlePoint, selectionBounds, shapeAt, shapesInRect, snapMove, containsShapePoint } from './canvasMath'
import { blankPage } from './model/document'
import type { DiagramPage, DiagramShape } from './model/types'

const shape = (over: Partial<DiagramShape> = {}): DiagramShape => ({ id: 's1', stencil: 'basic.rectangle', x: 100, y: 100, w: 100, h: 50, rotation: 0, text: '', style: {}, ...over })
const page = (shapes: DiagramShape[]): DiagramPage => ({ ...blankPage('p1', 'Page-1'), shapes })

describe('hit tests', () => {
  it('finds the top-most solid shape before a container behind it', () => {
    const frame = shape({ id: 'f', stencil: 'containers.container', x: 0, y: 0, w: 400, h: 400 })
    const a = shape({ id: 'a' })
    const b = shape({ id: 'b', x: 150 })
    const p = page([frame, a, b])
    expect(shapeAt(p, { x: 160, y: 120 })?.id).toBe('b')
    expect(shapeAt(p, { x: 110, y: 120 })?.id).toBe('a')
    expect(shapeAt(p, { x: 10, y: 10 })?.id).toBe('f')
    expect(shapeAt(p, { x: 160, y: 120 }, new Set(['b']))?.id).toBe('a')
    expect(shapeAt(p, { x: 900, y: 900 })).toBeNull()
  })

  it('tests points in a rotated shape in its own frame', () => {
    const s = shape({ rotation: 90 })
    // turned a quarter, the 100 x 50 box is 50 wide and 100 tall around its centre (150, 125)
    expect(containsShapePoint(s, { x: 150, y: 80 })).toBe(true)
    expect(containsShapePoint(s, { x: 105, y: 125 })).toBe(false)
  })

  it('snaps to the nearest connection point within reach', () => {
    const s = shape()
    expect(nearestPort(s, { x: 150, y: 97 }, 10)?.id).toBe('n')
    expect(nearestPort(s, { x: 150, y: 125 }, 10)).toBeNull()
  })

  it('selects with a marquee only the shapes wholly inside', () => {
    const p = page([shape({ id: 'a' }), shape({ id: 'b', x: 300 })])
    expect(shapesInRect(p, { x: 90, y: 90, w: 120, h: 70 })).toEqual(['a'])
    expect(shapesInRect(p, { x: 90, y: 90, w: 60, h: 70 })).toEqual([])
    expect(selectionBounds(p.shapes)).toEqual({ x: 100, y: 100, w: 300, h: 50 })
    expect(selectionBounds([])).toBeNull()
  })
})

describe('resize and rotate', () => {
  it('moves only the dragged edges, never below the minimum size', () => {
    expect(resizeShape(shape(), 'se', { x: 260, y: 180 }, false)).toEqual({ x: 100, y: 100, w: 160, h: 80 })
    expect(resizeShape(shape(), 'w', { x: 80, y: 0 }, false)).toEqual({ x: 80, y: 100, w: 120, h: 50 })
    expect(resizeShape(shape(), 'n', { x: 0, y: 500 }, false, 0, 8)).toEqual({ x: 100, y: 142, w: 100, h: 8 })
  })

  it('snaps edges to the grid and keeps the aspect ratio when asked', () => {
    expect(resizeShape(shape(), 'e', { x: 247, y: 0 }, false, 10)).toEqual({ x: 100, y: 100, w: 150, h: 50 })
    const r = resizeShape(shape(), 'se', { x: 300, y: 130 }, true)
    expect(r.w / r.h).toBeCloseTo(2)
    expect(r.w).toBe(200)
  })

  it('keeps the opposite edge of a rotated shape in place', () => {
    const s = shape({ rotation: 90 })
    const before = handlePoint(s, 'w')
    // the east handle of a quarter-turned box is at the bottom; drag it 40 further down
    const e = handlePoint(s, 'e')
    const r = resizeShape(s, 'e', { x: e.x, y: e.y + 40 }, false)
    expect(r.w).toBeCloseTo(140)
    const after = handlePoint({ ...s, ...r }, 'w')
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('turns the shape toward the pointer in 15 degree steps', () => {
    const s = shape()
    expect(rotationAt(s, { x: 150, y: 0 })).toBe(0)
    expect(rotationAt(s, { x: 400, y: 125 })).toBe(90)
    expect(rotationAt(s, { x: 150, y: 400 })).toBe(180)
    expect(rotationAt(s, { x: 300, y: 50 }, 15) % 15).toBe(0)
    expect(rotationAt(s, { x: 300, y: 50 }, 0) % 1).not.toBe(0)
  })

  it('places the handles and the rotation handle on the turned shape', () => {
    expect(handlePoint(shape(), 'se')).toEqual({ x: 200, y: 150 })
    const r = rotationHandlePoint(shape({ rotation: 180 }), 20)
    expect(r.x).toBeCloseTo(150)
    expect(r.y).toBeCloseTo(170)
    expect(handleCursor('n', 0)).toBe('ns-resize')
    expect(handleCursor('n', 90)).toBe('ew-resize')
    expect(handleCursor('ne', 0)).toBe('nesw-resize')
  })
})

describe('snapMove', () => {
  it('snaps to the grid when no shape is near', () => {
    expect(snapMove({ x: 100, y: 100, w: 50, h: 50 }, [], 13, 6, 10, 4)).toEqual({ dx: 10, dy: 10, guides: [] })
  })

  it('lines up edges and centres with other shapes and draws the guides', () => {
    const other = { x: 300, y: 40, w: 80, h: 40 }
    // moved by 213 the box's centre is at x 338, 2 from the other's centre (340): it snaps there
    const r = snapMove({ x: 100, y: 200, w: 50, h: 50 }, [other], 213, 0, 0, 6)
    expect(r.dx).toBe(215)
    expect(r.guides).toEqual([{ axis: 'v', at: 340, from: 30, to: 260 }])
  })
})

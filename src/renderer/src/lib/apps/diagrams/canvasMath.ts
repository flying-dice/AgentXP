/** The canvas's pure math: hit tests, resize and rotate drags, snapping and alignment guides. */
import { center, rotatePoint, rotatedBounds, snap, unionRects } from './model/geometry'
import { shapePorts, type PortPoint } from './model/ports'
import { stencilOf } from './model/stencils'
import type { DiagramPage, DiagramShape, Point, Rect } from './model/types'

export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
export const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

/** Where a handle sits in the shape's own box (0..1). */
export const HANDLE_POS: Record<Handle, [number, number]> = { nw: [0, 0], n: [0.5, 0], ne: [1, 0], e: [1, 0.5], se: [1, 1], s: [0.5, 1], sw: [0, 1], w: [0, 0.5] }

/** The resize cursor of a handle, turned with the shape. */
export function handleCursor(handle: Handle, rotation: number): string {
  const order: Handle[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
  const step = Math.round((((rotation % 360) + 360) % 360) / 45)
  const turned = order[(order.indexOf(handle) + step) % 8]
  return turned === 'n' || turned === 's' ? 'ns-resize' : turned === 'e' || turned === 'w' ? 'ew-resize' : turned === 'ne' || turned === 'sw' ? 'nesw-resize' : 'nwse-resize'
}

/** A point in the shape's own (unrotated) frame. */
export const toLocal = (s: DiagramShape, p: Point): Point => rotatePoint(p, center(s), -s.rotation)

export function containsShapePoint(s: DiagramShape, p: Point, slack = 0): boolean {
  const l = toLocal(s, p)
  return l.x >= s.x - slack && l.x <= s.x + s.w + slack && l.y >= s.y - slack && l.y <= s.y + s.h + slack
}

/** The top-most shape under a point (solid shapes before containers). */
export function shapeAt(page: DiagramPage, p: Point, exclude: ReadonlySet<string> = new Set()): DiagramShape | null {
  const hits = [...page.shapes].reverse().filter((s) => !exclude.has(s.id) && containsShapePoint(s, p, 2))
  return hits.find((s) => !stencilOf(s.stencil).container) ?? hits[0] ?? null
}

export function nearestPort(s: DiagramShape, p: Point, within: number): PortPoint | null {
  let best: PortPoint | null = null
  let bestD = within
  for (const port of shapePorts(s)) {
    const d = Math.hypot(port.point.x - p.x, port.point.y - p.y)
    if (d <= bestD) {
      best = port
      bestD = d
    }
  }
  return best
}

export interface ResizeResult {
  x: number
  y: number
  w: number
  h: number
}

/**
 * The new box of a shape when `handle` is dragged to `p`. Works in the shape's own frame, so a rotated shape keeps
 * its opposite edge in place. `keepAspect` keeps the width-to-height ratio.
 */
export function resizeShape(s: DiagramShape, handle: Handle, p: Point, keepAspect: boolean, grid = 0, min = 8): ResizeResult {
  const l = toLocal(s, p)
  let x1 = s.x
  let y1 = s.y
  let x2 = s.x + s.w
  let y2 = s.y + s.h
  const sx = (v: number): number => (grid && !s.rotation ? snap(v, grid) : v)
  if (handle.includes('w')) x1 = Math.min(sx(l.x), x2 - min)
  if (handle.includes('e')) x2 = Math.max(sx(l.x), x1 + min)
  if (handle.includes('n')) y1 = Math.min(sx(l.y), y2 - min)
  if (handle.includes('s')) y2 = Math.max(sx(l.y), y1 + min)
  if (keepAspect && s.w > 0 && s.h > 0) {
    const ratio = s.w / s.h
    let w = x2 - x1
    let h = y2 - y1
    if (handle === 'n' || handle === 's') w = h * ratio
    else if (handle === 'e' || handle === 'w') h = w / ratio
    else if (w / h > ratio) h = w / ratio
    else w = h * ratio
    if (handle.includes('w')) x1 = x2 - w
    else if (handle.includes('e') || handle === 'n' || handle === 's') {
      if (handle === 'n' || handle === 's') {
        const cx = (s.x + s.x + s.w) / 2
        x1 = cx - w / 2
      }
      x2 = x1 + w
    }
    if (handle.includes('n')) y1 = y2 - h
    else if (handle.includes('s') || handle === 'e' || handle === 'w') {
      if (handle === 'e' || handle === 'w') {
        const cy = (s.y + s.y + s.h) / 2
        y1 = cy - h / 2
      }
      y2 = y1 + h
    }
  }
  const w = x2 - x1
  const h = y2 - y1
  if (!s.rotation) return { x: x1, y: y1, w, h }
  // The new centre, turned back into the page frame around the old centre.
  const c = rotatePoint({ x: (x1 + x2) / 2, y: (y1 + y2) / 2 }, center(s), s.rotation)
  return { x: c.x - w / 2, y: c.y - h / 2, w, h }
}

/** The angle for a rotation drag: 0 when the pointer is straight above the centre. Snaps to `step` degrees. */
export function rotationAt(s: DiagramShape, p: Point, step = 15): number {
  const c = center(s)
  let deg = (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI + 90
  deg = ((deg % 360) + 360) % 360
  if (step > 0) deg = Math.round(deg / step) * step
  return deg % 360
}

export interface Guide {
  /** `v`: a vertical line at x; `h`: a horizontal line at y. */
  axis: 'v' | 'h'
  at: number
  from: number
  to: number
}

/**
 * Snaps a moving box to the grid, then to the edges and centres of other shapes when one is close (Visio's
 * dynamic grid). Returns the corrected offset and the guide lines to draw.
 */
export function snapMove(moving: Rect, others: readonly Rect[], dx: number, dy: number, grid: number, tolerance: number): { dx: number; dy: number; guides: Guide[] } {
  let x = moving.x + dx
  let y = moving.y + dy
  if (grid > 0) {
    x = snap(x, grid)
    y = snap(y, grid)
  }
  const guides: Guide[] = []
  const xsOf = (r: Rect): number[] => [r.x, r.x + r.w / 2, r.x + r.w]
  const ysOf = (r: Rect): number[] => [r.y, r.y + r.h / 2, r.y + r.h]
  let bestX: { d: number; shift: number; at: number } | null = null
  let bestY: { d: number; shift: number; at: number } | null = null
  const raw = { x: moving.x + dx, y: moving.y + dy, w: moving.w, h: moving.h }
  for (const o of others) {
    for (const ox of xsOf(o))
      for (const mx of xsOf(raw)) {
        const d = Math.abs(ox - mx)
        if (d <= tolerance && (!bestX || d < bestX.d)) bestX = { d, shift: ox - mx, at: ox }
      }
    for (const oy of ysOf(o))
      for (const my of ysOf(raw)) {
        const d = Math.abs(oy - my)
        if (d <= tolerance && (!bestY || d < bestY.d)) bestY = { d, shift: oy - my, at: oy }
      }
  }
  if (bestX) x = raw.x + bestX.shift
  if (bestY) y = raw.y + bestY.shift
  const final = { x, y, w: moving.w, h: moving.h }
  if (bestX) {
    const near = others.filter((o) => xsOf(o).some((v) => Math.abs(v - bestX!.at) < 0.5))
    const ys = [final.y, final.y + final.h, ...near.flatMap((o) => [o.y, o.y + o.h])]
    guides.push({ axis: 'v', at: bestX.at, from: Math.min(...ys) - 10, to: Math.max(...ys) + 10 })
  }
  if (bestY) {
    const near = others.filter((o) => ysOf(o).some((v) => Math.abs(v - bestY!.at) < 0.5))
    const xs = [final.x, final.x + final.w, ...near.flatMap((o) => [o.x, o.x + o.w])]
    guides.push({ axis: 'h', at: bestY.at, from: Math.min(...xs) - 10, to: Math.max(...xs) + 10 })
  }
  return { dx: x - moving.x, dy: y - moving.y, guides }
}

/** The shapes inside a marquee (wholly inside, as Visio does). */
export function shapesInRect(page: DiagramPage, r: Rect): string[] {
  return page.shapes.filter((s) => {
    const b = rotatedBounds(s, s.rotation)
    return b.x >= r.x && b.y >= r.y && b.x + b.w <= r.x + r.w && b.y + b.h <= r.y + r.h
  }).map((s) => s.id)
}

export const selectionBounds = (shapes: readonly DiagramShape[]): Rect | null => unionRects(shapes.map((s) => rotatedBounds(s, s.rotation)))

/** The page point of a handle of a (possibly rotated) shape. */
export function handlePoint(s: DiagramShape, handle: Handle): Point {
  const [fx, fy] = HANDLE_POS[handle]
  return rotatePoint({ x: s.x + s.w * fx, y: s.y + s.h * fy }, center(s), s.rotation)
}

/** The rotation handle: above the top edge, turned with the shape. */
export function rotationHandlePoint(s: DiagramShape, offset: number): Point {
  return rotatePoint({ x: s.x + s.w / 2, y: s.y - offset }, center(s), s.rotation)
}


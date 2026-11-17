/** Pure geometry for the diagram: rectangles, rotation, snapping. */
import type { Point, Rect } from './types'

export type Side = 'n' | 'e' | 's' | 'w'

export const SIDE_VECTORS: Record<Side, Point> = { n: { x: 0, y: -1 }, e: { x: 1, y: 0 }, s: { x: 0, y: 1 }, w: { x: -1, y: 0 } }

export const center = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

export const rad = (deg: number): number => (deg * Math.PI) / 180

export function rotatePoint(p: Point, c: Point, deg: number): Point {
  if (!deg) return p
  const a = rad(deg)
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const dx = p.x - c.x
  const dy = p.y - c.y
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos }
}

export function rotateVector(v: Point, deg: number): Point {
  if (!deg) return v
  return rotatePoint(v, { x: 0, y: 0 }, deg)
}

/** The side a direction vector points to most. */
export function sideOf(v: Point): Side {
  if (Math.abs(v.x) >= Math.abs(v.y)) return v.x >= 0 ? 'e' : 'w'
  return v.y >= 0 ? 's' : 'n'
}

/** The four corners of a rectangle rotated around its centre. */
export function corners(r: Rect, deg: number): Point[] {
  const c = center(r)
  return [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h }
  ].map((p) => rotatePoint(p, c, deg))
}

/** The axis-aligned bounding box of a rotated rectangle. */
export function rotatedBounds(r: Rect, deg: number): Rect {
  if (!deg || deg % 360 === 0) return { ...r }
  return boundsOfPoints(corners(r, deg))
}

export function boundsOfPoints(points: readonly Point[]): Rect {
  let x1 = Infinity
  let y1 = Infinity
  let x2 = -Infinity
  let y2 = -Infinity
  for (const p of points) {
    x1 = Math.min(x1, p.x)
    y1 = Math.min(y1, p.y)
    x2 = Math.max(x2, p.x)
    y2 = Math.max(y2, p.y)
  }
  if (!Number.isFinite(x1)) return { x: 0, y: 0, w: 0, h: 0 }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}

export function unionRects(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null
  return boundsOfPoints(rects.flatMap((r) => [{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h }]))
}

export const inflate = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 })

export const containsPoint = (r: Rect, p: Point): boolean => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h

/** Strictly inside (the border does not count). */
export const strictlyContains = (r: Rect, p: Point): boolean => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h

export const intersects = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

export const containsRect = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h

/** Does the axis-aligned segment a-b pass through the inside of r? */
export function segmentCrossesRect(a: Point, b: Point, r: Rect): boolean {
  if (a.x === b.x) {
    if (a.x <= r.x || a.x >= r.x + r.w) return false
    const y1 = Math.min(a.y, b.y)
    const y2 = Math.max(a.y, b.y)
    return y2 > r.y && y1 < r.y + r.h
  }
  if (a.y === b.y) {
    if (a.y <= r.y || a.y >= r.y + r.h) return false
    const x1 = Math.min(a.x, b.x)
    const x2 = Math.max(a.x, b.x)
    return x2 > r.x && x1 < r.x + r.w
  }
  // A diagonal segment: test a few samples (good enough for the rare non-orthogonal check).
  for (let t = 0.1; t < 1; t += 0.1) if (strictlyContains(r, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return true
  return false
}

export const snap = (v: number, grid: number): number => (grid > 0 ? Math.round(v / grid) * grid : v)

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

export const normalizeRect = (a: Point, b: Point): Rect => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) })

/** Total length of a polyline. */
export function polylineLength(points: readonly Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i])
  return total
}

/** The point at `t` (0..1) of the length of a polyline, with the direction of its segment. */
export function pointAlong(points: readonly Point[], t: number): { point: Point; angle: number } {
  if (points.length === 0) return { point: { x: 0, y: 0 }, angle: 0 }
  if (points.length === 1) return { point: points[0], angle: 0 }
  const total = polylineLength(points)
  let left = Math.max(0, Math.min(1, t)) * total
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const d = distance(a, b)
    if (left <= d || i === points.length - 1) {
      const f = d === 0 ? 0 : Math.min(1, left / d)
      return { point: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, angle: Math.atan2(b.y - a.y, b.x - a.x) }
    }
    left -= d
  }
  return { point: points[points.length - 1], angle: 0 }
}

/** Shortest distance from p to the segment a-b. */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return distance(p, a)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
  return distance(p, { x: a.x + dx * t, y: a.y + dy * t })
}

/** Points of a cubic Bezier, for hit tests and label placement. */
export function sampleCubic(p0: Point, p1: Point, p2: Point, p3: Point, steps = 24): Point[] {
  const out: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
    })
  }
  return out
}

export const round2 = (v: number): number => Math.round(v * 100) / 100

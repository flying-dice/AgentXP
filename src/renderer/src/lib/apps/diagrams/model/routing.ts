/**
 * Connector routes. Orthogonal routes run on a sparse grid made from the edges of the shapes around them and
 * are found with A* that charges for length and for each bend, so lines go around shapes with few corners.
 */
import { SIDE_VECTORS, rotatedBounds, sampleCubic, strictlyContains, type Side } from './geometry'
import { n } from './svg'
import type { Point, Rect } from './types'

export interface RouteEnd {
  point: Point
  dir: Side
}

export interface Route {
  /** The polyline (for a curve: points sampled along it). */
  points: Point[]
  /** SVG path data. */
  d: string
  /** The direction the line arrives in at each end, for the markers (radians, pointing into the end). */
  startAngle: number
  endAngle: number
}

export const STUB = 16
const BEND_COST = 28
const MAX_NODES = 9000

const add = (p: Point, v: Point, k: number): Point => ({ x: p.x + v.x * k, y: p.y + v.y * k })
const same = (a: Point, b: Point): boolean => Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01

/** Drops repeated points and points in the middle of a straight run. */
export function simplify(points: readonly Point[]): Point[] {
  const out: Point[] = []
  for (const p of points) {
    if (out.length && same(out[out.length - 1], p)) continue
    out.push({ x: p.x, y: p.y })
    while (out.length >= 3) {
      const [a, b, c] = out.slice(-3)
      const colinear = (Math.abs(a.x - b.x) < 0.01 && Math.abs(b.x - c.x) < 0.01) || (Math.abs(a.y - b.y) < 0.01 && Math.abs(b.y - c.y) < 0.01)
      if (!colinear) break
      out.splice(out.length - 2, 1)
    }
  }
  return out
}

// ---------------------------------------------------------------- binary heap

class Heap {
  private items: { key: number; value: number }[] = []
  get size(): number {
    return this.items.length
  }
  push(key: number, value: number): void {
    const a = this.items
    a.push({ key, value })
    let i = a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (a[p].key <= a[i].key) break
      ;[a[p], a[i]] = [a[i], a[p]]
      i = p
    }
  }
  pop(): number {
    const a = this.items
    const top = a[0].value
    const last = a.pop()!
    if (a.length) {
      a[0] = last
      let i = 0
      for (;;) {
        const l = i * 2 + 1
        const r = l + 1
        let m = i
        if (l < a.length && a[l].key < a[m].key) m = l
        if (r < a.length && a[r].key < a[m].key) m = r
        if (m === i) break
        ;[a[m], a[i]] = [a[i], a[m]]
        i = m
      }
    }
    return top
  }
}

const DIR_INDEX: Record<Side, number> = { n: 0, e: 1, s: 2, w: 3 }
const OPPOSITE: Record<Side, Side> = { n: 's', s: 'n', e: 'w', w: 'e' }

/**
 * An orthogonal route from `start` to `end` around `obstacles` (page rectangles; the two end shapes are usually
 * among them). Returns the corner points, both end points included.
 */
export function routeOrthogonal(start: RouteEnd, end: RouteEnd, obstacles: readonly Rect[], margin = STUB): Point[] {
  const s1 = add(start.point, SIDE_VECTORS[start.dir], margin)
  const e1 = add(end.point, SIDE_VECTORS[end.dir], margin)
  const pad = margin - 2
  // Shapes far from the route do not matter; shapes that swallow a stub are ignored (overlapping shapes).
  const span = { x: Math.min(s1.x, e1.x) - 240, y: Math.min(s1.y, e1.y) - 240, w: Math.abs(s1.x - e1.x) + 480, h: Math.abs(s1.y - e1.y) + 480 }
  const blocks = obstacles
    .map((r) => ({ x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 }))
    .filter((r) => r.x < span.x + span.w && r.x + r.w > span.x && r.y < span.y + span.h && r.y + r.h > span.y)
    .filter((r) => !strictlyContains(r, s1) && !strictlyContains(r, e1))

  const xsSet = new Set<number>([s1.x, e1.x, (s1.x + e1.x) / 2])
  const ysSet = new Set<number>([s1.y, e1.y, (s1.y + e1.y) / 2])
  for (const r of blocks) {
    xsSet.add(r.x)
    xsSet.add(r.x + r.w)
    ysSet.add(r.y)
    ysSet.add(r.y + r.h)
  }
  const xs = [...xsSet].sort((a, b) => a - b)
  const ys = [...ysSet].sort((a, b) => a - b)
  if (xs.length * ys.length > MAX_NODES) return fallbackOrthogonal(start, end, s1, e1)

  const W = xs.length
  const inside = (x: number, y: number): boolean => blocks.some((r) => strictlyContains(r, { x, y }))
  const free = new Uint8Array(W * ys.length)
  for (let j = 0; j < ys.length; j++) for (let i = 0; i < W; i++) free[j * W + i] = inside(xs[i], ys[j]) ? 0 : 1
  const si = xs.indexOf(s1.x) + ys.indexOf(s1.y) * W
  const ei = xs.indexOf(e1.x) + ys.indexOf(e1.y) * W
  free[si] = 1
  free[ei] = 1

  const nodeCount = W * ys.length
  const cost = new Float64Array(nodeCount * 4).fill(Infinity)
  const prev = new Int32Array(nodeCount * 4).fill(-1)
  const heap = new Heap()
  const h = (i: number): number => Math.abs(xs[i % W] - e1.x) + Math.abs(ys[Math.floor(i / W)] - e1.y)
  const startState = si * 4 + DIR_INDEX[start.dir]
  cost[startState] = 0
  heap.push(h(si), startState)
  const finalDir = DIR_INDEX[OPPOSITE[end.dir]]
  let goal = -1
  while (heap.size) {
    const state = heap.pop()
    const node = state >> 2
    const dir = state & 3
    const c = cost[state]
    if (node === ei) {
      goal = state
      break
    }
    const ix = node % W
    const iy = Math.floor(node / W)
    for (let d = 0; d < 4; d++) {
      if (d === (dir + 2) % 4) continue // no U-turns
      const nx = ix + (d === 1 ? 1 : d === 3 ? -1 : 0)
      const ny = iy + (d === 2 ? 1 : d === 0 ? -1 : 0)
      if (nx < 0 || ny < 0 || nx >= W || ny >= ys.length) continue
      const next = ny * W + nx
      if (!free[next]) continue
      const mx = (xs[ix] + xs[nx]) / 2
      const my = (ys[iy] + ys[ny]) / 2
      if (inside(mx, my)) continue
      let step = Math.abs(xs[nx] - xs[ix]) + Math.abs(ys[ny] - ys[iy]) + (d === dir ? 0 : BEND_COST)
      if (next === ei && d !== finalDir) step += BEND_COST
      const nState = next * 4 + d
      const nc = c + step
      if (nc < cost[nState]) {
        cost[nState] = nc
        prev[nState] = state
        heap.push(nc + h(next), nState)
      }
    }
  }
  if (goal < 0) return fallbackOrthogonal(start, end, s1, e1)
  const corners: Point[] = []
  for (let s = goal; s >= 0; s = prev[s]) {
    const node = s >> 2
    corners.push({ x: xs[node % W], y: ys[Math.floor(node / W)] })
  }
  corners.reverse()
  return simplify([start.point, s1, ...corners, e1, end.point])
}

/** A route with at most three bends that ignores other shapes (for huge pages or when no path exists). */
function fallbackOrthogonal(start: RouteEnd, end: RouteEnd, s1: Point, e1: Point): Point[] {
  const horizontalFirst = start.dir === 'e' || start.dir === 'w'
  const mid = horizontalFirst ? [{ x: (s1.x + e1.x) / 2, y: s1.y }, { x: (s1.x + e1.x) / 2, y: e1.y }] : [{ x: s1.x, y: (s1.y + e1.y) / 2 }, { x: e1.x, y: (s1.y + e1.y) / 2 }]
  return simplify([start.point, s1, ...mid, e1, end.point])
}

/** Path data for a polyline; `radius` rounds the corners. */
export function polylinePath(points: readonly Point[], radius = 0): string {
  if (points.length === 0) return ''
  if (radius <= 0 || points.length < 3) return points.map((p, i) => `${i ? 'L' : 'M'}${n(p.x)} ${n(p.y)}`).join(' ')
  let d = `M${n(points[0].x)} ${n(points[0].y)}`
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1]
    const b = points[i]
    const c = points[i + 1]
    const r = Math.min(radius, Math.hypot(b.x - a.x, b.y - a.y) / 2, Math.hypot(c.x - b.x, c.y - b.y) / 2)
    const p1 = { x: b.x - Math.sign(b.x - a.x) * r, y: b.y - Math.sign(b.y - a.y) * r }
    const p2 = { x: b.x + Math.sign(c.x - b.x) * r, y: b.y + Math.sign(c.y - b.y) * r }
    d += ` L${n(p1.x)} ${n(p1.y)} Q${n(b.x)} ${n(b.y)} ${n(p2.x)} ${n(p2.y)}`
  }
  const last = points[points.length - 1]
  return d + ` L${n(last.x)} ${n(last.y)}`
}

const angleOf = (from: Point, to: Point): number => Math.atan2(to.y - from.y, to.x - from.x)

export function makeRoute(points: Point[], radius = 0): Route {
  const pts = points.length >= 2 ? points : [points[0] ?? { x: 0, y: 0 }, points[0] ?? { x: 0, y: 0 }]
  return {
    points: pts,
    d: polylinePath(pts, radius),
    startAngle: angleOf(pts[1], pts[0]),
    endAngle: angleOf(pts[pts.length - 2], pts[pts.length - 1])
  }
}

export function curvedRoute(start: RouteEnd, end: RouteEnd, freeStart: boolean, freeEnd: boolean): Route {
  const dist = Math.hypot(end.point.x - start.point.x, end.point.y - start.point.y)
  const k = Math.max(30, Math.min(160, dist * 0.4))
  const c1 = freeStart ? start.point : add(start.point, SIDE_VECTORS[start.dir], k)
  const c2 = freeEnd ? end.point : add(end.point, SIDE_VECTORS[end.dir], k)
  const points = sampleCubic(start.point, c1, c2, end.point)
  return {
    points,
    d: `M${n(start.point.x)} ${n(start.point.y)} C${n(c1.x)} ${n(c1.y)} ${n(c2.x)} ${n(c2.y)} ${n(end.point.x)} ${n(end.point.y)}`,
    startAngle: angleOf(same(c1, start.point) ? (points[1] ?? end.point) : c1, start.point),
    endAngle: angleOf(same(c2, end.point) ? (points[points.length - 2] ?? start.point) : c2, end.point)
  }
}

/** The obstacle rectangles of shapes (their rotated bounds). */
export const obstacleRects = (shapes: readonly { x: number; y: number; w: number; h: number; rotation: number }[]): Rect[] => shapes.map((s) => rotatedBounds(s, s.rotation))

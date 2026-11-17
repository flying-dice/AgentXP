/** Connection points on the page: where a connector end meets its shape. */
import { center, rotatePoint, rotateVector, sideOf, SIDE_VECTORS, type Side } from './geometry'
import { sidePorts } from './stencils/kit'
import { stencilOf } from './stencils'
import type { PortDef } from './stencils/types'
import { resolveShapeStyle } from './style'
import type { Measure } from './text'
import type { ConnectorEnd, DiagramPage, DiagramShape, Point } from './types'

export interface PortPoint {
  /** The port id ('' for a free end). */
  id: string
  point: Point
  /** The way a connector leaves the shape here (after rotation). */
  dir: Side
}

/** The local connection points of a shape (before rotation). */
export function localPorts(shape: DiagramShape): PortDef[] {
  const st = stencilOf(shape.stencil)
  return st.ports ? st.ports(shape.w, shape.h, shape) : sidePorts(shape.w, shape.h)
}

function toPage(shape: DiagramShape, p: PortDef): PortPoint {
  const c = center(shape)
  const point = rotatePoint({ x: shape.x + p.x, y: shape.y + p.y }, c, shape.rotation)
  const dir = shape.rotation ? sideOf(rotateVector(SIDE_VECTORS[p.dir], shape.rotation)) : p.dir
  return { id: p.id, point, dir }
}

/** Every connection point of a shape, on the page. */
export const shapePorts = (shape: DiagramShape): PortPoint[] => localPorts(shape).map((p) => toPage(shape, p))

const FRACTION = /^\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*$/

/** The nearest side of the box to a local point. */
function nearestSide(shape: DiagramShape, x: number, y: number): Side {
  const d = { n: y, s: shape.h - y, w: x, e: shape.w - x }
  return (Object.entries(d) as [Side, number][]).sort((a, b) => a[1] - b[1])[0][0]
}

/**
 * The candidate points of a port name on a shape: a stencil port id, a named port of the stencil (an ERD attribute,
 * "y=120" on a lifeline), or a fraction "0.5,0.25" of the box. Unknown or absent: every port (dynamic glue).
 */
export function portCandidates(shape: DiagramShape, port: string | undefined, measure: Measure): PortPoint[] {
  const all = localPorts(shape)
  if (port) {
    const named = all.find((p) => p.id === port)
    if (named) return [toPage(shape, named)]
    const st = stencilOf(shape.stencil)
    const extra = st.namedPorts?.(shape, port, resolveShapeStyle(st.style, shape.style), measure)
    if (extra && extra.length) return extra.map((p) => toPage(shape, p))
    const f = FRACTION.exec(port)
    if (f) {
      const x = Math.max(0, Math.min(1, Number(f[1]))) * shape.w
      const y = Math.max(0, Math.min(1, Number(f[2]))) * shape.h
      return [toPage(shape, { id: port, x, y, dir: nearestSide(shape, x, y) })]
    }
  }
  return all.map((p) => toPage(shape, p))
}

/** Is the port name valid for the shape (so the agent can be told when it is not)? */
export function isKnownPort(shape: DiagramShape, port: string, measure: Measure): boolean {
  if (localPorts(shape).some((p) => p.id === port)) return true
  const st = stencilOf(shape.stencil)
  if (st.namedPorts?.(shape, port, resolveShapeStyle(st.style, shape.style), measure)?.length) return true
  return FRACTION.test(port)
}

export interface ResolvedEnd {
  shape: DiagramShape | null
  candidates: PortPoint[]
}

export function resolveEnd(page: DiagramPage, end: ConnectorEnd, measure: Measure, shapes?: Map<string, DiagramShape>): ResolvedEnd {
  if ('shape' in end) {
    const shape = shapes ? shapes.get(end.shape) : page.shapes.find((s) => s.id === end.shape)
    if (shape) return { shape, candidates: portCandidates(shape, end.port, measure) }
    return { shape: null, candidates: [{ id: '', point: { x: 0, y: 0 }, dir: 'e' }] }
  }
  return { shape: null, candidates: [{ id: '', point: { x: end.x, y: end.y }, dir: 'e' }] }
}

/** How good a pair of ports is: short, and each end leaves towards the other. */
function pairScore(a: PortPoint, b: PortPoint, aFree: boolean, bFree: boolean): number {
  const dx = b.point.x - a.point.x
  const dy = b.point.y - a.point.y
  let score = Math.abs(dx) + Math.abs(dy)
  const facing = (p: PortPoint, vx: number, vy: number): number => {
    const v = SIDE_VECTORS[p.dir]
    const dot = v.x * vx + v.y * vy
    return dot >= 0 ? 0 : 80 + Math.abs(dot) * 0.6
  }
  // A U (both ends leave the same way, like a loop back up the left side) always has one end facing away: its
  // bends say what it costs.
  const uTurn = !aFree && !bFree && a.dir === b.dir
  if (!aFree && !uTurn) score += facing(a, dx, dy)
  if (!bFree && !uTurn) score += facing(b, -dx, -dy)
  if (!aFree && !bFree) score += estimateBends(a, b) * BEND_COST
  return score
}

/** What a bend of an orthogonal route costs, in page units of length: fewer bends read better than a shorter line. */
export const BEND_COST = 30
const ROOM = 16

/**
 * How many bends a right-angle route between two glued ports needs: 0 for a straight line, 1 for an L, 2 for a Z or
 * a U, more when an end has to double back. A port on the far side that is a little shorter but needs a dogleg loses.
 */
export function estimateBends(a: PortPoint, b: PortPoint): number {
  const va = SIDE_VECTORS[a.dir]
  const vb = SIDE_VECTORS[b.dir]
  const d = { x: b.point.x - a.point.x, y: b.point.y - a.point.y }
  const alongA = va.x * d.x + va.y * d.y
  const alongB = -(vb.x * d.x + vb.y * d.y)
  const across = Math.abs(va.x * d.y - va.y * d.x)
  if (va.x === -vb.x && va.y === -vb.y) {
    if (alongA > 0 && across < 1) return 0
    return alongA > 2 * ROOM ? 2 : 4
  }
  if (va.x === vb.x && va.y === vb.y) return 2
  return alongA > ROOM && alongB > ROOM ? 1 : 3
}

export interface PortPair {
  a: PortPoint
  b: PortPoint
  /** The estimate that ranked the pair (length, ends that face away, bends, shared ports). */
  score: number
  /** What sharing a port with other connectors added to `score`. */
  share: number
}

/** Every pair of candidates for the two ends of a connector, best estimate first. Free ends face the other end. */
export function rankPorts(from: ResolvedEnd, to: ResolvedEnd, penalty: (shape: DiagramShape | null, port: PortPoint) => number = () => 0): PortPair[] {
  const pairs: PortPair[] = []
  for (const a of from.candidates) {
    for (const b of to.candidates) {
      const share = (from.candidates.length > 1 ? penalty(from.shape, a) : 0) + (to.candidates.length > 1 ? penalty(to.shape, b) : 0)
      pairs.push({ a, b, score: pairScore(a, b, !from.shape, !to.shape) + share, share })
    }
  }
  if (!pairs.length) pairs.push({ a: from.candidates[0], b: to.candidates[0], score: 0, share: 0 })
  return pairs.sort((x, y) => x.score - y.score).map((pick) => ({
    ...pick,
    a: from.shape ? pick.a : { ...pick.a, dir: sideOf({ x: pick.b.point.x - pick.a.point.x, y: pick.b.point.y - pick.a.point.y }) },
    b: to.shape ? pick.b : { ...pick.b, dir: sideOf({ x: pick.a.point.x - pick.b.point.x, y: pick.a.point.y - pick.b.point.y }) }
  }))
}

/** Picks the best pair of candidates for the two ends of a connector by the estimate alone. */
export function choosePorts(from: ResolvedEnd, to: ResolvedEnd, penalty: (shape: DiagramShape | null, port: PortPoint) => number = () => 0): { a: PortPoint; b: PortPoint } {
  const [best] = rankPorts(from, to, penalty)
  return { a: best.a, b: best.b }
}

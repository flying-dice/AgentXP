/**
 * Connector ends drawn as plain paths (not SVG <marker>s), so they take the line color and look the same in an
 * exported file. Each marker is drawn at a tip, pointing along `angle` (the direction the line arrives in).
 */
import { el, n, type SvgNode } from './svg'
import type { MarkerKind, Point } from './types'

export interface MarkerGeometry {
  nodes: SvgNode[]
  /** How far to pull the line back from the tip so it does not show through a hollow head. */
  inset: number
}

export function drawMarker(kind: MarkerKind, tip: Point, angle: number, color: string, width: number, background = '#ffffff'): MarkerGeometry {
  if (kind === 'none') return { nodes: [], inset: 0 }
  const s = 1 + Math.max(0, width - 1) * 0.35
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  // Local frame: x runs back along the line from the tip, y is across it.
  const at = (back: number, across: number): Point => ({ x: tip.x - cos * back * s - sin * across * s, y: tip.y - sin * back * s + cos * across * s })
  const path = (pts: Point[], close: boolean): string => pts.map((p, i) => `${i ? 'L' : 'M'}${n(p.x)} ${n(p.y)}`).join(' ') + (close ? ' Z' : '')
  const line = { stroke: color, 'stroke-width': width, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }
  const bar = (back: number): SvgNode => el('path', { d: path([at(back, -6), at(back, 6)], false), fill: 'none', ...line })
  const circle = (back: number, filled: boolean): SvgNode => {
    const c = at(back, 0)
    return el('circle', { cx: c.x, cy: c.y, r: 4.5 * s, fill: filled ? color : background, ...line })
  }
  const crow = (): SvgNode => el('path', { d: `${path([at(13, 0), at(0, -7)], false)} ${path([at(13, 0), at(0, 0)], false)} ${path([at(13, 0), at(0, 7)], false)}`, fill: 'none', ...line })

  switch (kind) {
    case 'arrow':
      return { nodes: [el('path', { d: path([tip, at(11, -4.5), at(9, 0), at(11, 4.5)], true), fill: color, ...line, 'stroke-width': Math.min(width, 1) })], inset: 8 * s }
    case 'open-arrow':
      return { nodes: [el('path', { d: path([at(11, -5.5), tip, at(11, 5.5)], false), fill: 'none', ...line })], inset: 0 }
    case 'triangle':
    case 'filled-triangle':
      return { nodes: [el('path', { d: path([tip, at(14, -7.5), at(14, 7.5)], true), fill: kind === 'triangle' ? background : color, ...line })], inset: 14 * s }
    case 'diamond':
    case 'filled-diamond':
      return { nodes: [el('path', { d: path([tip, at(9, -5.5), at(18, 0), at(9, 5.5)], true), fill: kind === 'diamond' ? background : color, ...line })], inset: 18 * s }
    case 'circle':
    case 'filled-circle':
      return { nodes: [circle(5, kind === 'filled-circle')], inset: 9.5 * s }
    case 'erd-one':
      return { nodes: [bar(9)], inset: 0 }
    case 'erd-one-only':
      return { nodes: [bar(8), bar(14)], inset: 0 }
    case 'erd-many':
      return { nodes: [crow()], inset: 0 }
    case 'erd-zero-one':
      return { nodes: [bar(8), circle(18, false)], inset: 0 }
    case 'erd-one-many':
      return { nodes: [crow(), bar(17)], inset: 0 }
    case 'erd-zero-many':
      return { nodes: [crow(), circle(19, false)], inset: 0 }
  }
}

/** Moves the end of a polyline back by `inset` along its last segment (start: its first segment). */
export function insetEnd(points: Point[], inset: number, atStart: boolean): Point[] {
  if (inset <= 0 || points.length < 2) return points
  const out = points.map((p) => ({ ...p }))
  const [i, j] = atStart ? [0, 1] : [out.length - 1, out.length - 2]
  const a = out[i]
  const b = out[j]
  const len = Math.hypot(a.x - b.x, a.y - b.y)
  if (len < 0.01) return out
  const k = Math.min(inset, len - 0.5) / len
  out[i] = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
  return out
}

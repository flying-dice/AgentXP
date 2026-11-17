/** Automatic layout: layered (dagre), grid and circle. Moves shapes only; connectors re-route themselves. */
import dagre from '@dagrejs/dagre'
import { rotatedBounds, unionRects } from './geometry'
import { pageOf } from './document'
import { stencilOf } from './stencils'
import type { DiagramDoc, DiagramShape } from './types'

export type LayoutDirection = 'TB' | 'LR' | 'BT' | 'RL'

export interface LayoutOptions {
  algorithm?: 'layered' | 'grid' | 'circle'
  direction?: LayoutDirection
  /** Space between shapes in a rank (layered) or between cells (grid). */
  spacing?: number
  /** Space between ranks (layered). */
  rankSpacing?: number
  /** Only these shapes (default: every shape that is not a container). */
  ids?: string[]
  /** Grid: shapes per row (default: about square). */
  columns?: number
}

const shapeEnds = (e: { shape: string } | { x: number; y: number }): string | null => ('shape' in e ? e.shape : null)

/** Lays out shapes on a page. Keeps the top-left of what it moves where it was. Returns how many shapes moved. */
export function layoutPage(draft: DiagramDoc, pageIndex: number, options: LayoutOptions = {}): number {
  const page = pageOf(draft, pageIndex)
  const pick = options.ids ? new Set(options.ids) : null
  const shapes = page.shapes.filter((s) => (pick ? pick.has(s.id) : !stencilOf(s.stencil).container) && !s.locked)
  if (shapes.length === 0) return 0
  const before = unionRects(shapes.map((s) => rotatedBounds(s, s.rotation)))!
  const origin = { x: Math.max(40, before.x), y: Math.max(40, before.y) }
  const algorithm = options.algorithm ?? 'layered'
  if (algorithm === 'grid') gridLayout(shapes, options)
  else if (algorithm === 'circle') circleLayout(shapes, options)
  else layeredLayout(page.connectors, shapes, options)
  // Move the result back to where the shapes were.
  const after = unionRects(shapes.map((s) => rotatedBounds(s, s.rotation)))!
  const dx = origin.x - after.x
  const dy = origin.y - after.y
  for (const s of shapes) {
    s.x = Math.round(s.x + dx)
    s.y = Math.round(s.y + dy)
  }
  return shapes.length
}

function layeredLayout(connectors: DiagramDoc['pages'][number]['connectors'], shapes: DiagramShape[], options: LayoutOptions): void {
  const g = new dagre.graphlib.Graph({ multigraph: true })
  g.setGraph({ rankdir: options.direction ?? 'TB', nodesep: options.spacing ?? 50, ranksep: options.rankSpacing ?? 70, edgesep: 20, marginx: 0, marginy: 0 })
  g.setDefaultEdgeLabel(() => ({}))
  const ids = new Set(shapes.map((s) => s.id))
  for (const s of shapes) {
    const r = rotatedBounds(s, s.rotation)
    g.setNode(s.id, { width: r.w, height: r.h })
  }
  connectors.forEach((c, i) => {
    const a = shapeEnds(c.from)
    const b = shapeEnds(c.to)
    if (a && b && a !== b && ids.has(a) && ids.has(b)) g.setEdge(a, b, { minlen: 1, weight: 1, width: c.label ? 60 : 0, height: c.label ? 16 : 0 }, `e${i}`)
  })
  dagre.layout(g)
  for (const s of shapes) {
    const node = g.node(s.id) as { x: number; y: number } | undefined
    if (!node) continue
    s.x = node.x - s.w / 2
    s.y = node.y - s.h / 2
  }
}

function gridLayout(shapes: DiagramShape[], options: LayoutOptions): void {
  const columns = Math.max(1, options.columns ?? Math.ceil(Math.sqrt(shapes.length)))
  const gap = options.spacing ?? 50
  const cellW = Math.max(...shapes.map((s) => s.w))
  const rows: DiagramShape[][] = []
  shapes.forEach((s, i) => (rows[Math.floor(i / columns)] ??= []).push(s))
  let y = 0
  for (const row of rows) {
    const rowH = Math.max(...row.map((s) => s.h))
    row.forEach((s, i) => {
      s.x = i * (cellW + gap) + (cellW - s.w) / 2
      s.y = y + (rowH - s.h) / 2
    })
    y += rowH + gap
  }
}

function circleLayout(shapes: DiagramShape[], options: LayoutOptions): void {
  const gap = options.spacing ?? 40
  const perimeter = shapes.reduce((t, s) => t + Math.max(s.w, s.h) + gap, 0)
  const r = Math.max(80, perimeter / (2 * Math.PI))
  shapes.forEach((s, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / shapes.length
    s.x = r + r * Math.cos(a) - s.w / 2
    s.y = r + r * Math.sin(a) - s.h / 2
  })
}

/** Shapes and connectors as SVG node trees, and the SVG export. The canvas and the export share this code. */
import { boundsOfPoints, inflate, pointAlong, rotatedBounds, unionRects } from './geometry'
import { drawMarker, insetEnd } from './markers'
import { BEND_COST, choosePorts, rankPorts, resolveEnd, type PortPoint } from './ports'
import { presetById } from './presets'
import { curvedRoute, makeRoute, obstacleRects, routeOrthogonal, type Route } from './routing'
import { stencilOf } from './stencils'
import { textInset } from './stencils/kit'
import { dashArray, normalizeColor, resolveConnectorStyle, resolveShapeStyle, tint } from './style'
import { el, toMarkup, type SvgNode } from './svg'
import { lineHeight, textBlock, type Measure } from './text'
import type { ConnectorStyle, DiagramConnector, DiagramDoc, DiagramPage, DiagramShape, Point, Rect, ShapeStyle } from './types'

export const gradientId = (color: string): string => `a7g-${color.replace(/[^0-9a-z]/gi, '')}`
export const SHADOW_ID = 'a7-shadow'

const paintable = (color: string): boolean => color !== 'none' && color !== 'transparent' && normalizeColor(color) !== null

export interface ShapeRender {
  node: SvgNode
  /** The fill color that needs a gradient definition, if any. */
  gradient: string | null
  style: ShapeStyle
}

export function shapeStyle(shape: DiagramShape): ShapeStyle {
  return resolveShapeStyle(stencilOf(shape.stencil).style, shape.style)
}

/** The text box of a shape in its own coordinates (null: no text, or the stencil draws it). */
export function shapeTextBox(shape: DiagramShape): Rect | null {
  const st = stencilOf(shape.stencil)
  return st.textBox ? st.textBox(shape.w, shape.h, shape) : textInset(shape.w, shape.h)
}

export function renderShape(shape: DiagramShape, measure: Measure, opts: { hideText?: boolean } = {}): ShapeRender {
  const st = stencilOf(shape.stencil)
  const style = shapeStyle(shape)
  const wantsGradient = style.gradient && paintable(style.fill)
  const fill = wantsGradient ? `url(#${gradientId(normalizeColor(style.fill)!)})` : style.fill
  const line: Record<string, string | number> = { stroke: style.stroke, 'stroke-width': style.stroke === 'none' ? 0 : style.strokeWidth, 'stroke-linejoin': 'round' }
  const dash = dashArray(style.dash, style.strokeWidth)
  if (dash) line['stroke-dasharray'] = dash
  const body = st.body({ shape, w: shape.w, h: shape.h, style, fill, line, measure })
  const children: SvgNode[] = [...body]
  const box = shapeTextBox(shape)
  if (box && !opts.hideText) {
    const text = textBlock(shape.text, box, style, measure)
    if (text) children.push(text)
  }
  const transform = `translate(${round(shape.x)} ${round(shape.y)})${shape.rotation ? ` rotate(${round(shape.rotation)} ${round(shape.w / 2)} ${round(shape.h / 2)})` : ''}`
  const node = el(
    'g',
    {
      transform,
      opacity: style.opacity < 1 ? style.opacity : undefined,
      filter: style.shadow ? `url(#${SHADOW_ID})` : undefined,
      'data-shape-id': shape.id
    },
    children
  )
  return { node, gradient: wantsGradient ? normalizeColor(style.fill) : null, style }
}

const round = (v: number): number => Math.round(v * 100) / 100

// ---------------------------------------------------------------- connectors

export interface RouteContext {
  shapes: Map<string, DiagramShape>
  obstacles: Rect[]
  obstacleOwners: string[]
  /** How many connector ends already use each port ("shape:port"), so dynamic glue spreads connectors over the sides. */
  used: Map<string, number>
  /** The ports chosen for the page's connectors, made on first use (see `planPorts`). */
  plan?: Map<string, PlannedPorts>
}

/** The ports of a connector, and its right-angle route when the plan already found it. */
export interface PlannedPorts {
  a: PortPoint
  b: PortPoint
  points?: Point[]
}

export function routeContext(page: DiagramPage): RouteContext {
  const solid = page.shapes.filter((s) => !stencilOf(s.stencil).container)
  return { shapes: new Map(page.shapes.map((s) => [s.id, s])), obstacles: obstacleRects(solid), obstacleOwners: solid.map((s) => s.id), used: new Map() }
}

export function connectorStyle(c: DiagramConnector): ConnectorStyle {
  return resolveConnectorStyle(undefined, c.style)
}

/** What it costs to put one more connector end on a port that another connector already uses. */
const PORT_SHARE_COST = 70
const portKey = (shape: DiagramShape | null, port: { id: string }): string => `${shape?.id ?? ''}:${port.id}`

/**
 * Chooses the ports of every connector of a page together. A first pass takes the connectors in order and spreads
 * them over free ports; a second pass chooses each connector again, knowing the ports that all the others use. So the
 * first connector out of a decision does not take the bottom port that the second one needs more.
 */
export function planPorts(page: DiagramPage, measure: Measure, ctx: RouteContext): Map<string, PlannedPorts> {
  const ends = page.connectors.map((c) => ({ c, from: resolveEnd(page, c.from, measure, ctx.shapes), to: resolveEnd(page, c.to, measure, ctx.shapes) }))
  const plan = new Map<string, PlannedPorts>()
  const use = (shape: DiagramShape | null, port: PortPoint, by: number): void => {
    if (shape) ctx.used.set(portKey(shape, port), (ctx.used.get(portKey(shape, port)) ?? 0) + by)
  }
  // Big pages rank by the estimate only; smaller ones route the best few pairs and keep the one that really is shortest
  // with fewest bends around the other shapes (an L that a shape blocks is no longer an L).
  const tries = ends.length > 120 ? 1 : 4
  const choose = (e: (typeof ends)[number]): PlannedPorts => {
    const ranked = rankPorts(e.from, e.to, (shape, port) => (ctx.used.get(portKey(shape, port)) ?? 0) * PORT_SHARE_COST)
    const glued = e.from.shape && e.to.shape && (e.c.routing ?? 'orthogonal') === 'orthogonal' && !e.c.waypoints?.length
    if (!glued || tries === 1) return { a: ranked[0].a, b: ranked[0].b }
    let best: (PlannedPorts & { cost: number }) | null = null
    for (const pick of ranked.slice(0, tries)) {
      const points = routeOrthogonal(pick.a, pick.b, ctx.obstacles)
      let length = 0
      for (let i = 1; i < points.length; i++) length += Math.abs(points[i].x - points[i - 1].x) + Math.abs(points[i].y - points[i - 1].y)
      const cost = length + Math.max(0, points.length - 2) * BEND_COST + pick.share
      if (!best || cost < best.cost) best = { a: pick.a, b: pick.b, points, cost }
    }
    return best!
  }
  for (const e of ends) {
    const pick = choose(e)
    plan.set(e.c.id, pick)
    use(e.from.shape, pick.a, 1)
    use(e.to.shape, pick.b, 1)
  }
  for (const e of ends) {
    const old = plan.get(e.c.id)!
    use(e.from.shape, old.a, -1)
    use(e.to.shape, old.b, -1)
    const pick = choose(e)
    plan.set(e.c.id, pick)
    use(e.from.shape, pick.a, 1)
    use(e.to.shape, pick.b, 1)
  }
  return plan
}

/** The route of a connector on its page. */
export function connectorRoute(page: DiagramPage, c: DiagramConnector, measure: Measure, ctx: RouteContext = routeContext(page)): Route {
  const from = resolveEnd(page, c.from, measure, ctx.shapes)
  const to = resolveEnd(page, c.to, measure, ctx.shapes)
  ctx.plan ??= planPorts(page, measure, ctx)
  const planned = page.connectors.includes(c) ? ctx.plan.get(c.id) : undefined
  const { a, b } = planned ?? choosePorts(from, to, (shape, port) => (ctx.used.get(portKey(shape, port)) ?? 0) * PORT_SHARE_COST)
  const style = connectorStyle(c)
  if (c.routing === 'curved') return curvedRoute(a, b, !from.shape, !to.shape)
  if (c.routing === 'straight') return makeRoute([a.point, ...(c.waypoints ?? []), b.point])
  const points = planned?.points ?? routeOrthogonal(a, b, ctx.obstacles)
  return makeRoute(points, style.rounded ? 8 : 0)
}

export interface ConnectorRender {
  node: SvgNode
  route: Route
  /** Where the middle label is (for editing in place). */
  labelAt: Point
}

function labelNodes(text: string, at: Point, style: ConnectorStyle, measure: Measure, background: string, extra: Record<string, string> = {}): SvgNode[] {
  if (!text) return []
  const font = { family: style.fontFamily, size: style.fontSize }
  const lines = text.split('\n')
  const lh = lineHeight(style.fontSize)
  const w = Math.max(...lines.map((l) => measure(l, font))) + 6
  const h = lines.length * lh + 2
  const top = at.y - h / 2
  return [
    el('rect', { x: at.x - w / 2, y: top, width: w, height: h, fill: background, opacity: 0.92, ...extra }),
    el(
      'text',
      { x: at.x, y: top + 1 + (lh - style.fontSize) / 2 + style.fontSize * 0.8, 'text-anchor': 'middle', 'font-family': `${style.fontFamily}, Segoe UI, sans-serif`, 'font-size': style.fontSize, fill: style.fontColor },
      lines.map((l, i) => el('tspan', { x: at.x, dy: i ? lh : 0 }, undefined, l || ' '))
    )
  ]
}

/** A label next to one end of the route: a little along the line and off to its side. */
function endLabelPoint(points: Point[], atStart: boolean): Point {
  const along = pointAlong(atStart ? points : [...points].reverse(), 0)
  const seg = atStart ? [points[0], points[1] ?? points[0]] : [points[points.length - 1], points[points.length - 2] ?? points[points.length - 1]]
  const dx = seg[1].x - seg[0].x
  const dy = seg[1].y - seg[0].y
  const len = Math.hypot(dx, dy) || 1
  const k = Math.min(22, len / 2)
  return { x: along.point.x + (dx / len) * k + (-dy / len) * 10, y: along.point.y + (dy / len) * k + (dx / len) * 10 }
}

export function renderConnector(page: DiagramPage, c: DiagramConnector, measure: Measure, ctx: RouteContext = routeContext(page)): ConnectorRender {
  const route = connectorRoute(page, c, measure, ctx)
  const style = connectorStyle(c)
  const start = drawMarker(style.startMarker, route.points[0], route.startAngle, style.stroke, style.strokeWidth, page.background)
  const end = drawMarker(style.endMarker, route.points[route.points.length - 1], route.endAngle, style.stroke, style.strokeWidth, page.background)
  let d = route.d
  if (c.routing !== 'curved' && (start.inset || end.inset)) {
    const trimmed = insetEnd(insetEnd(route.points, start.inset, true), end.inset, false)
    d = makeRoute(trimmed, style.rounded ? 8 : 0).d
  }
  const dash = dashArray(style.dash, style.strokeWidth)
  const labelAt = pointAlong(route.points, 0.5).point
  const children: SvgNode[] = [
    el('path', { d, fill: 'none', stroke: style.stroke, 'stroke-width': style.strokeWidth, 'stroke-dasharray': dash, 'stroke-linejoin': 'round', 'stroke-linecap': 'butt' }),
    ...start.nodes,
    ...end.nodes,
    ...labelNodes(c.label, labelAt, style, measure, page.background),
    ...(c.startLabel ? labelNodes(c.startLabel, endLabelPoint(route.points, true), style, measure, page.background, { opacity: '0' }) : []),
    ...(c.endLabel ? labelNodes(c.endLabel, endLabelPoint(route.points, false), style, measure, page.background, { opacity: '0' }) : [])
  ]
  return { node: el('g', { 'data-connector-id': c.id }, children), route, labelAt }
}

// ---------------------------------------------------------------- page rendering and export

/** Gradient and shadow definitions for a set of fill colors. */
export function defsNodes(gradients: Iterable<string>): SvgNode[] {
  return [...new Set(gradients)].map((color) =>
    el('linearGradient', { id: gradientId(color), x1: 0, y1: 0, x2: 0, y2: 1 }, [
      el('stop', { offset: 0, 'stop-color': tint(color, 0.55) }),
      el('stop', { offset: 1, 'stop-color': color })
    ])
  )
}

export const SHADOW_FILTER_MARKUP = `<filter id="${SHADOW_ID}" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="3" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity="0.28"/></filter>`

/** Everything drawn on a page: the area shapes, their text and connectors cover. */
export function contentBounds(page: DiagramPage, measure: Measure): Rect | null {
  const rects: Rect[] = page.shapes.map((s) => {
    const r = rotatedBounds(s, s.rotation)
    const box = shapeTextBox(s)
    if (!box || !s.text) return r
    // Text that sits outside the box (actor names, network labels).
    return unionRects([r, { x: s.x + box.x, y: s.y + box.y, w: box.w, h: box.h }])!
  })
  const ctx = routeContext(page)
  for (const c of page.connectors) rects.push(inflate(boundsOfPoints(connectorRoute(page, c, measure, ctx).points), 12))
  return unionRects(rects)
}

export interface ExportOptions {
  /** `content`: crop to what is drawn (default); `page`: the whole paper. */
  area?: 'content' | 'page'
  padding?: number
  /** Only these shapes and the connectors between them. */
  only?: Set<string>
  transparent?: boolean
}

export function renderPageNodes(page: DiagramPage, measure: Measure, only?: Set<string>): { nodes: SvgNode[]; gradients: string[] } {
  const ctx = routeContext(page)
  const gradients: string[] = []
  const nodes: SvgNode[] = []
  for (const s of page.shapes) {
    if (only && !only.has(s.id)) continue
    const r = renderShape(s, measure)
    if (r.gradient) gradients.push(r.gradient)
    nodes.push(r.node)
  }
  for (const c of page.connectors) {
    if (only) {
      const ends = [c.from, c.to].map((e) => ('shape' in e ? e.shape : null))
      if (!only.has(c.id) && !ends.every((id) => id && only.has(id))) continue
    }
    nodes.push(renderConnector(page, c, measure, ctx).node)
  }
  return { nodes, gradients }
}

/** The page as a standalone SVG document. */
export function exportSvg(doc: DiagramDoc, pageIndex: number, measure: Measure, opts: ExportOptions = {}): { svg: string; width: number; height: number } {
  const page = doc.pages[pageIndex] ?? doc.pages[0]
  const pad = opts.padding ?? 20
  const { nodes, gradients } = renderPageNodes(page, measure, opts.only)
  const content = opts.only
    ? unionRects(page.shapes.filter((s) => opts.only!.has(s.id)).map((s) => rotatedBounds(s, s.rotation)))
    : contentBounds(page, measure)
  const area: Rect =
    opts.area === 'page' || !content
      ? { x: 0, y: 0, w: Math.max(page.width, content ? content.x + content.w + pad : 0), h: Math.max(page.height, content ? content.y + content.h + pad : 0) }
      : inflate(content, pad)
  const w = Math.ceil(area.w)
  const h = Math.ceil(area.h)
  const defs = defsNodes(gradients).map((g) => toMarkup(g, '    ')).join('\n')
  const body = nodes.map((node) => toMarkup(node, '  ')).join('\n')
  const bg = opts.transparent ? '' : `  <rect x="${area.x}" y="${area.y}" width="${w}" height="${h}" fill="${page.background}"/>\n`
  const title = `${doc.title}${doc.pages.length > 1 ? ` - ${page.name}` : ''}`
  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${round(area.x)} ${round(area.y)} ${w} ${h}" font-family="Segoe UI, sans-serif">\n` +
    `  <title>${title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>\n` +
    `  <defs>\n    ${SHADOW_FILTER_MARKUP}\n${defs}\n  </defs>\n` +
    bg +
    body +
    `\n</svg>\n`
  return { svg, width: w, height: h }
}

/** The connector presets' style, resolved (for the gallery). */
export const presetStyle = (id: string): ConnectorStyle => resolveConnectorStyle(presetById(id)?.style, undefined)

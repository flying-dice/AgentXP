/**
 * Document operations. Each operation works on a draft (a deep copy made by `edit`), so callers keep the old
 * document for undo. Pure: no DOM, no Svelte.
 */
import { boundsOfPoints, center, rotatedBounds, snap, unionRects } from './geometry'
import { isKnownPort } from './ports'
import { presetById } from './presets'
import { isStencilId, stencilOf, suggestStencils } from './stencils'
import { resolveShapeStyle } from './style'
import type { Measure } from './text'
import {
  DIAGRAM_FORMAT,
  DIAGRAM_VERSION,
  MARKER_KINDS,
  ROUTINGS,
  type ConnectorEnd,
  type ConnectorStyle,
  type DiagramConnector,
  type DiagramDoc,
  type DiagramPage,
  type DiagramShape,
  type Point,
  type Rect,
  type Routing,
  type ShapeStyle
} from './types'

export class DiagramError extends Error {}

// ---------------------------------------------------------------- creation

export const PAGE_SIZES = {
  'letter-landscape': { width: 1056, height: 816, name: 'Letter, landscape' },
  'letter-portrait': { width: 816, height: 1056, name: 'Letter, portrait' },
  'a4-landscape': { width: 1123, height: 794, name: 'A4, landscape' },
  'a4-portrait': { width: 794, height: 1123, name: 'A4, portrait' },
  'a3-landscape': { width: 1587, height: 1123, name: 'A3, landscape' },
  screen: { width: 1280, height: 720, name: 'Screen (16:9)' }
} as const
export type PageSizeId = keyof typeof PAGE_SIZES

export function blankPage(id: string, name: string): DiagramPage {
  return { id, name, width: PAGE_SIZES['letter-landscape'].width, height: PAGE_SIZES['letter-landscape'].height, autoSize: true, background: '#ffffff', gridSize: 10, showGrid: true, shapes: [], connectors: [] }
}

export function createDoc(title = 'Drawing1'): DiagramDoc {
  return { format: DIAGRAM_FORMAT, version: DIAGRAM_VERSION, title, pages: [blankPage('p1', 'Page-1')], nextId: 2 }
}

/** A deep copy changed by `fn`. */
export function edit<T = void>(doc: DiagramDoc, fn: (draft: DiagramDoc) => T): { doc: DiagramDoc; result: T } {
  const draft = structuredClone(doc)
  const result = fn(draft)
  return { doc: draft, result }
}

export function newId(draft: DiagramDoc, prefix: 's' | 'c' | 'p' | 'g'): string {
  const used = new Set<string>()
  for (const p of draft.pages) {
    used.add(p.id)
    for (const s of p.shapes) {
      used.add(s.id)
      if (s.groupId) used.add(s.groupId)
    }
    for (const c of p.connectors) used.add(c.id)
  }
  let id = `${prefix}${draft.nextId++}`
  while (used.has(id)) id = `${prefix}${draft.nextId++}`
  return id
}

export const pageOf = (doc: DiagramDoc, index: number): DiagramPage => {
  const page = doc.pages[index]
  if (!page) throw new DiagramError(`There is no page ${index + 1}; the diagram has ${doc.pages.length}.`)
  return page
}

export function findShape(page: DiagramPage, id: string): DiagramShape {
  const s = page.shapes.find((x) => x.id === id)
  if (!s) throw new DiagramError(`There is no shape "${id}" on page "${page.name}". Call diagram_read to see the ids.`)
  return s
}

export function findConnector(page: DiagramPage, id: string): DiagramConnector {
  const c = page.connectors.find((x) => x.id === id)
  if (!c) throw new DiagramError(`There is no connector "${id}" on page "${page.name}".`)
  return c
}

// ---------------------------------------------------------------- shapes

export interface ShapeInput {
  stencil: string
  x?: number
  y?: number
  w?: number
  h?: number
  rotation?: number
  text?: string
  style?: Partial<ShapeStyle>
  data?: Record<string, unknown>
  locked?: boolean
}

/** Grows (or shrinks) a shape to the size its content needs, for stencils that size themselves. */
export function fitShape(shape: DiagramShape, measure: Measure): void {
  const st = stencilOf(shape.stencil)
  if (!st.fit) return
  const need = st.fit(shape, resolveShapeStyle(st.style, shape.style), measure)
  shape.w = Math.max(shape.w, need.w)
  shape.h = need.h
}

/** A free spot for a shape of size w x h: right of what is there, wrapping onto a new row at the page edge. */
export function freeSpot(page: DiagramPage, w: number): Point {
  const margin = 40
  if (page.shapes.length === 0) return { x: margin + 20, y: margin + 20 }
  const content = unionRects(page.shapes.map((s) => rotatedBounds(s, s.rotation)))!
  const lastRowTop = Math.max(...page.shapes.map((s) => s.y))
  const row = page.shapes.filter((s) => s.y >= lastRowTop - 40)
  const right = Math.max(...row.map((s) => s.x + s.w))
  if (right + margin + w <= Math.max(page.width, content.x + content.w) - 20) return { x: snap(right + margin, 10), y: snap(Math.min(...row.map((s) => s.y)), 10) }
  return { x: snap(content.x, 10), y: snap(content.y + content.h + margin, 10) }
}

export function addShape(draft: DiagramDoc, pageIndex: number, input: ShapeInput, measure: Measure): DiagramShape {
  if (!isStencilId(input.stencil)) {
    const near = suggestStencils(input.stencil)
    throw new DiagramError(`Unknown stencil "${input.stencil}".${near.length ? ` Did you mean ${near.join(', ')}?` : ''} Call diagram_stencils for the list.`)
  }
  const page = pageOf(draft, pageIndex)
  const st = stencilOf(input.stencil)
  const w = clampSize(input.w ?? st.w)
  const h = clampSize(input.h ?? (input.w && st.keepAspect ? (input.w * st.h) / st.w : st.h))
  const spot = input.x === undefined || input.y === undefined ? freeSpot(page, w) : null
  const shape: DiagramShape = {
    id: newId(draft, 's'),
    stencil: input.stencil,
    x: input.x ?? spot!.x,
    y: input.y ?? spot!.y,
    w,
    h,
    rotation: normalizeAngle(input.rotation ?? 0),
    text: input.text ?? st.text ?? '',
    style: cleanStyle(input.style ?? {}),
    ...(input.data || st.data ? { data: structuredClone(input.data ?? st.data?.defaults ?? {}) } : {}),
    ...(input.locked ? { locked: true } : {})
  }
  fitShape(shape, measure)
  if (st.container) {
    // Containers go behind the shapes (after other containers).
    const firstSolid = page.shapes.findIndex((s) => !stencilOf(s.stencil).container)
    page.shapes.splice(firstSolid < 0 ? page.shapes.length : firstSolid, 0, shape)
  } else page.shapes.push(shape)
  return shape
}

export type ShapePatch = Partial<Omit<DiagramShape, 'id' | 'style'>> & { style?: Partial<ShapeStyle> | null }

export function updateShape(draft: DiagramDoc, pageIndex: number, id: string, patch: ShapePatch, measure: Measure): DiagramShape {
  const page = pageOf(draft, pageIndex)
  const shape = findShape(page, id)
  if (patch.stencil !== undefined && patch.stencil !== shape.stencil) {
    if (!isStencilId(patch.stencil)) throw new DiagramError(`Unknown stencil "${patch.stencil}". Call diagram_stencils for the list.`)
    shape.stencil = patch.stencil
  }
  for (const key of ['x', 'y', 'w', 'h'] as const) {
    const v = patch[key]
    if (typeof v === 'number' && Number.isFinite(v)) shape[key] = key === 'w' || key === 'h' ? clampSize(v) : v
  }
  if (typeof patch.rotation === 'number') shape.rotation = normalizeAngle(patch.rotation)
  if (typeof patch.text === 'string') shape.text = patch.text
  if (patch.style === null) shape.style = {}
  else if (patch.style) shape.style = cleanStyle({ ...shape.style, ...patch.style })
  if (patch.data !== undefined) shape.data = patch.data ? structuredClone({ ...(shape.data ?? {}), ...patch.data }) : undefined
  if (patch.locked !== undefined) shape.locked = patch.locked || undefined
  if (patch.groupId !== undefined) shape.groupId = patch.groupId || undefined
  fitShape(shape, measure)
  return shape
}

const clampSize = (v: number): number => Math.max(4, Math.min(20000, Math.round(v * 100) / 100))
export const normalizeAngle = (deg: number): number => {
  const a = ((Math.round(deg * 100) / 100) % 360 + 360) % 360
  return a === 360 ? 0 : a
}

const STYLE_KEYS: readonly (keyof ShapeStyle | keyof ConnectorStyle)[] = [
  'fill', 'gradient', 'stroke', 'strokeWidth', 'dash', 'opacity', 'shadow', 'fontFamily', 'fontSize', 'fontColor', 'bold', 'italic', 'underline', 'textAlign', 'verticalAlign',
  'startMarker', 'endMarker', 'rounded'
]

/** Keeps known style keys with sane values and drops the rest. */
export function cleanStyle<T extends Partial<ShapeStyle> | Partial<ConnectorStyle>>(style: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(style)) {
    if (!STYLE_KEYS.includes(k as keyof ShapeStyle) || v === undefined || v === null) continue
    if (k === 'strokeWidth') out[k] = Math.max(0, Math.min(20, Number(v)))
    else if (k === 'fontSize') out[k] = Math.max(6, Math.min(96, Number(v)))
    else if (k === 'opacity') out[k] = Math.max(0, Math.min(1, Number(v)))
    else if (k === 'startMarker' || k === 'endMarker') out[k] = (MARKER_KINDS as readonly string[]).includes(String(v)) ? v : 'none'
    else if (k === 'dash') out[k] = ['solid', 'dashed', 'dotted', 'dash-dot'].includes(String(v)) ? v : 'solid'
    else if (k === 'textAlign') out[k] = ['left', 'center', 'right'].includes(String(v)) ? v : 'center'
    else if (k === 'verticalAlign') out[k] = ['top', 'middle', 'bottom'].includes(String(v)) ? v : 'middle'
    else out[k] = v
  }
  return out as T
}

// ---------------------------------------------------------------- connectors

export interface ConnectorInput {
  from: ConnectorEnd
  to: ConnectorEnd
  routing?: Routing
  label?: string
  startLabel?: string
  endLabel?: string
  preset?: string
  style?: Partial<ConnectorStyle>
  waypoints?: Point[]
}

function checkEnd(page: DiagramPage, end: ConnectorEnd, measure: Measure): ConnectorEnd {
  if ('shape' in end) {
    const shape = findShape(page, end.shape)
    if (end.port && !isKnownPort(shape, end.port, measure)) {
      throw new DiagramError(`Shape "${shape.id}" (${shape.stencil}) has no connection point "${end.port}". Leave the port out to glue to the nearest point.`)
    }
    return end.port ? { shape: end.shape, port: end.port } : { shape: end.shape }
  }
  if (!Number.isFinite(end.x) || !Number.isFinite(end.y)) throw new DiagramError('A free connector end needs numbers x and y.')
  return { x: end.x, y: end.y }
}

export function addConnector(draft: DiagramDoc, pageIndex: number, input: ConnectorInput, measure: Measure): DiagramConnector {
  const page = pageOf(draft, pageIndex)
  const preset = input.preset ? presetById(input.preset) : undefined
  if (input.preset && !preset) throw new DiagramError(`Unknown connector preset "${input.preset}". Call diagram_stencils to see the presets.`)
  const routing = input.routing ?? preset?.routing ?? 'orthogonal'
  if (!(ROUTINGS as readonly string[]).includes(routing)) throw new DiagramError(`routing must be one of ${ROUTINGS.join(', ')}.`)
  const connector: DiagramConnector = {
    id: newId(draft, 'c'),
    from: checkEnd(page, input.from, measure),
    to: checkEnd(page, input.to, measure),
    routing,
    label: input.label ?? preset?.label ?? '',
    ...(input.startLabel ? { startLabel: input.startLabel } : {}),
    ...(input.endLabel ? { endLabel: input.endLabel } : {}),
    style: cleanStyle({ ...(preset?.style ?? {}), ...(input.style ?? {}) }),
    ...(input.waypoints?.length ? { waypoints: input.waypoints.map((p) => ({ x: p.x, y: p.y })) } : {})
  }
  page.connectors.push(connector)
  return connector
}

export type ConnectorPatch = Partial<Omit<DiagramConnector, 'id' | 'style'>> & { style?: Partial<ConnectorStyle> | null; preset?: string }

export function updateConnector(draft: DiagramDoc, pageIndex: number, id: string, patch: ConnectorPatch, measure: Measure): DiagramConnector {
  const page = pageOf(draft, pageIndex)
  const c = findConnector(page, id)
  if (patch.preset) {
    const preset = presetById(patch.preset)
    if (!preset) throw new DiagramError(`Unknown connector preset "${patch.preset}".`)
    c.routing = preset.routing
    c.style = cleanStyle({ ...c.style, ...preset.style })
    if (preset.label && !c.label) c.label = preset.label
  }
  if (patch.from) c.from = checkEnd(page, patch.from, measure)
  if (patch.to) c.to = checkEnd(page, patch.to, measure)
  if (patch.routing) {
    if (!(ROUTINGS as readonly string[]).includes(patch.routing)) throw new DiagramError(`routing must be one of ${ROUTINGS.join(', ')}.`)
    c.routing = patch.routing
  }
  if (typeof patch.label === 'string') c.label = patch.label
  if (patch.startLabel !== undefined) c.startLabel = patch.startLabel || undefined
  if (patch.endLabel !== undefined) c.endLabel = patch.endLabel || undefined
  if (patch.style === null) c.style = {}
  else if (patch.style) c.style = cleanStyle({ ...c.style, ...patch.style })
  if (patch.waypoints !== undefined) c.waypoints = patch.waypoints?.length ? patch.waypoints.map((p) => ({ x: p.x, y: p.y })) : undefined
  return c
}

// ---------------------------------------------------------------- selections

/** The ids plus every other member of their groups. */
export function expandGroups(page: DiagramPage, ids: Iterable<string>): string[] {
  const set = new Set(ids)
  const groups = new Set(page.shapes.filter((s) => set.has(s.id) && s.groupId).map((s) => s.groupId!))
  for (const s of page.shapes) if (s.groupId && groups.has(s.groupId)) set.add(s.id)
  return [...set]
}

export const isShapeId = (page: DiagramPage, id: string): boolean => page.shapes.some((s) => s.id === id)
export const isConnectorId = (page: DiagramPage, id: string): boolean => page.connectors.some((c) => c.id === id)

const endShape = (e: ConnectorEnd): string | null => ('shape' in e ? e.shape : null)

/** Deletes shapes and connectors; connectors glued to a deleted shape go too. Returns what was removed. */
export function deleteItems(draft: DiagramDoc, pageIndex: number, ids: readonly string[]): { shapes: number; connectors: number } {
  const page = pageOf(draft, pageIndex)
  const gone = new Set(ids)
  const before = { s: page.shapes.length, c: page.connectors.length }
  page.shapes = page.shapes.filter((s) => !gone.has(s.id))
  page.connectors = page.connectors.filter((c) => !gone.has(c.id) && !gone.has(endShape(c.from) ?? '') && !gone.has(endShape(c.to) ?? ''))
  return { shapes: before.s - page.shapes.length, connectors: before.c - page.connectors.length }
}

/** Moves shapes, and the free ends and bend points of the selected connectors. */
export function moveItems(draft: DiagramDoc, pageIndex: number, ids: readonly string[], dx: number, dy: number): void {
  const page = pageOf(draft, pageIndex)
  const set = new Set(ids)
  for (const s of page.shapes) {
    if (!set.has(s.id) || s.locked) continue
    s.x += dx
    s.y += dy
  }
  for (const c of page.connectors) {
    const moving = set.has(c.id) || [c.from, c.to].every((e) => ('shape' in e ? set.has(e.shape) : false))
    if (!moving) continue
    if (!('shape' in c.from)) c.from = { x: c.from.x + dx, y: c.from.y + dy }
    if (!('shape' in c.to)) c.to = { x: c.to.x + dx, y: c.to.y + dy }
    if (c.waypoints) c.waypoints = c.waypoints.map((p) => ({ x: p.x + dx, y: p.y + dy }))
  }
}

export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'

export function alignShapes(draft: DiagramDoc, pageIndex: number, ids: readonly string[], mode: AlignMode): number {
  const page = pageOf(draft, pageIndex)
  const shapes = page.shapes.filter((s) => ids.includes(s.id) && !s.locked)
  if (shapes.length < 2) return 0
  const b = unionRects(shapes.map((s) => rotatedBounds(s, s.rotation)))!
  for (const s of shapes) {
    const r = rotatedBounds(s, s.rotation)
    const dx = mode === 'left' ? b.x - r.x : mode === 'right' ? b.x + b.w - (r.x + r.w) : mode === 'center' ? b.x + b.w / 2 - (r.x + r.w / 2) : 0
    const dy = mode === 'top' ? b.y - r.y : mode === 'bottom' ? b.y + b.h - (r.y + r.h) : mode === 'middle' ? b.y + b.h / 2 - (r.y + r.h / 2) : 0
    s.x += dx
    s.y += dy
  }
  return shapes.length
}

/** Spreads shapes so the gaps between them are equal (three or more shapes). */
export function distributeShapes(draft: DiagramDoc, pageIndex: number, ids: readonly string[], axis: 'horizontal' | 'vertical'): number {
  const page = pageOf(draft, pageIndex)
  const shapes = page.shapes.filter((s) => ids.includes(s.id) && !s.locked)
  if (shapes.length < 3) return 0
  const horizontal = axis === 'horizontal'
  const items = shapes.map((s) => ({ s, r: rotatedBounds(s, s.rotation) })).sort((a, b) => (horizontal ? a.r.x - b.r.x : a.r.y - b.r.y))
  const first = items[0].r
  const last = items[items.length - 1].r
  const span = horizontal ? last.x + last.w - first.x : last.y + last.h - first.y
  const total = items.reduce((t, i) => t + (horizontal ? i.r.w : i.r.h), 0)
  const gap = (span - total) / (items.length - 1)
  let at = horizontal ? first.x : first.y
  for (const { s, r } of items) {
    if (horizontal) s.x += at - r.x
    else s.y += at - r.y
    at += (horizontal ? r.w : r.h) + gap
  }
  return items.length
}

export type ZOrderOp = 'front' | 'back' | 'forward' | 'backward'

export function reorder(draft: DiagramDoc, pageIndex: number, ids: readonly string[], op: ZOrderOp): void {
  const page = pageOf(draft, pageIndex)
  const set = new Set(ids)
  const list = page.shapes
  if (op === 'front' || op === 'back') {
    const moving = list.filter((s) => set.has(s.id))
    const rest = list.filter((s) => !set.has(s.id))
    page.shapes = op === 'front' ? [...rest, ...moving] : [...moving, ...rest]
    return
  }
  const step = op === 'forward' ? 1 : -1
  const order = op === 'forward' ? [...list.keys()].reverse() : [...list.keys()]
  for (const i of order) {
    const j = i + step
    if (!set.has(list[i].id) || j < 0 || j >= list.length || set.has(list[j].id)) continue
    ;[list[i], list[j]] = [list[j], list[i]]
  }
}

export function groupShapes(draft: DiagramDoc, pageIndex: number, ids: readonly string[]): string | null {
  const page = pageOf(draft, pageIndex)
  const shapes = page.shapes.filter((s) => ids.includes(s.id))
  if (shapes.length < 2) return null
  const gid = newId(draft, 'g')
  for (const s of shapes) s.groupId = gid
  return gid
}

export function ungroupShapes(draft: DiagramDoc, pageIndex: number, ids: readonly string[]): number {
  const page = pageOf(draft, pageIndex)
  const groups = new Set(page.shapes.filter((s) => ids.includes(s.id) && s.groupId).map((s) => s.groupId))
  let count = 0
  for (const s of page.shapes)
    if (s.groupId && groups.has(s.groupId)) {
      delete s.groupId
      count++
    }
  return count
}

// ---------------------------------------------------------------- clipboard

export interface Clip {
  shapes: DiagramShape[]
  connectors: DiagramConnector[]
}

/** The selected shapes and the connectors among them (or selected), ready to paste. */
export function copyItems(page: DiagramPage, ids: readonly string[]): Clip {
  const set = new Set(expandGroups(page, ids))
  const shapes = page.shapes.filter((s) => set.has(s.id))
  const shapeIds = new Set(shapes.map((s) => s.id))
  const connectors = page.connectors.filter((c) => {
    const ends = [c.from, c.to].map((e) => ('shape' in e ? e.shape : null))
    return ends.every((e) => e === null || shapeIds.has(e)) && (set.has(c.id) || ends.some((e) => e !== null))
  })
  return structuredClone({ shapes, connectors })
}

/** Pastes a clip with new ids, moved by (dx, dy). Returns the new ids. */
export function pasteItems(draft: DiagramDoc, pageIndex: number, clip: Clip, dx: number, dy: number): string[] {
  const page = pageOf(draft, pageIndex)
  const map = new Map<string, string>()
  const groups = new Map<string, string>()
  const out: string[] = []
  for (const s of clip.shapes) {
    const id = newId(draft, 's')
    map.set(s.id, id)
    const copy: DiagramShape = { ...structuredClone(s), id, x: s.x + dx, y: s.y + dy }
    if (s.groupId) {
      if (!groups.has(s.groupId)) groups.set(s.groupId, newId(draft, 'g'))
      copy.groupId = groups.get(s.groupId)
    }
    page.shapes.push(copy)
    out.push(id)
  }
  const moveEnd = (e: ConnectorEnd): ConnectorEnd => ('shape' in e ? { ...e, shape: map.get(e.shape) ?? e.shape } : { x: e.x + dx, y: e.y + dy })
  for (const c of clip.connectors) {
    const ends = [c.from, c.to].map((e) => ('shape' in e ? e.shape : null))
    if (ends.some((e) => e !== null && !map.has(e) && !page.shapes.some((s) => s.id === e))) continue
    const id = newId(draft, 'c')
    page.connectors.push({ ...structuredClone(c), id, from: moveEnd(c.from), to: moveEnd(c.to), ...(c.waypoints ? { waypoints: c.waypoints.map((p) => ({ x: p.x + dx, y: p.y + dy })) } : {}) })
    out.push(id)
  }
  return out
}

// ---------------------------------------------------------------- pages

export function addPage(draft: DiagramDoc, name?: string, after?: number): number {
  const id = newId(draft, 'p')
  const base = draft.pages[after ?? draft.pages.length - 1] ?? draft.pages[0]
  const page = blankPage(id, name?.trim() || uniquePageName(draft))
  if (base) {
    page.width = base.width
    page.height = base.height
  }
  const index = after === undefined ? draft.pages.length : after + 1
  draft.pages.splice(index, 0, page)
  return index
}

function uniquePageName(doc: DiagramDoc): string {
  for (let i = doc.pages.length + 1; ; i++) {
    const name = `Page-${i}`
    if (!doc.pages.some((p) => p.name === name)) return name
  }
}

export function renamePage(draft: DiagramDoc, index: number, name: string): void {
  const n = name.trim()
  if (!n) throw new DiagramError('A page name cannot be empty.')
  pageOf(draft, index).name = n
}

export function deletePage(draft: DiagramDoc, index: number): void {
  if (draft.pages.length <= 1) throw new DiagramError('A diagram keeps at least one page.')
  pageOf(draft, index)
  draft.pages.splice(index, 1)
}

export function movePage(draft: DiagramDoc, from: number, to: number): void {
  const [page] = draft.pages.splice(from, 1)
  if (!page) return
  draft.pages.splice(Math.max(0, Math.min(draft.pages.length, to)), 0, page)
}

export function duplicatePage(draft: DiagramDoc, index: number): number {
  const src = pageOf(draft, index)
  const at = addPage(draft, `${src.name} (copy)`, index)
  const page = draft.pages[at]
  Object.assign(page, { width: src.width, height: src.height, autoSize: src.autoSize, background: src.background, gridSize: src.gridSize, showGrid: src.showGrid })
  pasteItems(draft, at, copyItems(src, src.shapes.map((s) => s.id)), 0, 0)
  return at
}

/** The visible sheet: the paper, grown to hold every shape when the page sizes itself. */
export function sheetBounds(page: DiagramPage): Rect {
  const base: Rect = { x: 0, y: 0, w: page.width, h: page.height }
  if (!page.autoSize || page.shapes.length === 0) return base
  const content = unionRects(page.shapes.map((s) => rotatedBounds(s, s.rotation)))!
  const grow = (lo: number, hi: number, size: number): [number, number] => {
    let a = 0
    let b = size
    while (lo < a) a -= size
    while (hi > b) b += size
    return [a, b]
  }
  const [x1, x2] = grow(content.x, content.x + content.w, page.width)
  const [y1, y2] = grow(content.y, content.y + content.h, page.height)
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}

// ---------------------------------------------------------------- loading

const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

function parseEnd(v: unknown): ConnectorEnd {
  const o = obj(v)
  if (typeof o['shape'] === 'string') return typeof o['port'] === 'string' && o['port'] ? { shape: o['shape'], port: o['port'] } : { shape: o['shape'] }
  return { x: num(o['x'], 0), y: num(o['y'], 0) }
}

/** Reads a saved diagram (or anything shaped like one), filling gaps and dropping what does not fit. Throws on a file that is not a diagram. */
export function parseDiagram(input: unknown): DiagramDoc {
  const raw = obj(typeof input === 'string' ? safeJson(input) : input)
  if (raw['format'] !== undefined && raw['format'] !== DIAGRAM_FORMAT) throw new DiagramError(`This file is not an Agent Diagrams file (format "${String(raw['format'])}").`)
  if (!Array.isArray(raw['pages'])) throw new DiagramError('This file is not an Agent Diagrams file: it has no pages.')
  const doc: DiagramDoc = { format: DIAGRAM_FORMAT, version: DIAGRAM_VERSION, title: str(raw['title'], 'Drawing1'), pages: [], nextId: Math.max(1, num(raw['nextId'], 1)) }
  const seen = new Set<string>()
  const fresh = (id: unknown, prefix: 's' | 'c' | 'p'): string => {
    let v = typeof id === 'string' && id && !seen.has(id) ? id : ''
    if (!v) do v = `${prefix}${doc.nextId++}`; while (seen.has(v))
    seen.add(v)
    const m = /^[a-z](\d+)$/.exec(v)
    if (m) doc.nextId = Math.max(doc.nextId, Number(m[1]) + 1)
    return v
  }
  for (const p of raw['pages'] as unknown[]) {
    const po = obj(p)
    const page = blankPage(fresh(po['id'], 'p'), str(po['name'], `Page-${doc.pages.length + 1}`))
    page.width = Math.max(100, num(po['width'], page.width))
    page.height = Math.max(100, num(po['height'], page.height))
    page.autoSize = po['autoSize'] !== false
    page.background = str(po['background'], '#ffffff')
    page.gridSize = Math.max(0, num(po['gridSize'], 10))
    page.showGrid = po['showGrid'] !== false
    for (const s of Array.isArray(po['shapes']) ? po['shapes'] : []) {
      const so = obj(s)
      const stencil = str(so['stencil'], 'basic.rectangle')
      page.shapes.push({
        id: fresh(so['id'], 's'),
        stencil,
        x: num(so['x'], 0),
        y: num(so['y'], 0),
        w: Math.max(4, num(so['w'], 100)),
        h: Math.max(4, num(so['h'], 60)),
        rotation: normalizeAngle(num(so['rotation'], 0)),
        text: str(so['text']),
        style: cleanStyle(obj(so['style']) as Partial<ShapeStyle>),
        ...(so['data'] && typeof so['data'] === 'object' ? { data: obj(so['data']) } : {}),
        ...(typeof so['groupId'] === 'string' && so['groupId'] ? { groupId: so['groupId'] } : {}),
        ...(so['locked'] === true ? { locked: true } : {})
      })
    }
    const ids = new Set(page.shapes.map((s) => s.id))
    for (const c of Array.isArray(po['connectors']) ? po['connectors'] : []) {
      const co = obj(c)
      const from = parseEnd(co['from'])
      const to = parseEnd(co['to'])
      if (('shape' in from && !ids.has(from.shape)) || ('shape' in to && !ids.has(to.shape))) continue
      const routing = (ROUTINGS as readonly string[]).includes(str(co['routing'])) ? (co['routing'] as Routing) : 'orthogonal'
      page.connectors.push({
        id: fresh(co['id'], 'c'),
        from,
        to,
        routing,
        label: str(co['label']),
        ...(str(co['startLabel']) ? { startLabel: str(co['startLabel']) } : {}),
        ...(str(co['endLabel']) ? { endLabel: str(co['endLabel']) } : {}),
        style: cleanStyle(obj(co['style']) as Partial<ConnectorStyle>),
        ...(Array.isArray(co['waypoints']) ? { waypoints: (co['waypoints'] as unknown[]).map((w) => ({ x: num(obj(w)['x'], 0), y: num(obj(w)['y'], 0) })) } : {})
      })
    }
    doc.pages.push(page)
  }
  if (doc.pages.length === 0) doc.pages.push(blankPage(fresh('p1', 'p'), 'Page-1'))
  return doc
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    throw new DiagramError('This file is not an Agent Diagrams file: it is not valid JSON.')
  }
}

export const serializeDiagram = (doc: DiagramDoc): string => JSON.stringify(doc, null, 2) + '\n'

/** The centre of a set of shapes, for pasting and zooming to a selection. */
export const centerOf = (shapes: readonly DiagramShape[]): Point => center(boundsOfPoints(shapes.flatMap((s) => [{ x: s.x, y: s.y }, { x: s.x + s.w, y: s.y + s.h }])))

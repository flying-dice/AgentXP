/**
 * What the agent's diagram_* tools do to the open diagram. Main validates the arguments (catalog.ts) and forwards
 * them to the Diagrams window as an app request; this module applies them to the document. Pure, so it is tested
 * without a window. Export to PNG, save and open need the window and live in the app.
 */
import {
  addConnector,
  addPage,
  addShape,
  alignShapes,
  createDoc,
  deleteItems,
  deletePage,
  DiagramError,
  distributeShapes,
  duplicatePage,
  edit,
  findConnector,
  findShape,
  groupShapes,
  PAGE_SIZES,
  renamePage,
  reorder,
  ungroupShapes,
  updateConnector,
  updateShape,
  type AlignMode,
  type ConnectorPatch,
  type PageSizeId,
  type ShapePatch,
  type ZOrderOp
} from './document'
import { layoutPage, type LayoutOptions } from './layout'
import { localPorts } from './ports'
import { CONNECTOR_PRESETS } from './presets'
import { exportSvg } from './render'
import { STENCIL_CATEGORIES, searchStencils, stencilOf } from './stencils'
import type { Measure } from './text'
import type { ConnectorEnd, DiagramConnector, DiagramDoc, DiagramPage, DiagramShape } from './types'

export interface DiagramSession {
  doc: DiagramDoc
  page: number
  selection: string[]
}

export interface AgentOutcome {
  session: DiagramSession
  /** The text the agent reads. */
  text: string
  /** The undo label when the document changed (null: nothing changed). */
  change: string | null
  /** Shapes and connectors to flash so the user sees what the agent touched. */
  touched?: string[]
}

type Params = Record<string, unknown>

const obj = (v: unknown): Params => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Params) : {})
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const optStr = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)
const optNum = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

/** The page a call means: a 1-based number, a page name or id; default: the current page. */
export function pageIndexFor(doc: DiagramDoc, current: number, page: unknown): number {
  if (page === undefined || page === null || page === '') return current
  if (typeof page === 'number') {
    if (page >= 1 && page <= doc.pages.length && Number.isInteger(page)) return page - 1
    throw new DiagramError(`There is no page ${page}; the diagram has ${doc.pages.length} page${doc.pages.length === 1 ? '' : 's'}.`)
  }
  const name = String(page).toLowerCase()
  const i = doc.pages.findIndex((p) => p.name.toLowerCase() === name || p.id === page)
  if (i < 0) throw new DiagramError(`There is no page "${String(page)}". Pages: ${doc.pages.map((p) => `"${p.name}"`).join(', ')}.`)
  return i
}

// ---------------------------------------------------------------- outline

const fmt = (v: number): string => String(Math.round(v))

export function describeShape(s: DiagramShape): string {
  const parts = [`${s.id} ${s.stencil}`, s.text ? JSON.stringify(s.text) : '""', `at (${fmt(s.x)}, ${fmt(s.y)}) ${fmt(s.w)}x${fmt(s.h)}`]
  if (s.rotation) parts.push(`rotated ${s.rotation}°`)
  if (s.groupId) parts.push(`group ${s.groupId}`)
  if (s.data && Object.keys(s.data).length) parts.push(`data ${JSON.stringify(s.data)}`)
  if (Object.keys(s.style).length) parts.push(`style ${JSON.stringify(s.style)}`)
  return parts.join(' ')
}

const endText = (e: ConnectorEnd): string => ('shape' in e ? `${e.shape}${e.port ? `.${e.port}` : ''}` : `(${fmt(e.x)}, ${fmt(e.y)})`)

export function describeConnector(c: DiagramConnector): string {
  const parts = [`${c.id} ${endText(c.from)} -> ${endText(c.to)} ${c.routing}`]
  if (c.label) parts.push(JSON.stringify(c.label))
  if (c.startLabel || c.endLabel) parts.push(`ends ${JSON.stringify(c.startLabel ?? '')}/${JSON.stringify(c.endLabel ?? '')}`)
  const markers = [c.style.startMarker, c.style.endMarker].some((m) => m !== undefined) ? `markers ${c.style.startMarker ?? 'none'}/${c.style.endMarker ?? 'arrow'}` : ''
  if (markers) parts.push(markers)
  const rest = Object.fromEntries(Object.entries(c.style).filter(([k]) => k !== 'startMarker' && k !== 'endMarker'))
  if (Object.keys(rest).length) parts.push(`style ${JSON.stringify(rest)}`)
  return parts.join(' ')
}

export function outline(doc: DiagramDoc, index: number, selection: readonly string[] = []): string {
  const page = doc.pages[index]
  const lines = [
    `Diagram "${doc.title}": page ${index + 1} of ${doc.pages.length} "${page.name}" (${page.width}x${page.height}${page.autoSize ? ', grows with the content' : ''}).`,
    `Pages: ${doc.pages.map((p, i) => `${i + 1} "${p.name}" (${p.shapes.length} shapes)`).join(', ')}.`,
    `Shapes (${page.shapes.length}, back to front):`,
    ...page.shapes.map((s) => `  ${describeShape(s)}`),
    `Connectors (${page.connectors.length}):`,
    ...page.connectors.map((c) => `  ${describeConnector(c)}`)
  ]
  if (selection.length) lines.push(`Selected: ${selection.join(', ')}`)
  return lines.join('\n')
}

// ---------------------------------------------------------------- stencil catalog

export function stencilCatalogText(category?: string, query?: string, detail = false): string {
  const cats = category ? STENCIL_CATEGORIES.filter((c) => c.id === category) : STENCIL_CATEGORIES
  if (category && cats.length === 0) throw new DiagramError(`Unknown category "${category}". Categories: ${STENCIL_CATEGORIES.map((c) => c.id).join(', ')}.`)
  const out: string[] = []
  if (query) {
    const hits = searchStencils(query, category)
    out.push(`Stencils matching "${query}" (${hits.length}):`)
    for (const s of hits) out.push(stencilLine(s.id, detail))
  } else {
    for (const c of cats) {
      out.push(`${c.name} [${c.id}]:`)
      for (const id of c.stencils) out.push(stencilLine(id, detail))
    }
  }
  out.push('', 'Connector presets (preset on a connector):')
  for (const p of CONNECTOR_PRESETS) out.push(`  ${p.id}: ${p.description}`)
  out.push('', 'Markers: none, arrow, open-arrow, triangle, filled-triangle, diamond, filled-diamond, circle, filled-circle, erd-one, erd-many, erd-one-only, erd-zero-one, erd-one-many, erd-zero-many.')
  return out.join('\n')
}

function stencilLine(id: string, detail: boolean): string {
  const s = stencilOf(id)
  let line = `  ${s.id}: ${s.name} (${s.w}x${s.h}${s.container ? ', container' : ''})`
  if (s.data) line += ` data: ${s.data.description}`
  if (detail) line += ` ports: ${localPorts({ id: '', stencil: s.id, x: 0, y: 0, w: s.w, h: s.h, rotation: 0, text: '', style: {} }).map((p) => p.id).join(',')}`
  return line
}

// ---------------------------------------------------------------- the methods

interface Refs {
  map: Map<string, string>
  resolve(idOrRef: unknown, what: string): string
}

function refs(page: DiagramPage): Refs {
  const map = new Map<string, string>()
  return {
    map,
    resolve(idOrRef, what) {
      if (typeof idOrRef !== 'string' || !idOrRef) throw new DiagramError(`${what} needs a shape id or a ref.`)
      const id = map.get(idOrRef) ?? idOrRef
      if (!page.shapes.some((s) => s.id === id)) throw new DiagramError(`${what}: there is no shape or ref "${idOrRef}". Use an id from diagram_read or a ref given earlier in the same call.`)
      return id
    }
  }
}

function endFrom(spec: Params, side: 'from' | 'to', r: Refs, page: DiagramPage, y: number | undefined): ConnectorEnd {
  const value = spec[side]
  const point = obj(spec[`${side}Point`])
  if ((value === undefined || value === null) && optNum(point['x']) !== undefined) return { x: optNum(point['x'])!, y: optNum(point['y']) ?? 0 }
  if (value && typeof value === 'object' && optNum(obj(value)['x']) !== undefined) return { x: optNum(obj(value)['x'])!, y: optNum(obj(value)['y']) ?? 0 }
  const id = r.resolve(value, `Connector ${side}`)
  let port = optStr(spec[`${side}Port`])
  if (y !== undefined && !port) {
    const shape = page.shapes.find((s) => s.id === id)!
    const local = Math.round(y - shape.y)
    port = stencilOf(shape.stencil).namedPorts?.(shape, `y=${local}`, {} as never, () => 0)?.length ? `y=${local}` : `0.5,${Math.max(0, Math.min(1, local / shape.h)).toFixed(3)}`
  }
  return port ? { shape: id, port } : { shape: id }
}

function shapePatchOf(spec: Params, r: Refs): ShapePatch {
  const patch: ShapePatch = {}
  for (const k of ['x', 'y', 'w', 'h', 'rotation'] as const) if (optNum(spec[k]) !== undefined) patch[k] = optNum(spec[k])
  if (typeof spec['text'] === 'string') patch.text = spec['text']
  if (typeof spec['stencil'] === 'string') patch.stencil = spec['stencil']
  if (spec['style'] !== undefined) patch.style = spec['style'] === null ? null : (obj(spec['style']) as ShapePatch['style'])
  if (spec['data'] !== undefined) patch.data = spec['data'] === null ? undefined : obj(spec['data'])
  if (typeof spec['locked'] === 'boolean') patch.locked = spec['locked']
  void r
  return patch
}

function addMethod(s: DiagramSession, params: Params, measure: Measure): AgentOutcome {
  const index = pageIndexFor(s.doc, s.page, params['page'])
  const shapes = list(params['shapes'])
  const connectors = list(params['connectors'])
  if (!shapes.length && !connectors.length) throw new DiagramError('Give shapes, connectors or both.')
  let placedAuto = 0
  const { doc, result } = edit(s.doc, (draft) => {
    const page = draft.pages[index]
    const r = refs(page)
    const added: string[] = []
    for (const raw of shapes) {
      const spec = obj(raw)
      const stencil = optStr(spec['stencil'])
      if (!stencil) throw new DiagramError('Every shape needs a stencil id such as "flowchart.process". Call diagram_stencils for the list.')
      if (optNum(spec['x']) === undefined || optNum(spec['y']) === undefined) placedAuto++
      const shape = addShape(
        draft,
        index,
        {
          stencil,
          x: optNum(spec['x']),
          y: optNum(spec['y']),
          w: optNum(spec['w']),
          h: optNum(spec['h']),
          rotation: optNum(spec['rotation']),
          text: optStr(spec['text']),
          style: spec['style'] ? (obj(spec['style']) as never) : undefined,
          data: spec['data'] ? obj(spec['data']) : undefined
        },
        measure
      )
      const ref = optStr(spec['ref'])
      if (ref) {
        if (r.map.has(ref)) throw new DiagramError(`The ref "${ref}" is used twice in this call.`)
        r.map.set(ref, shape.id)
      }
      added.push(shape.id)
    }
    const conns: string[] = []
    for (const raw of connectors) {
      const spec = obj(raw)
      const y = optNum(spec['y'])
      const c = addConnector(
        draft,
        index,
        {
          from: endFrom(spec, 'from', r, page, y),
          to: endFrom(spec, 'to', r, page, y),
          routing: optStr(spec['routing']) as never,
          preset: optStr(spec['preset']),
          label: optStr(spec['label']),
          startLabel: optStr(spec['startLabel']),
          endLabel: optStr(spec['endLabel']),
          style: spec['style'] ? (obj(spec['style']) as never) : undefined,
          waypoints: list(spec['waypoints']).map((p) => ({ x: optNum(obj(p)['x']) ?? 0, y: optNum(obj(p)['y']) ?? 0 }))
        },
        measure
      )
      const ref = optStr(spec['ref'])
      if (ref) r.map.set(ref, c.id)
      conns.push(c.id)
    }
    const layout = params['layout'] ? (obj(params['layout']) as LayoutOptions) : null
    if (layout) layoutPage(draft, index, { ...layout, ids: layout.ids ?? (added.length ? undefined : undefined) })
    return { added, conns, refs: Object.fromEntries(r.map), laidOut: !!layout }
  })
  const lines = [`Added ${result.added.length} shape${result.added.length === 1 ? '' : 's'} and ${result.conns.length} connector${result.conns.length === 1 ? '' : 's'} to page "${doc.pages[index].name}".`]
  if (result.added.length) lines.push(`Shape ids: ${result.added.join(', ')}`)
  if (result.conns.length) lines.push(`Connector ids: ${result.conns.join(', ')}`)
  if (Object.keys(result.refs).length) lines.push(`Refs: ${JSON.stringify(result.refs)}`)
  if (placedAuto && !result.laidOut) lines.push(`${placedAuto} shape${placedAuto === 1 ? ' was' : 's were'} placed in free space; call diagram_layout to arrange the diagram.`)
  lines.push('Call diagram_export with format png to look at the result.')
  return { session: { ...s, doc, page: index }, text: lines.join('\n'), change: 'Agent: add', touched: [...result.added, ...result.conns] }
}

function updateMethod(s: DiagramSession, params: Params, measure: Measure): AgentOutcome {
  const index = pageIndexFor(s.doc, s.page, params['page'])
  const shapes = list(params['shapes'])
  const connectors = list(params['connectors'])
  if (!shapes.length && !connectors.length) throw new DiagramError('Give shapes or connectors to update, each with its id.')
  const { doc, result } = edit(s.doc, (draft) => {
    const page = draft.pages[index]
    const r = refs(page)
    const touched: string[] = []
    for (const raw of shapes) {
      const spec = obj(raw)
      const id = optStr(spec['id'])
      if (!id) throw new DiagramError('Every shape update needs an id.')
      updateShape(draft, index, id, shapePatchOf(spec, r), measure)
      touched.push(id)
    }
    for (const raw of connectors) {
      const spec = obj(raw)
      const id = optStr(spec['id'])
      if (!id) throw new DiagramError('Every connector update needs an id.')
      const c = findConnector(page, id)
      const y = optNum(spec['y'])
      const patch: ConnectorPatch = {}
      if (spec['from'] !== undefined || spec['fromPort'] !== undefined || y !== undefined)
        patch.from = endFrom({ ...spec, from: spec['from'] ?? ('shape' in c.from ? c.from.shape : undefined), fromPoint: 'shape' in c.from ? undefined : c.from }, 'from', r, page, y)
      if (spec['to'] !== undefined || spec['toPort'] !== undefined || y !== undefined)
        patch.to = endFrom({ ...spec, to: spec['to'] ?? ('shape' in c.to ? c.to.shape : undefined), toPoint: 'shape' in c.to ? undefined : c.to }, 'to', r, page, y)
      if (typeof spec['routing'] === 'string') patch.routing = spec['routing'] as never
      if (typeof spec['preset'] === 'string') patch.preset = spec['preset']
      if (typeof spec['label'] === 'string') patch.label = spec['label']
      if (spec['startLabel'] !== undefined) patch.startLabel = optStr(spec['startLabel']) ?? ''
      if (spec['endLabel'] !== undefined) patch.endLabel = optStr(spec['endLabel']) ?? ''
      if (spec['style'] !== undefined) patch.style = spec['style'] === null ? null : (obj(spec['style']) as never)
      updateConnector(draft, index, id, patch, measure)
      touched.push(id)
    }
    return touched
  })
  return { session: { ...s, doc, page: index }, text: `Updated ${result.length} item${result.length === 1 ? '' : 's'}: ${result.join(', ')}.`, change: 'Agent: update', touched: result }
}

function deleteMethod(s: DiagramSession, params: Params): AgentOutcome {
  const index = pageIndexFor(s.doc, s.page, params['page'])
  const ids = list(params['ids']).filter((v): v is string => typeof v === 'string')
  if (!ids.length) throw new DiagramError('Give ids: the shapes and connectors to delete.')
  const page = s.doc.pages[index]
  const unknown = ids.filter((id) => !page.shapes.some((x) => x.id === id) && !page.connectors.some((x) => x.id === id))
  if (unknown.length) throw new DiagramError(`Not on page "${page.name}": ${unknown.join(', ')}.`)
  const { doc, result } = edit(s.doc, (draft) => deleteItems(draft, index, ids))
  return {
    session: { ...s, doc, page: index, selection: s.selection.filter((id) => !ids.includes(id)) },
    text: `Deleted ${result.shapes} shape${result.shapes === 1 ? '' : 's'} and ${result.connectors} connector${result.connectors === 1 ? '' : 's'} (connectors glued to a deleted shape go with it).`,
    change: 'Agent: delete'
  }
}

function layoutMethod(s: DiagramSession, params: Params): AgentOutcome {
  const index = pageIndexFor(s.doc, s.page, params['page'])
  const options: LayoutOptions = {
    algorithm: optStr(params['algorithm']) as LayoutOptions['algorithm'],
    direction: optStr(params['direction']) as LayoutOptions['direction'],
    spacing: optNum(params['spacing']),
    rankSpacing: optNum(params['rankSpacing']),
    columns: optNum(params['columns']),
    ids: list(params['ids']).filter((v): v is string => typeof v === 'string')
  }
  if (!options.ids?.length) delete options.ids
  const { doc, result } = edit(s.doc, (draft) => layoutPage(draft, index, options))
  return {
    session: { ...s, doc, page: index },
    text: result ? `Arranged ${result} shapes (${options.algorithm ?? 'layered'}${options.algorithm === 'grid' || options.algorithm === 'circle' ? '' : `, ${options.direction ?? 'TB'}`}). Connectors re-routed.` : 'There was nothing to arrange.',
    change: result ? 'Agent: layout' : null
  }
}

const ARRANGE_ACTIONS = ['align-left', 'align-center', 'align-right', 'align-top', 'align-middle', 'align-bottom', 'distribute-horizontal', 'distribute-vertical', 'front', 'back', 'forward', 'backward', 'group', 'ungroup'] as const

function arrangeMethod(s: DiagramSession, params: Params): AgentOutcome {
  const index = pageIndexFor(s.doc, s.page, params['page'])
  const action = optStr(params['action']) ?? ''
  const ids = list(params['ids']).filter((v): v is string => typeof v === 'string')
  if (!(ARRANGE_ACTIONS as readonly string[]).includes(action)) throw new DiagramError(`action must be one of ${ARRANGE_ACTIONS.join(', ')}.`)
  if (!ids.length) throw new DiagramError('Give ids: the shapes to arrange.')
  for (const id of ids) findShape(s.doc.pages[index], id)
  const { doc, result } = edit(s.doc, (draft): string => {
    if (action.startsWith('align-')) return `Aligned ${alignShapes(draft, index, ids, action.slice(6) as AlignMode)} shapes.`
    if (action.startsWith('distribute-')) return `Distributed ${distributeShapes(draft, index, ids, action.slice(11) as 'horizontal' | 'vertical')} shapes.`
    if (action === 'group') {
      const g = groupShapes(draft, index, ids)
      return g ? `Grouped ${ids.length} shapes as ${g}.` : 'A group needs two or more shapes.'
    }
    if (action === 'ungroup') return `Ungrouped ${ungroupShapes(draft, index, ids)} shapes.`
    reorder(draft, index, ids, action as ZOrderOp)
    return `Moved ${ids.length} shape${ids.length === 1 ? '' : 's'} ${action === 'front' ? 'to the front' : action === 'back' ? 'to the back' : action}.`
  })
  return { session: { ...s, doc, page: index }, text: result, change: `Agent: ${action}`, touched: ids }
}

function pagesMethod(s: DiagramSession, params: Params): AgentOutcome {
  const action = optStr(params['action']) ?? 'list'
  const listText = (doc: DiagramDoc, current: number): string => doc.pages.map((p, i) => `${i + 1}. "${p.name}"${i === current ? ' (current)' : ''}: ${p.shapes.length} shapes, ${p.connectors.length} connectors`).join('\n')
  if (action === 'list') return { session: s, text: listText(s.doc, s.page), change: null }
  if (action === 'select') {
    const index = pageIndexFor(s.doc, s.page, params['page'])
    return { session: { ...s, page: index, selection: [] }, text: `Page ${index + 1} "${s.doc.pages[index].name}" is shown.`, change: null }
  }
  if (action === 'add') {
    const { doc, result } = edit(s.doc, (draft) => addPage(draft, optStr(params['name'])))
    return { session: { ...s, doc, page: result, selection: [] }, text: `Added page ${result + 1} "${doc.pages[result].name}"; it is now the current page.\n${listText(doc, result)}`, change: 'Agent: add page' }
  }
  const index = pageIndexFor(s.doc, s.page, params['page'])
  if (action === 'rename') {
    const name = optStr(params['name'])
    if (!name) throw new DiagramError('rename needs a name.')
    const { doc } = edit(s.doc, (draft) => renamePage(draft, index, name))
    return { session: { ...s, doc }, text: `Renamed page ${index + 1} to "${name}".`, change: 'Agent: rename page' }
  }
  if (action === 'delete') {
    const { doc } = edit(s.doc, (draft) => deletePage(draft, index))
    const page = Math.min(s.page >= index && s.page > 0 ? s.page - 1 : s.page, doc.pages.length - 1)
    return { session: { ...s, doc, page, selection: [] }, text: `Deleted the page.\n${listText(doc, page)}`, change: 'Agent: delete page' }
  }
  if (action === 'duplicate') {
    const { doc, result } = edit(s.doc, (draft) => duplicatePage(draft, index))
    return { session: { ...s, doc, page: result, selection: [] }, text: `Duplicated the page as ${result + 1} "${doc.pages[result].name}".`, change: 'Agent: duplicate page' }
  }
  throw new DiagramError('action must be list, select, add, rename, delete or duplicate.')
}

function newMethod(params: Params): AgentOutcome {
  const doc = createDoc(optStr(params['title'])?.trim() || 'Drawing1')
  const size = optStr(params['pageSize']) as PageSizeId | undefined
  if (size) {
    if (!PAGE_SIZES[size]) throw new DiagramError(`pageSize must be one of ${Object.keys(PAGE_SIZES).join(', ')}.`)
    doc.pages[0].width = PAGE_SIZES[size].width
    doc.pages[0].height = PAGE_SIZES[size].height
  }
  if (optStr(params['pageName'])) doc.pages[0].name = optStr(params['pageName'])!
  return { session: { doc, page: 0, selection: [] }, text: `Started a new diagram "${doc.title}" with one empty page. Add shapes with diagram_add.`, change: 'Agent: new diagram' }
}

/**
 * The shape or connector a `show` points at, on any page: its 1-based page and its words for the operator
 * ("the shape 'Start' (s1)"). Null when the diagram has no item with that id.
 */
export function findShowItem(doc: DiagramDoc, id: string): { page: number; label: string } | null {
  for (const [index, page] of doc.pages.entries()) {
    const shape = page.shapes.find((s) => s.id === id)
    if (shape) return { page: index + 1, label: shape.text?.trim() ? `the shape '${shape.text.trim().replace(/\s+/g, ' ').slice(0, 40)}'` : `the shape ${id}` }
    const connector = page.connectors.find((c) => c.id === id)
    if (connector) return { page: index + 1, label: connector.label?.trim() ? `the connector '${connector.label.trim().slice(0, 40)}'` : `the connector ${id}` }
  }
  return null
}

function selectMethod(s: DiagramSession, params: Params): AgentOutcome {
  const index = pageIndexFor(s.doc, s.page, params['page'])
  const ids = list(params['ids']).filter((v): v is string => typeof v === 'string')
  const page = s.doc.pages[index]
  const valid = ids.filter((id) => page.shapes.some((x) => x.id === id) || page.connectors.some((x) => x.id === id))
  return { session: { ...s, page: index, selection: valid }, text: valid.length ? `Selected ${valid.join(', ')} for the user.` : 'Cleared the selection.', change: null, touched: valid }
}

function readMethod(s: DiagramSession, params: Params): AgentOutcome {
  const index = pageIndexFor(s.doc, s.page, params['page'])
  const format = optStr(params['format']) ?? 'outline'
  if (format === 'json') return { session: s, text: JSON.stringify(params['allPages'] ? s.doc : { title: s.doc.title, page: s.doc.pages[index] }, null, 1), change: null }
  return { session: s, text: outline(s.doc, index, s.selection), change: null }
}

/** Applies one agent method. Throws DiagramError with a message for the agent. */
export function applyAgentMethod(s: DiagramSession, method: string, params: unknown, measure: Measure): AgentOutcome {
  const p = obj(params)
  switch (method) {
    case 'new':
      return newMethod(p)
    case 'stencils':
      return { session: s, text: stencilCatalogText(optStr(p['category']), optStr(p['query']), p['detail'] === true), change: null }
    case 'add':
      return addMethod(s, p, measure)
    case 'update':
      return updateMethod(s, p, measure)
    case 'delete':
      return deleteMethod(s, p)
    case 'layout':
      return layoutMethod(s, p)
    case 'arrange':
      return arrangeMethod(s, p)
    case 'pages':
      return pagesMethod(s, p)
    case 'select':
      return selectMethod(s, p)
    case 'read':
      return readMethod(s, p)
    case 'export-svg': {
      const index = pageIndexFor(s.doc, s.page, p['page'])
      return { session: s, text: exportSvg(s.doc, index, measure, { area: p['area'] === 'page' ? 'page' : 'content' }).svg, change: null }
    }
    default:
      throw new DiagramError(`Agent Diagrams does not know "${method}".`)
  }
}

/** A short summary of a page for the desktop state the agent sees (AG-UI `state.desktop`). */
export function pageSummary(doc: DiagramDoc, index: number, limit = 60): { shapes: string[]; connectors: string[]; more: number } {
  const page = doc.pages[index]
  const shapes = page.shapes.slice(0, limit).map((s) => `${s.id} ${s.stencil}${s.text ? ` "${s.text.replace(/\s+/g, ' ').slice(0, 40)}"` : ''}`)
  const connectors = page.connectors.slice(0, limit).map((c) => `${c.id} ${endText(c.from)}->${endText(c.to)}${c.label ? ` "${c.label.slice(0, 30)}"` : ''}`)
  return { shapes, connectors, more: Math.max(0, page.shapes.length - limit) + Math.max(0, page.connectors.length - limit) }
}


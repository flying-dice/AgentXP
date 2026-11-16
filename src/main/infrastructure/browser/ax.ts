/**
 * Accessibility tree to agent-readable outline. Pure: it works on the `Accessibility.getFullAXTree` result of each frame
 * (CDP shape) and knows nothing about Electron. The driver fetches the frames, the DOM facts (off-screen boxes, password
 * fields) and the ref table; this file turns them into items, outline lines, plain text lines and search hits.
 */
import type { RefTable } from './refs'

export interface AxValue {
  type?: string
  value?: unknown
}
export interface AxProperty {
  name: string
  value: AxValue
}
export interface AxNode {
  nodeId: string
  ignored?: boolean
  role?: AxValue
  name?: AxValue
  value?: AxValue
  properties?: AxProperty[]
  childIds?: string[]
  parentId?: string
  backendDOMNodeId?: number
  frameId?: string
}

export interface OutlineSource {
  rootFrameId: string
  /** Flat AX nodes per frame id. */
  frames: Map<string, AxNode[]>
  /** `<frameId>:<backendNodeId>` of an iframe element -> frame id of its document. */
  iframeChild: Map<string, string>
  /** True when the node is outside the viewport. */
  offscreen?: (frameId: string, backendNodeId: number) => boolean
  /** True for nodes whose value must never be shown (password fields). */
  redact?: (frameId: string, backendNodeId: number) => boolean
}

export interface OutlineItem {
  depth: number
  frameId: string
  backendNodeId?: number
  role: string
  name: string
  value?: string
  url?: string
  states: string[]
  interactive: boolean
  offscreen: boolean
  /** Index of the nearest emitted ancestor, or -1. */
  parent: number
  /** A note instead of content (an iframe that could not be read). */
  note?: string
}

export const MAX_NAME = 300
export const MAX_VALUE = 200

/** Roles that stay out of the outline; their children are still walked. */
const SKIP_ROLES = new Set(['generic', 'none', 'presentation', 'InlineTextBox', 'LineBreak', 'RootWebArea', 'WebArea', 'GenericContainer', 'Ignored', 'unknown', 'Section', 'Div', 'StaticText'])

/** Roles a user can act on. A node that is editable or focusable and has a name counts too. */
const INTERACTIVE = new Set([
  'button', 'link', 'textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'switch', 'slider', 'spinbutton', 'menuitem',
  'menuitemcheckbox', 'menuitemradio', 'option', 'tab', 'treeitem', 'PopUpButton', 'ComboBoxSelect', 'ComboBoxMenuButton',
  'DisclosureTriangle', 'TextField', 'SearchBox', 'ColorWell', 'listbox'
])

/** Roles whose text forms one line in text mode. */
const BLOCK_ROLES = new Set(['heading', 'paragraph', 'listitem', 'row', 'article', 'blockquote', 'term', 'definition', 'caption', 'figure', 'status', 'alert', 'log', 'menuitem', 'option', 'tab', 'treeitem', 'button', 'link', 'textbox', 'searchbox'])

const clean = (text: string): string => text.replace(/\s+/g, ' ').trim()
const cut = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text)
const str = (v: AxValue | undefined): string => (v?.value === undefined || v.value === null ? '' : String(v.value))

function states(node: AxNode, redacted: boolean, role: string): string[] {
  const out: string[] = []
  const prop = new Map((node.properties ?? []).map((p) => [p.name, p.value?.value]))
  const flag = (name: string, label = name): void => {
    if (prop.get(name) === true) out.push(label)
  }
  const level = prop.get('level')
  if (level !== undefined && role === 'heading') out.push(`level ${String(level)}`)
  flag('disabled')
  flag('focused')
  flag('required')
  flag('readonly')
  flag('multiline')
  if (prop.get('editable') !== undefined && prop.get('editable') !== false) out.push('editable')
  for (const name of ['checked', 'pressed', 'selected', 'expanded', 'invalid'] as const) {
    const v = prop.get(name)
    if (v === undefined || v === false || v === 'false') continue
    out.push(v === true || v === 'true' ? name : `${name}=${String(v)}`)
  }
  if (prop.get('expanded') === false) out.push('collapsed')
  if (redacted) out.push('password')
  return out
}

/** Walks the frames into items in document order. Generic containers fold into their parent. */
export function collectItems(source: OutlineSource): OutlineItem[] {
  const items: OutlineItem[] = []
  const visited = new Set<string>()

  const walkFrame = (frameId: string, depth: number, parent: number, ownedBy?: string): void => {
    const nodes = source.frames.get(frameId)
    if (!nodes || nodes.length === 0) return
    const index = new Map(nodes.map((n) => [n.nodeId, n]))
    const root = nodes.find((n) => !n.parentId || !index.has(n.parentId)) ?? nodes[0]
    walk(frameId, index, root, depth, parent, ownedBy)
  }

  const walk = (frame: string, index: Map<string, AxNode>, node: AxNode, depth: number, parent: number, ownedBy?: string): void => {
    const key = `${frame}/${node.nodeId}`
    if (visited.has(key)) return
    visited.add(key)
    const frameId = node.frameId ?? frame
    const role = str(node.role) || 'unknown'
    const backend = node.backendDOMNodeId
    const redacted = backend !== undefined && source.redact?.(frameId, backend) === true
    const name = cut(clean(str(node.name)), MAX_NAME)
    const props = node.properties ?? []
    const editable = props.some((p) => p.name === 'editable' && p.value?.value !== false)
    const focusable = props.some((p) => p.name === 'focusable' && p.value?.value === true)

    let nextParent = parent
    let nextDepth = depth
    const parentItem = parent >= 0 ? items[parent] : undefined

    const emitStatic = role === 'StaticText' && !node.ignored && name !== ''
    const dup = emitStatic && parentItem !== undefined && parentItem.name !== '' && parentItem.name.includes(name)
    const emit = emitStatic ? !dup : !node.ignored && !SKIP_ROLES.has(role) && (role !== 'generic' || name !== '')

    if (emit) {
      const rawValue = str(node.value)
      const item: OutlineItem = {
        depth,
        frameId,
        backendNodeId: backend,
        role: role === 'StaticText' ? 'text' : role === 'Iframe' ? 'iframe' : role,
        name,
        states: states(node, redacted, role),
        interactive: role !== 'StaticText' && (INTERACTIVE.has(role) || ((editable || (focusable && name !== '')) && role !== 'Iframe' && role !== 'heading')),
        offscreen: backend !== undefined && source.offscreen?.(frameId, backend) === true,
        parent
      }
      if (!redacted && rawValue !== '' && role !== 'StaticText') item.value = cut(clean(rawValue), MAX_VALUE)
      const href = str(props.find((p) => p.name === 'url')?.value)
      if (href && role === 'link') item.url = href
      items.push(item)
      nextParent = items.length - 1
      nextDepth = depth + 1
    }

    if (role === 'Iframe') {
      const own = (node.childIds ?? []).map((id) => index.get(id)).filter((n): n is AxNode => n !== undefined)
      const child = backend !== undefined ? source.iframeChild.get(`${frameId}:${backend}`) : undefined
      if (own.length > 0) for (const c of own) walk(frame, index, c, nextDepth, nextParent, ownedBy)
      else if (child && source.frames.get(child)?.length) walkFrame(child, nextDepth, nextParent)
      else if (emit) items[nextParent].note = 'content could not be read'
      return
    }
    for (const id of node.childIds ?? []) {
      const child = index.get(id)
      if (child) walk(frame, index, child, nextDepth, nextParent, ownedBy)
    }
  }

  walkFrame(source.rootFrameId, 0, -1)
  return items
}

/** `role "name" value="..." (states) -> url [off-screen]`, without the ref. */
export function describeItem(item: OutlineItem): string {
  if (item.role === 'text') return `text "${item.name}"${item.offscreen ? ' [off-screen]' : ''}`
  const parts = [item.role]
  if (item.name) parts.push(`"${item.name}"`)
  if (item.value !== undefined) parts.push(`value="${item.value}"`)
  if (item.states.length) parts.push(`(${item.states.join(', ')})`)
  if (item.url) parts.push(`-> ${item.url}`)
  if (item.note) parts.push(`[${item.note}]`)
  if (item.offscreen) parts.push('[off-screen]')
  return parts.join(' ')
}

export const refOf = (refs: RefTable, item: OutlineItem): number | undefined =>
  item.backendNodeId === undefined ? undefined : refs.ref({ frameId: item.frameId, backendNodeId: item.backendNodeId, role: item.role, name: item.name })

/** The compact outline: one line per node, two spaces of indent per level, `[ref]` on interactive nodes. */
export function outlineLines(items: readonly OutlineItem[], refs: RefTable): string[] {
  return items.map((item) => {
    const ref = item.interactive ? refOf(refs, item) : undefined
    return `${'  '.repeat(item.depth)}${ref !== undefined ? `[${ref}] ` : ''}${describeItem(item)}`
  })
}

function childrenOf(items: readonly OutlineItem[]): number[][] {
  const children: number[][] = items.map(() => [])
  items.forEach((item, i) => {
    if (item.parent >= 0) children[item.parent].push(i)
  })
  return children
}

/** The words of an item and everything below it. */
function textOf(items: readonly OutlineItem[], children: number[][], i: number): string {
  const item = items[i]
  const kids = children[i]
  if (kids.length === 0) {
    const own = item.role === 'textbox' || item.role === 'searchbox' || item.role === 'combobox' ? (item.value ?? '') : item.name
    return own
  }
  const sep = item.role === 'row' ? ' | ' : ' '
  const parts = kids.map((k) => textOf(items, children, k)).filter(Boolean)
  return clean(parts.join(sep) || item.name)
}

/** Text mode: the readable text, one line per block (heading, paragraph, list item, table row...), in document order. */
export function textLines(items: readonly OutlineItem[]): string[] {
  const children = childrenOf(items)
  const out: string[] = []
  const done = new Set<number>()
  const block = (i: number): number => {
    for (let at = i; at >= 0; at = items[at].parent) if (BLOCK_ROLES.has(items[at].role)) return at
    return -1
  }
  const outer = (i: number): number => {
    // The outermost block ancestor, so a paragraph in a list item reads as one line.
    let found = -1
    for (let at = i; at >= 0; at = items[at].parent) if (BLOCK_ROLES.has(items[at].role) && items[at].role !== 'button' && items[at].role !== 'link') found = at
    return found >= 0 ? found : block(i)
  }
  items.forEach((item, i) => {
    const owner = outer(i)
    if (owner >= 0) {
      if (done.has(owner)) return
      done.add(owner)
      const text = textOf(items, children, owner)
      if (text) out.push(items[owner].role === 'heading' ? `${'#'.repeat(Math.min(6, Number(/level (\d)/.exec(items[owner].states.join(' '))?.[1] ?? 2)))} ${text}` : text)
    } else if (children[i].length === 0 && item.role !== 'iframe') {
      const text = textOf(items, children, i)
      if (text) out.push(text)
    }
  })
  return out
}

export interface FindQuery {
  text?: string
  role?: string
  name?: string
}

export interface Found {
  index: number
  context: string
}

/** Items that match a text, or a role (and name). A text hit on plain text names the closest real element around it. */
export function findItems(items: readonly OutlineItem[], query: FindQuery): Found[] {
  const text = query.text?.trim().toLowerCase()
  const role = query.role?.trim().toLowerCase()
  const name = query.name?.trim().toLowerCase()
  if (!text && !role) return []
  const children = childrenOf(items)
  const seen = new Set<number>()
  const hits: Found[] = []
  items.forEach((item, i) => {
    let target = -1
    if (role) {
      if (item.role.toLowerCase() === role && (!name || item.name.toLowerCase().includes(name))) target = i
    } else if (text && (item.name.toLowerCase().includes(text) || (item.value ?? '').toLowerCase().includes(text))) {
      target = i
      if (item.role === 'text') {
        let at = item.parent
        while (at >= 0 && items[at].role === 'text') at = items[at].parent
        if (at >= 0) target = at
      }
    }
    if (target < 0 || seen.has(target) || items[target].backendNodeId === undefined) return
    seen.add(target)
    let owner = target
    for (let at = items[target].parent; at >= 0; at = items[at].parent) {
      if (BLOCK_ROLES.has(items[at].role) && items[at].role !== 'button' && items[at].role !== 'link') {
        owner = at
        break
      }
    }
    const around = cut(textOf(items, children, owner), 160)
    hits.push({ index: target, context: around && around !== items[target].name ? around : '' })
  })
  return hits
}

/** Does the text (case-insensitive) appear in the names or values of the items? */
export const containsText = (items: readonly OutlineItem[], text: string): boolean => {
  const needle = text.toLowerCase()
  return items.some((item) => item.name.toLowerCase().includes(needle) || (item.value ?? '').toLowerCase().includes(needle))
}

export interface SnapshotDocument {
  frameId?: string
  nodes: { backendNodeId: number[] }
  layout: { nodeIndex: number[]; bounds: number[][] }
  scrollOffsetX?: number
  scrollOffsetY?: number
}

/**
 * Backend node ids of the document that lie fully outside the viewport (`DOMSnapshot` bounds are in document
 * coordinates, so the viewport is the box at the scroll offset).
 */
export function offscreenNodes(doc: SnapshotDocument, viewport: { width: number; height: number }): Set<number> {
  const out = new Set<number>()
  const left = doc.scrollOffsetX ?? 0
  const top = doc.scrollOffsetY ?? 0
  doc.layout.nodeIndex.forEach((nodeIndex, i) => {
    const backend = doc.nodes.backendNodeId[nodeIndex]
    const b = doc.layout.bounds[i]
    if (backend === undefined || !b || b.length < 4) return
    const [x, y, w, h] = b
    if (w <= 0 && h <= 0) return
    if (x + w <= left || x >= left + viewport.width || y + h <= top || y >= top + viewport.height) out.add(backend)
  })
  return out
}

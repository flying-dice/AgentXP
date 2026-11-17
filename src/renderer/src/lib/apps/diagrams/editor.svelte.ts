/**
 * The state of one Diagrams window: the document, the page, the selection, the tool, zoom and undo. Every change
 * to the document goes through `commit`, which records one undo step. The canvas, the panes and the agent's
 * requests all drive this class.
 */
import { applyAgentMethod, type AgentOutcome } from './model/agentApi'
import {
  addConnector,
  addPage,
  addShape,
  alignShapes,
  copyItems,
  createDoc,
  deleteItems,
  deletePage,
  distributeShapes,
  duplicatePage,
  edit,
  expandGroups,
  groupShapes,
  moveItems,
  pasteItems,
  renamePage,
  reorder,
  ungroupShapes,
  updateConnector,
  updateShape,
  type AlignMode,
  type Clip,
  type ConnectorInput,
  type ConnectorPatch,
  type ShapeInput,
  type ShapePatch,
  type ZOrderOp
} from './model/document'
import { History } from './model/history'
import { layoutPage, type LayoutOptions } from './model/layout'
import { stencilOf } from './model/stencils'
import { canvasMeasure, type Measure } from './model/text'
import type { DiagramDoc, DiagramPage, Routing } from './model/types'

export type DiagramTool = 'pointer' | 'connector' | 'text'

/** The clipboard is shared by every Diagrams window of the desktop page (copy in one, paste in another). */
let clipboard: Clip | null = null
let pasteCount = 0

export const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4] as const

export class DiagramEditor {
  /** Immutable: every change makes a new document (see `edit`), so it is raw state (no deep proxy). */
  doc = $state.raw<DiagramDoc>(createDoc())
  pageIndex = $state(0)
  selection = $state<string[]>([])
  tool = $state<DiagramTool>('pointer')
  /** The routing new connectors get (the toolbar's connector style). */
  routing = $state<Routing>('orthogonal')
  zoom = $state(1)
  showGrid = $state(true)
  showRulers = $state(true)
  snapToGrid = $state(true)
  dirty = $state(false)
  /** The saved file (a VPath), or null for a new drawing. */
  path = $state<string | null>(null)
  /** Items the agent touched a moment ago: the canvas flashes them. */
  flash = $state<string[]>([])
  /** Bumped by every change, so derived views recompute. */
  version = $state(0)
  /** Undo/redo labels for the menus (History is not reactive itself). */
  undoLabel = $state<string | null>(null)
  redoLabel = $state<string | null>(null)

  readonly measure: Measure
  private readonly history = new History()
  private flashTimer: ReturnType<typeof setTimeout> | undefined

  constructor(measure: Measure = canvasMeasure()) {
    this.measure = measure
  }

  get page(): DiagramPage {
    return this.doc.pages[this.pageIndex] ?? this.doc.pages[0]
  }

  get selectedShapes() {
    const set = new Set(this.selection)
    return this.page.shapes.filter((s) => set.has(s.id))
  }

  get selectedConnectors() {
    const set = new Set(this.selection)
    return this.page.connectors.filter((c) => set.has(c.id))
  }

  private syncLabels(): void {
    this.undoLabel = this.history.undoLabel
    this.redoLabel = this.history.redoLabel
  }

  /** Replaces the document as one undo step. */
  replace(doc: DiagramDoc, label: string): void {
    this.history.push(this.doc, label)
    this.doc = doc
    this.dirty = true
    this.version++
    this.pageIndex = Math.min(this.pageIndex, doc.pages.length - 1)
    this.pruneSelection()
    this.syncLabels()
  }

  /** Changes the document with `fn` on a draft, as one undo step. */
  commit<T>(label: string, fn: (draft: DiagramDoc) => T): T {
    const { doc, result } = edit(this.doc, fn)
    this.replace(doc, label)
    return result
  }

  /** A new document with no undo history (New, Open). */
  load(doc: DiagramDoc, path: string | null): void {
    this.doc = doc
    this.path = path
    this.pageIndex = 0
    this.selection = []
    this.dirty = false
    this.history.clear()
    this.syncLabels()
    this.version++
  }

  undo(): void {
    const doc = this.history.undo(this.doc)
    if (!doc) return
    this.doc = doc
    this.afterHistory()
  }

  redo(): void {
    const doc = this.history.redo(this.doc)
    if (!doc) return
    this.doc = doc
    this.afterHistory()
  }

  private afterHistory(): void {
    this.dirty = true
    this.pageIndex = Math.min(this.pageIndex, this.doc.pages.length - 1)
    this.pruneSelection()
    this.syncLabels()
    this.version++
  }

  private pruneSelection(): void {
    const page = this.page
    this.selection = this.selection.filter((id) => page.shapes.some((s) => s.id === id) || page.connectors.some((c) => c.id === id))
  }

  // ---- selection

  select(ids: string[], additive = false): void {
    const expanded = expandGroups(this.page, ids)
    if (!additive) {
      this.selection = expanded
      return
    }
    const set = new Set(this.selection)
    const allIn = expanded.every((id) => set.has(id))
    for (const id of expanded) {
      if (allIn) set.delete(id)
      else set.add(id)
    }
    this.selection = [...set]
  }

  selectAll(): void {
    this.selection = [...this.page.shapes.map((s) => s.id), ...this.page.connectors.map((c) => c.id)]
  }

  clearSelection(): void {
    this.selection = []
  }

  setPage(index: number): void {
    if (index < 0 || index >= this.doc.pages.length || index === this.pageIndex) return
    this.pageIndex = index
    this.selection = []
    this.version++
  }

  // ---- edits

  addShape(input: ShapeInput, select = true): string {
    const id = this.commit(`Add ${stencilOf(input.stencil).name.toLowerCase()}`, (d) => addShape(d, this.pageIndex, input, this.measure).id)
    if (select) this.selection = [id]
    return id
  }

  addConnector(input: ConnectorInput): string {
    const id = this.commit('Add connector', (d) => addConnector(d, this.pageIndex, { routing: this.routing, ...input }, this.measure).id)
    this.selection = [id]
    return id
  }

  updateShapes(ids: string[], patch: ShapePatch | ((id: string) => ShapePatch), label = 'Format'): void {
    if (!ids.length) return
    this.commit(label, (d) => {
      for (const id of ids) updateShape(d, this.pageIndex, id, typeof patch === 'function' ? patch(id) : patch, this.measure)
    })
  }

  updateConnectors(ids: string[], patch: ConnectorPatch, label = 'Format'): void {
    if (!ids.length) return
    this.commit(label, (d) => {
      for (const id of ids) updateConnector(d, this.pageIndex, id, patch, this.measure)
    })
  }

  /** Applies a style to whatever is selected: shapes get shape keys, connectors connector keys. */
  styleSelection(style: Record<string, unknown>, label = 'Format'): void {
    const shapes = this.selectedShapes.map((s) => s.id)
    const conns = this.selectedConnectors.map((c) => c.id)
    if (!shapes.length && !conns.length) return
    this.commit(label, (d) => {
      for (const id of shapes) updateShape(d, this.pageIndex, id, { style: style as never }, this.measure)
      for (const id of conns) updateConnector(d, this.pageIndex, id, { style: style as never }, this.measure)
    })
  }

  move(ids: string[], dx: number, dy: number, label = 'Move'): void {
    if (!ids.length || (dx === 0 && dy === 0)) return
    this.commit(label, (d) => moveItems(d, this.pageIndex, ids, dx, dy))
  }

  deleteSelection(): void {
    if (!this.selection.length) return
    const ids = this.selection
    this.commit('Delete', (d) => deleteItems(d, this.pageIndex, ids))
    this.selection = []
  }

  copy(): boolean {
    if (!this.selection.length) return false
    clipboard = copyItems(this.page, this.selection)
    pasteCount = 0
    return true
  }

  cut(): void {
    if (this.copy()) this.deleteSelection()
  }

  get canPaste(): boolean {
    void this.version
    return clipboard !== null && (clipboard.shapes.length > 0 || clipboard.connectors.length > 0)
  }

  paste(): void {
    if (!clipboard) return
    pasteCount++
    const clip = clipboard
    const ids = this.commit('Paste', (d) => pasteItems(d, this.pageIndex, clip, 20 * pasteCount, 20 * pasteCount))
    this.selection = ids
  }

  duplicate(): void {
    if (!this.selection.length) return
    const clip = copyItems(this.page, this.selection)
    const ids = this.commit('Duplicate', (d) => pasteItems(d, this.pageIndex, clip, 20, 20))
    this.selection = ids
  }

  align(mode: AlignMode): void {
    const ids = this.selectedShapes.map((s) => s.id)
    if (ids.length > 1) this.commit('Align shapes', (d) => alignShapes(d, this.pageIndex, ids, mode))
  }

  distribute(axis: 'horizontal' | 'vertical'): void {
    const ids = this.selectedShapes.map((s) => s.id)
    if (ids.length > 2) this.commit('Distribute shapes', (d) => distributeShapes(d, this.pageIndex, ids, axis))
  }

  order(op: ZOrderOp): void {
    const ids = this.selectedShapes.map((s) => s.id)
    if (ids.length) this.commit(op === 'front' ? 'Bring to front' : op === 'back' ? 'Send to back' : op === 'forward' ? 'Bring forward' : 'Send backward', (d) => reorder(d, this.pageIndex, ids, op))
  }

  group(): void {
    const ids = this.selectedShapes.map((s) => s.id)
    if (ids.length > 1) this.commit('Group', (d) => groupShapes(d, this.pageIndex, ids))
  }

  ungroup(): void {
    const ids = this.selectedShapes.filter((s) => s.groupId).map((s) => s.id)
    if (ids.length) this.commit('Ungroup', (d) => ungroupShapes(d, this.pageIndex, ids))
  }

  rotateSelection(by: number): void {
    const shapes = this.selectedShapes
    if (shapes.length) this.updateShapes(shapes.map((s) => s.id), (id) => ({ rotation: (shapes.find((s) => s.id === id)?.rotation ?? 0) + by }), 'Rotate')
  }

  layout(options: LayoutOptions): void {
    const ids = this.selectedShapes.length > 1 ? this.selectedShapes.map((s) => s.id) : undefined
    this.commit('Lay out shapes', (d) => layoutPage(d, this.pageIndex, { ...options, ids }))
  }

  // ---- pages

  addPage(): void {
    const index = this.commit('Insert page', (d) => addPage(d, undefined, this.pageIndex))
    this.pageIndex = index
    this.selection = []
  }

  deletePage(index = this.pageIndex): void {
    if (this.doc.pages.length <= 1) return
    this.commit('Delete page', (d) => deletePage(d, index))
    this.pageIndex = Math.max(0, Math.min(this.pageIndex > index ? this.pageIndex - 1 : this.pageIndex, this.doc.pages.length - 1))
    this.selection = []
  }

  renamePage(index: number, name: string): void {
    if (!name.trim() || name.trim() === this.doc.pages[index]?.name) return
    this.commit('Rename page', (d) => renamePage(d, index, name))
  }

  duplicatePage(index = this.pageIndex): void {
    this.pageIndex = this.commit('Duplicate page', (d) => duplicatePage(d, index))
    this.selection = []
  }

  updatePage(patch: Partial<Pick<DiagramPage, 'width' | 'height' | 'autoSize' | 'background' | 'gridSize' | 'showGrid'>>): void {
    this.commit('Page setup', (d) => Object.assign(d.pages[this.pageIndex], patch))
  }

  setTitle(title: string): void {
    if (title.trim() && title !== this.doc.title) this.commit('Rename drawing', (d) => (d.title = title.trim()))
  }

  // ---- zoom

  zoomBy(direction: 1 | -1): void {
    const next = direction > 0 ? ZOOM_STEPS.find((z) => z > this.zoom + 0.001) : [...ZOOM_STEPS].reverse().find((z) => z < this.zoom - 0.001)
    if (next) this.zoom = next
  }

  setZoom(z: number): void {
    this.zoom = Math.max(0.1, Math.min(4, Math.round(z * 1000) / 1000))
  }

  // ---- the agent

  /** Runs an agent method on the document (one undo step when it changes something). */
  agent(method: string, params: unknown): AgentOutcome {
    const out = applyAgentMethod({ doc: this.doc, page: this.pageIndex, selection: this.selection }, method, params, this.measure)
    if (out.change) this.replace(out.session.doc, out.change)
    if (out.session.page !== this.pageIndex) this.pageIndex = out.session.page
    if (method === 'new') {
      this.path = null
      this.selection = []
    } else if (method === 'select' || method === 'pages') this.selection = out.session.selection
    else this.pruneSelection()
    if (out.touched?.length) this.flashItems(out.touched)
    this.version++
    return out
  }

  flashItems(ids: string[]): void {
    this.flash = ids
    clearTimeout(this.flashTimer)
    this.flashTimer = setTimeout(() => (this.flash = []), 1600)
  }
}

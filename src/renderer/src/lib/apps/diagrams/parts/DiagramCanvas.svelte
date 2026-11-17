<script lang="ts">
  /**
   * The drawing page: rulers, the paper with its grid, the shapes and connectors, and every mouse gesture on them
   * (select, marquee, move with snapping and guides, resize, rotate, connect, re-glue, edit text, pan and zoom).
   */
  import { tick, untrack } from 'svelte'
  import type { DiagramEditor } from '../editor.svelte'
  import { normalizeRect, rotatedBounds } from '../model/geometry'
  import { edit, moveItems, sheetBounds } from '../model/document'
  import { shapePorts, type PortPoint } from '../model/ports'
  import { defsNodes, renderConnector, renderShape, routeContext, shapeTextBox, SHADOW_ID, type ConnectorRender } from '../model/render'
  import { stencilOf } from '../model/stencils'
  import { connectorStyle, shapeStyle } from '../model/render'
  import type { SvgNode } from '../model/svg'
  import type { ConnectorEnd, DiagramConnector, DiagramDoc, DiagramPage, DiagramShape, Point, Rect } from '../model/types'
  import { HANDLES, handleCursor, handlePoint, nearestPort, resizeShape, rotationAt, rotationHandlePoint, selectionBounds, shapeAt, shapesInRect, snapMove, type Guide, type Handle } from '../canvasMath'
  import SvgNodes from './SvgNodes.svelte'
  import Ruler from './Ruler.svelte'

  interface Props {
    editor: DiagramEditor
    /** The pointer position on the page, for the status bar. */
    onpointer?: (p: Point | null) => void
    oncontextmenu?: (event: MouseEvent) => void
  }

  let { editor, onpointer, oncontextmenu }: Props = $props()

  const MARGIN = 120
  const RULER = 18

  let scroller = $state<HTMLDivElement | null>(null)
  let svg = $state<SVGSVGElement | null>(null)
  let scroll = $state({ left: 0, top: 0, width: 0, height: 0 })
  let preview = $state.raw<DiagramDoc | null>(null)
  let hover = $state<string | null>(null)
  let marquee = $state<Rect | null>(null)
  let guides = $state<Guide[]>([])
  let target = $state.raw<{ shape: string | null; port: PortPoint | null } | null>(null)
  let ghost = $state.raw<DiagramConnector | null>(null)
  let pointerAt = $state<Point | null>(null)
  let editing = $state<{ kind: 'shape' | 'connector'; id: string; value: string } | null>(null)
  let textArea = $state<HTMLTextAreaElement | null>(null)
  let spaceDown = $state(false)

  const doc = $derived(preview ?? editor.doc)
  const page = $derived<DiagramPage>(doc.pages[editor.pageIndex] ?? doc.pages[0])
  const sheet = $derived(sheetBounds(editor.page))
  const vb = $derived<Rect>({ x: sheet.x - MARGIN, y: sheet.y - MARGIN, w: sheet.w + MARGIN * 2, h: sheet.h + MARGIN * 2 })
  const zoom = $derived(editor.zoom)
  const px = $derived(1 / zoom)
  const selected = $derived(new Set(editor.selection))

  // ---- rendering (shapes cached by content, connectors routed together)

  const cache = new Map<string, { key: string; node: SvgNode; gradient: string | null }>()
  const shapeNodes = $derived.by(() => {
    const out: { id: string; node: SvgNode; gradient: string | null }[] = []
    const hide = editing?.kind === 'shape' ? editing.id : null
    for (const s of page.shapes) {
      const key = JSON.stringify(s) + (hide === s.id ? '#edit' : '')
      let hit = cache.get(s.id)
      if (!hit || hit.key !== key) {
        const r = renderShape(s, editor.measure, { hideText: hide === s.id })
        hit = { key, node: r.node, gradient: r.gradient }
        cache.set(s.id, hit)
      }
      out.push({ id: s.id, ...hit })
    }
    return out
  })
  const gradients = $derived(defsNodes(shapeNodes.map((s) => s.gradient).filter((g): g is string => !!g)))
  const connectorRenders = $derived.by(() => {
    const ctx = routeContext(page)
    const out: { c: DiagramConnector; r: ConnectorRender }[] = []
    for (const c of page.connectors) {
      if (editing?.kind === 'connector' && editing.id === c.id) out.push({ c, r: renderConnector(page, { ...c, label: '' }, editor.measure, ctx) })
      else out.push({ c, r: renderConnector(page, c, editor.measure, ctx) })
    }
    return out
  })
  const ghostRender = $derived(ghost ? renderConnector({ ...page, connectors: [ghost] }, ghost, editor.measure) : null)

  const gridPath = $derived.by(() => {
    const g = editor.page.gridSize || 10
    const minor = g * zoom >= 6 ? g : g * Math.ceil(6 / (g * zoom))
    return { minor, major: minor * 5 }
  })

  /** Page breaks of a sheet that grew past one paper size. */
  const breaks = $derived.by(() => {
    const p = editor.page
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
    for (let x = sheet.x + p.width; x < sheet.x + sheet.w - 1; x += p.width) lines.push({ x1: x, y1: sheet.y, x2: x, y2: sheet.y + sheet.h })
    for (let y = sheet.y + p.height; y < sheet.y + sheet.h - 1; y += p.height) lines.push({ x1: sheet.x, y1: y, x2: sheet.x + sheet.w, y2: y })
    return lines
  })

  // ---- coordinates

  function toPage(clientX: number, clientY: number): Point {
    const r = svg!.getBoundingClientRect()
    return { x: (clientX - r.left) / zoom + vb.x, y: (clientY - r.top) / zoom + vb.y }
  }

  /** For drops from the Shapes window: the page point under the mouse, or null when it is not over the page. */
  export function pagePointAt(clientX: number, clientY: number): Point | null {
    if (!scroller || !svg) return null
    const r = scroller.getBoundingClientRect()
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null
    return toPage(clientX, clientY)
  }

  /** The middle of what the window shows, on the page (where a double-clicked stencil lands). */
  export function viewCenter(): Point {
    if (!scroller || !svg) return { x: 200, y: 200 }
    const r = scroller.getBoundingClientRect()
    return toPage(r.left + r.width / 2, r.top + r.height / 2)
  }

  function onscroll(): void {
    if (!scroller) return
    scroll = { left: scroller.scrollLeft, top: scroller.scrollTop, width: scroller.clientWidth, height: scroller.clientHeight }
  }

  /** Zooms so the whole sheet (or only its width) fits the window. */
  export async function fit(mode: 'page' | 'width' = 'page'): Promise<void> {
    if (!scroller) return
    const w = scroller.clientWidth - 24
    const h = scroller.clientHeight - 24
    const z = mode === 'width' ? w / (sheet.w + 40) : Math.min(w / (sheet.w + 40), h / (sheet.h + 40))
    editor.setZoom(z)
    await tick()
    scroller.scrollLeft = (sheet.x - vb.x - 20) * editor.zoom - Math.max(0, (w - (sheet.w + 40) * editor.zoom) / 2)
    scroller.scrollTop = (sheet.y - vb.y - 20) * editor.zoom - (mode === 'page' ? Math.max(0, (h - (sheet.h + 40) * editor.zoom) / 2) : 0)
    onscroll()
  }

  /** Scrolls so the selection (or the top-left of the paper) is in view. */
  export function reveal(rect?: Rect): void {
    if (!scroller) return
    const r = rect ?? { x: sheet.x, y: sheet.y, w: 1, h: 1 }
    const left = (r.x - vb.x - 30) * zoom
    const top = (r.y - vb.y - 30) * zoom
    if (left < scroller.scrollLeft || left + r.w * zoom > scroller.scrollLeft + scroller.clientWidth) scroller.scrollLeft = left
    if (top < scroller.scrollTop || top + r.h * zoom > scroller.scrollTop + scroller.clientHeight) scroller.scrollTop = top
    onscroll()
  }

  let first = true
  $effect(() => {
    if (!scroller || !svg || !first) return
    first = false
    untrack(() => {
      scroller!.scrollLeft = (MARGIN - 24) * zoom
      scroller!.scrollTop = (MARGIN - 24) * zoom
      onscroll()
    })
  })

  // The selection the agent made comes into view.
  $effect(() => {
    const ids = editor.flash
    if (!ids.length) return
    untrack(() => {
      const shapes = editor.page.shapes.filter((s) => ids.includes(s.id))
      const b = selectionBounds(shapes)
      if (b) reveal(b)
    })
  })

  async function zoomAround(next: number, clientX: number, clientY: number): Promise<void> {
    if (!scroller || !svg) return
    const before = toPage(clientX, clientY)
    editor.setZoom(next)
    await tick()
    const r = svg.getBoundingClientRect()
    const nowX = (before.x - vb.x) * editor.zoom + r.left
    const nowY = (before.y - vb.y) * editor.zoom + r.top
    scroller.scrollLeft += nowX - clientX
    scroller.scrollTop += nowY - clientY
    onscroll()
  }

  function onwheel(event: WheelEvent): void {
    if (!event.ctrlKey) return
    event.preventDefault()
    const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15
    void zoomAround(zoom * factor, event.clientX, event.clientY)
  }

  // ---- gestures

  type Drag =
    | { kind: 'move'; start: Point; ids: string[]; moved: boolean; base: Rect | null; clickId: string | null }
    | { kind: 'resize'; id: string; handle: Handle; shape: DiagramShape }
    | { kind: 'rotate'; id: string; shape: DiagramShape }
    | { kind: 'marquee'; start: Point; additive: boolean }
    | { kind: 'connect'; from: ConnectorEnd; start: Point }
    | { kind: 'end'; id: string; which: 'from' | 'to' }
    | { kind: 'pan'; x: number; y: number; left: number; top: number }

  let drag = $state.raw<Drag | null>(null)
  let frame = 0
  let pending: PointerEvent | null = null

  const idFrom = (el: EventTarget | null, attr: string): string | null => ((el as Element | null)?.closest?.(`[${attr}]`)?.getAttribute(attr) ?? null)

  function commitEditing(): void {
    const e = editing
    if (!e) return
    editing = null
    if (e.kind === 'shape') {
      const s = editor.page.shapes.find((x) => x.id === e.id)
      if (s && s.text !== e.value) editor.updateShapes([e.id], { text: e.value }, 'Edit text')
    } else {
      const c = editor.page.connectors.find((x) => x.id === e.id)
      if (c && c.label !== e.value) editor.updateConnectors([e.id], { label: e.value }, 'Edit text')
    }
  }

  /** Starts typing in a shape or a connector label (F2, a double-click, or typing on a selected shape). */
  export function startEditing(id?: string, initial?: string): void {
    const target = id ?? (editor.selection.length === 1 ? editor.selection[0] : null)
    if (!target) return
    const shape = editor.page.shapes.find((s) => s.id === target)
    if (shape) {
      if (shape.locked) return
      editing = { kind: 'shape', id: shape.id, value: initial ?? shape.text }
    } else {
      const c = editor.page.connectors.find((x) => x.id === target)
      if (!c) return
      editing = { kind: 'connector', id: c.id, value: initial ?? c.label }
    }
    editor.selection = [target]
    void tick().then(() => {
      textArea?.focus()
      if (initial === undefined) textArea?.select()
      else textArea?.setSelectionRange(textArea.value.length, textArea.value.length)
    })
  }

  export const isEditing = (): boolean => editing !== null

  /** Where the text box of the item being edited is, in page units, with its rotation. */
  const editBox = $derived.by(() => {
    if (!editing) return null
    if (editing.kind === 'shape') {
      const s = page.shapes.find((x) => x.id === editing!.id)
      if (!s) return null
      const box = shapeTextBox(s) ?? { x: 0, y: 0, w: s.w, h: Math.min(s.h, 30) }
      const st = shapeStyle(s)
      return { x: s.x + box.x, y: s.y + box.y, w: Math.max(40, box.w), h: Math.max(st.fontSize * 1.6, box.h), rotation: s.rotation, origin: { x: s.w / 2 - box.x, y: s.h / 2 - box.y }, font: st.fontSize, family: st.fontFamily, align: st.textAlign, bold: st.bold, italic: st.italic }
    }
    const cr = connectorRenders.find((r) => r.c.id === editing!.id)
    if (!cr) return null
    const st = connectorStyle(cr.c)
    return { x: cr.r.labelAt.x - 70, y: cr.r.labelAt.y - 14, w: 140, h: 28, rotation: 0, origin: { x: 70, y: 14 }, font: st.fontSize, family: st.fontFamily, align: 'center' as const, bold: false, italic: false }
  })

  function endTarget(p: Point, exclude: Set<string>): { shape: string | null; port: PortPoint | null; end: ConnectorEnd } {
    const s = shapeAt(page, p, exclude)
    if (!s) return { shape: null, port: null, end: { x: Math.round(p.x), y: Math.round(p.y) } }
    const port = nearestPort(s, p, 10 * px)
    return { shape: s.id, port, end: port ? { shape: s.id, port: port.id } : { shape: s.id } }
  }

  function onpointerdown(event: PointerEvent): void {
    if (editing) commitEditing()
    scroller?.focus({ preventScroll: true })
    const p = toPage(event.clientX, event.clientY)
    if (event.button === 1 || (event.button === 0 && spaceDown)) {
      event.preventDefault()
      drag = { kind: 'pan', x: event.clientX, y: event.clientY, left: scroller!.scrollLeft, top: scroller!.scrollTop }
      capture(event)
      return
    }
    if (event.button === 2) {
      const id = idFrom(event.target, 'data-shape-id') ?? idFrom(event.target, 'data-connector-id')
      if (id && !selected.has(id)) editor.select([id])
      if (!id) editor.clearSelection()
      return
    }
    if (event.button !== 0) return
    const handle = (event.target as Element).closest('[data-handle]')?.getAttribute('data-handle')
    const owner = idFrom(event.target, 'data-handle-for')
    if (handle && owner) {
      const shape = editor.page.shapes.find((s) => s.id === owner)
      if (handle === 'rotate' && shape) drag = { kind: 'rotate', id: owner, shape: shape }
      else if ((handle === 'from' || handle === 'to') && !shape) drag = { kind: 'end', id: owner, which: handle }
      else if (shape) drag = { kind: 'resize', id: owner, handle: handle as Handle, shape: shape }
      capture(event)
      return
    }
    const portOf = idFrom(event.target, 'data-port-for')
    if (portOf) {
      const port = (event.target as Element).closest('[data-port]')!.getAttribute('data-port')!
      drag = { kind: 'connect', from: { shape: portOf, port }, start: p }
      capture(event)
      return
    }
    const shapeId = idFrom(event.target, 'data-shape-id')
    const connId = idFrom(event.target, 'data-connector-id')
    const additive = event.shiftKey || event.ctrlKey
    if (editor.tool === 'connector' && shapeId) {
      drag = { kind: 'connect', from: { shape: shapeId }, start: p }
      capture(event)
      return
    }
    if (editor.tool === 'text' && !shapeId && !connId) {
      const id = editor.addShape({ stencil: 'basic.text', x: Math.round(p.x - 70), y: Math.round(p.y - 15), text: '' })
      editor.tool = 'pointer'
      startEditing(id, '')
      return
    }
    const hit = shapeId ?? connId
    if (hit) {
      const wasSelected = selected.has(hit)
      if (additive) editor.select([hit], true)
      else if (!wasSelected) editor.select([hit])
      const ids = editor.selection.filter((id) => !editor.page.shapes.find((s) => s.id === id)?.locked)
      const base = selectionBounds(editor.selectedShapes)
      drag = { kind: 'move', start: p, ids, moved: false, base, clickId: !additive && wasSelected ? hit : null }
      capture(event)
      return
    }
    if (!additive) editor.clearSelection()
    drag = { kind: 'marquee', start: p, additive }
    capture(event)
  }

  function capture(event: PointerEvent): void {
    try {
      ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    } catch {
      // A synthetic event has no pointer to capture.
    }
  }

  function onpointermove(event: PointerEvent): void {
    const p = toPage(event.clientX, event.clientY)
    pointerAt = p
    onpointer?.(p)
    if (!drag) {
      const id = idFrom(event.target, 'data-shape-id') ?? idFrom(event.target, 'data-port-for') ?? idFrom(event.target, 'data-handle-for')
      hover = id && editor.page.shapes.some((s) => s.id === id) ? id : null
      return
    }
    pending = event
    if (!frame) frame = requestAnimationFrame(flush)
  }

  function flush(): void {
    frame = 0
    const event = pending
    if (!event || !drag) return
    const p = toPage(event.clientX, event.clientY)
    const d = drag
    const base = editor.doc
    const pi = editor.pageIndex
    switch (d.kind) {
      case 'pan':
        scroller!.scrollLeft = d.left - (event.clientX - d.x)
        scroller!.scrollTop = d.top - (event.clientY - d.y)
        return
      case 'move': {
        let dx = p.x - d.start.x
        let dy = p.y - d.start.y
        if (!d.moved && Math.hypot(dx, dy) * zoom < 3) return
        d.moved = true
        if (event.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) dy = 0
          else dx = 0
        }
        guides = []
        if (d.base && !event.altKey) {
          const set = new Set(d.ids)
          const others = editor.page.shapes.filter((s) => !set.has(s.id)).map((s) => rotatedBounds(s, s.rotation))
          const snapped = snapMove(d.base, others, dx, dy, editor.snapToGrid ? editor.page.gridSize : 0, 6 * px)
          dx = snapped.dx
          dy = snapped.dy
          guides = snapped.guides
        }
        preview = edit(base, (draft) => moveItems(draft, pi, d.ids, dx, dy)).doc
        return
      }
      case 'resize': {
        const st = stencilOf(d.shape.stencil)
        const r = resizeShape(d.shape, d.handle, p, event.shiftKey !== !!st.keepAspect, editor.snapToGrid && !event.altKey ? editor.page.gridSize : 0)
        preview = edit(base, (draft) => Object.assign(draft.pages[pi].shapes.find((s) => s.id === d.id)!, r)).doc
        return
      }
      case 'rotate': {
        const rotation = rotationAt(d.shape, p, event.altKey ? 0 : 15)
        preview = edit(base, (draft) => (draft.pages[pi].shapes.find((s) => s.id === d.id)!.rotation = rotation)).doc
        return
      }
      case 'marquee':
        marquee = normalizeRect(d.start, p)
        return
      case 'connect': {
        const exclude = new Set<string>('shape' in d.from ? [d.from.shape] : [])
        const t = endTarget(p, exclude)
        target = { shape: t.shape, port: t.port }
        ghost = { id: 'ghost', from: d.from, to: t.end, routing: editor.routing, label: '', style: {} }
        return
      }
      case 'end': {
        const c = editor.page.connectors.find((x) => x.id === d.id)
        if (!c) return
        const other = d.which === 'from' ? c.to : c.from
        const t = endTarget(p, new Set('shape' in other ? [other.shape] : []))
        target = { shape: t.shape, port: t.port }
        preview = edit(base, (draft) => (draft.pages[pi].connectors.find((x) => x.id === d.id)![d.which] = t.end)).doc
        return
      }
    }
  }

  function onpointerup(event: PointerEvent): void {
    if (frame) {
      cancelAnimationFrame(frame)
      flush()
    }
    const d = drag
    drag = null
    const p = toPage(event.clientX, event.clientY)
    const shown = preview
    preview = null
    guides = []
    if (!d) return
    switch (d.kind) {
      case 'move':
        if (d.moved && shown) editor.replace(shown, 'Move')
        else if (d.clickId) editor.select([d.clickId])
        break
      case 'resize':
      case 'rotate':
        if (shown) editor.replace(shown, d.kind === 'resize' ? 'Resize' : 'Rotate')
        break
      case 'end':
        if (shown) editor.replace(shown, 'Glue connector')
        target = null
        break
      case 'marquee': {
        const r = marquee
        marquee = null
        if (r && (r.w > 2 || r.h > 2)) {
          const ids = shapesInRect(editor.page, r)
          const inside = new Set(ids)
          const conns = editor.page.connectors.filter((c) => [c.from, c.to].every((e) => ('shape' in e ? inside.has(e.shape) : e.x >= r.x && e.y >= r.y && e.x <= r.x + r.w && e.y <= r.y + r.h))).map((c) => c.id)
          editor.select([...ids, ...conns], d.additive)
        }
        break
      }
      case 'connect': {
        const g = ghost
        ghost = null
        target = null
        if (!g) break
        const moved = Math.hypot(p.x - d.start.x, p.y - d.start.y) * zoom > 8
        if (!moved) break
        editor.addConnector({ from: g.from, to: g.to })
        break
      }
    }
  }

  function ondblclick(event: MouseEvent): void {
    const id = idFrom(event.target, 'data-shape-id') ?? idFrom(event.target, 'data-connector-id')
    if (id) startEditing(id)
  }

  function editKey(event: KeyboardEvent): void {
    event.stopPropagation()
    if (event.key === 'Escape') {
      event.preventDefault()
      editing = null
    } else if (event.key === 'Enter' && (event.ctrlKey || (editing?.kind === 'connector' && !event.shiftKey))) {
      event.preventDefault()
      commitEditing()
    }
  }

  // ---- overlays

  const selShapes = $derived(page.shapes.filter((s) => selected.has(s.id)))
  const selConnectors = $derived(connectorRenders.filter((r) => selected.has(r.c.id)))
  const multiBounds = $derived(selShapes.length > 1 ? selectionBounds(selShapes) : null)
  const hoverShape = $derived(hover && !drag ? page.shapes.find((s) => s.id === hover) ?? null : null)
  const portShape = $derived.by(() => {
    if (target?.shape) return page.shapes.find((s) => s.id === target!.shape) ?? null
    if (editor.tool === 'connector' || (hoverShape && !selected.has(hoverShape.id)) || (hoverShape && selShapes.length === 1)) return hoverShape
    return null
  })
  const flashSet = $derived(new Set(editor.flash))

  const cursor = $derived(spaceDown ? 'grab' : editor.tool === 'connector' ? 'crosshair' : editor.tool === 'text' ? 'text' : 'default')

  function onkeydown(event: KeyboardEvent): void {
    if (event.key === ' ' && !editing) {
      spaceDown = true
      event.preventDefault()
    }
  }
  function onkeyup(event: KeyboardEvent): void {
    if (event.key === ' ') spaceDown = false
  }

  const shapeTransform = (s: DiagramShape): string => `rotate(${s.rotation} ${s.x + s.w / 2} ${s.y + s.h / 2})`
</script>

<div class="canvas" class:rulers={editor.showRulers} data-testid="diagrams-canvas">
  {#if editor.showRulers}
    <div class="corner"></div>
    <Ruler orientation="horizontal" origin={vb.x} offset={scroll.left} length={scroll.width} {zoom} mark={pointerAt?.x ?? null} size={RULER} />
    <Ruler orientation="vertical" origin={vb.y} offset={scroll.top} length={scroll.height} {zoom} mark={pointerAt?.y ?? null} size={RULER} />
  {/if}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
  <div class="scroller xp-scroll" bind:this={scroller} {onscroll} {onwheel} tabindex="0" role="region" aria-label="Drawing page" data-testid="diagrams-page" onkeydown={onkeydown} onkeyup={onkeyup} style:cursor>
    <div class="desk" style:width="{vb.w * zoom}px" style:height="{vb.h * zoom}px">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <svg
        bind:this={svg}
        xmlns="http://www.w3.org/2000/svg"
        width={vb.w * zoom}
        height={vb.h * zoom}
        viewBox="{vb.x} {vb.y} {vb.w} {vb.h}"
        data-testid="diagrams-svg"
        data-shapes={page.shapes.length}
        data-connectors={page.connectors.length}
        data-zoom={zoom}
        {onpointerdown}
        {onpointermove}
        {onpointerup}
        onpointercancel={onpointerup}
        onpointerleave={() => {
          pointerAt = null
          onpointer?.(null)
          if (!drag) hover = null
        }}
        {ondblclick}
        oncontextmenu={(e) => {
          e.preventDefault()
          oncontextmenu?.(e)
        }}
      >
        <defs>
          <filter id={SHADOW_ID} x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="3" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity="0.28" /></filter>
          <filter id="a7-paper-shadow" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="3" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.35" /></filter>
          <pattern id="a7-grid-{editor.pageIndex}" width={gridPath.major} height={gridPath.major} patternUnits="userSpaceOnUse" x={sheet.x} y={sheet.y}>
            {#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
              {#if i > 0}
                <line x1={i * gridPath.minor} y1="0" x2={i * gridPath.minor} y2={gridPath.major} stroke="#e4ebf4" stroke-width={px} />
                <line x1="0" y1={i * gridPath.minor} x2={gridPath.major} y2={i * gridPath.minor} stroke="#e4ebf4" stroke-width={px} />
              {/if}
            {/each}
            <path d="M0 0 L{gridPath.major} 0 M0 0 L0 {gridPath.major}" stroke="#cdd8e6" stroke-width={px} fill="none" />
          </pattern>
          <SvgNodes nodes={gradients} />
        </defs>

        <rect x={sheet.x} y={sheet.y} width={sheet.w} height={sheet.h} fill={editor.page.background} filter="url(#a7-paper-shadow)" data-testid="diagrams-paper" />
        {#if editor.showGrid && editor.page.showGrid}
          <rect x={sheet.x} y={sheet.y} width={sheet.w} height={sheet.h} fill="url(#a7-grid-{editor.pageIndex})" pointer-events="none" />
        {/if}
        {#each breaks as b, i (i)}
          <line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke="#9fb0c8" stroke-width={px} stroke-dasharray="{6 * px} {4 * px}" pointer-events="none" />
        {/each}

        <g class="shapes">
          {#each shapeNodes as s (s.id)}
            <g class="shape" data-testid="diagrams-shape" data-shape-id={s.id} data-stencil={page.shapes.find((x) => x.id === s.id)?.stencil}>
              <SvgNodes nodes={[s.node]} />
            </g>
          {/each}
        </g>

        <g class="connectors">
          {#each connectorRenders as { c, r } (c.id)}
            <g class="connector" data-testid="diagrams-connector" data-connector-id={c.id} data-routing={c.routing}>
              <path d={r.route.d} fill="none" stroke="transparent" stroke-width={Math.max(10 * px, 8)} pointer-events="stroke" />
              <SvgNodes nodes={[r.node]} />
            </g>
          {/each}
        </g>

        <g class="overlay">
          {#each page.shapes.filter((s) => flashSet.has(s.id)) as s (s.id)}
            <rect class="flash" x={s.x - 4} y={s.y - 4} width={s.w + 8} height={s.h + 8} transform={shapeTransform(s)} stroke-width={3 * px} rx={3 * px} />
          {/each}
          {#each connectorRenders.filter((r) => flashSet.has(r.c.id)) as { r }, i (i)}
            <path class="flash" d={r.route.d} fill="none" stroke-width={5 * px} />
          {/each}

          {#if hoverShape && !selected.has(hoverShape.id)}
            <rect class="hover" x={hoverShape.x - 2 * px} y={hoverShape.y - 2 * px} width={hoverShape.w + 4 * px} height={hoverShape.h + 4 * px} transform={shapeTransform(hoverShape)} stroke-width={px} />
          {/if}

          {#if target?.shape}
            {@const t = page.shapes.find((s) => s.id === target!.shape)}
            {#if t}
              <rect class="glue" x={t.x - 3 * px} y={t.y - 3 * px} width={t.w + 6 * px} height={t.h + 6 * px} transform={shapeTransform(t)} stroke-width={2 * px} data-testid="diagrams-glue-target" />
            {/if}
          {/if}

          {#if ghostRender}
            <g class="ghost" opacity="0.75"><SvgNodes nodes={[ghostRender.node]} /></g>
          {/if}

          {#if portShape}
            {#each shapePorts(portShape) as port, i (i)}
              {@const on = target?.port?.id === port.id && target?.shape === portShape.id}
              <g class="port" class:on data-port-for={portShape.id} data-port={port.id} data-testid="diagrams-port" transform="translate({port.point.x} {port.point.y})">
                <rect x={-6 * px} y={-6 * px} width={12 * px} height={12 * px} fill="transparent" />
                <path d="M{-3.5 * px} {-3.5 * px} L{3.5 * px} {3.5 * px} M{3.5 * px} {-3.5 * px} L{-3.5 * px} {3.5 * px}" stroke-width={on ? 2.5 * px : 1.5 * px} />
              </g>
            {/each}
          {/if}

          {#if selShapes.length === 1}
            {@const s = selShapes[0]}
            <g data-testid="diagrams-selection" data-selected={s.id}>
              <rect class="sel" x={s.x} y={s.y} width={s.w} height={s.h} transform={shapeTransform(s)} stroke-width={px} stroke-dasharray="{4 * px} {3 * px}" />
              {#if !s.locked}
                {@const rp = rotationHandlePoint(s, 22 * px)}
                {@const top = handlePoint(s, 'n')}
                <line class="sel-line" x1={top.x} y1={top.y} x2={rp.x} y2={rp.y} stroke-width={px} />
                <circle class="rot" cx={rp.x} cy={rp.y} r={4.5 * px} stroke-width={px} data-handle="rotate" data-handle-for={s.id} data-testid="diagrams-handle-rotate" />
                {#each HANDLES as h (h)}
                  {@const hp = handlePoint(s, h)}
                  <rect class="handle" x={hp.x - 3.5 * px} y={hp.y - 3.5 * px} width={7 * px} height={7 * px} stroke-width={px} data-handle={h} data-handle-for={s.id} data-testid="diagrams-handle-{h}" style:cursor={handleCursor(h, s.rotation)} />
                {/each}
              {:else}
                {#each HANDLES as h (h)}
                  {@const hp = handlePoint(s, h)}
                  <path class="locked" d="M{hp.x - 3 * px} {hp.y - 3 * px} L{hp.x + 3 * px} {hp.y + 3 * px} M{hp.x + 3 * px} {hp.y - 3 * px} L{hp.x - 3 * px} {hp.y + 3 * px}" stroke-width={1.5 * px} />
                {/each}
              {/if}
            </g>
          {:else if multiBounds}
            <rect class="sel multi" data-testid="diagrams-selection" x={multiBounds.x - 3 * px} y={multiBounds.y - 3 * px} width={multiBounds.w + 6 * px} height={multiBounds.h + 6 * px} stroke-width={px} stroke-dasharray="{4 * px} {3 * px}" />
            {#each selShapes as s (s.id)}
              <rect class="sel" x={s.x} y={s.y} width={s.w} height={s.h} transform={shapeTransform(s)} stroke-width={px} stroke-dasharray="{2 * px} {2 * px}" />
            {/each}
          {/if}

          {#each selConnectors as { c, r } (c.id)}
            {@const a = r.route.points[0]}
            {@const b = r.route.points[r.route.points.length - 1]}
            <path class="sel-conn" d={r.route.d} fill="none" stroke-width={px} stroke-dasharray="{4 * px} {3 * px}" />
            <rect class="end" class:glued={'shape' in c.from} x={a.x - 4 * px} y={a.y - 4 * px} width={8 * px} height={8 * px} stroke-width={px} data-handle="from" data-handle-for={c.id} data-testid="diagrams-handle-from" />
            <rect class="end" class:glued={'shape' in c.to} x={b.x - 4 * px} y={b.y - 4 * px} width={8 * px} height={8 * px} stroke-width={px} data-handle="to" data-handle-for={c.id} data-testid="diagrams-handle-to" />
          {/each}

          {#each guides as g, i (i)}
            {#if g.axis === 'v'}
              <line class="guide" x1={g.at} y1={g.from} x2={g.at} y2={g.to} stroke-width={px} />
            {:else}
              <line class="guide" x1={g.from} y1={g.at} x2={g.to} y2={g.at} stroke-width={px} />
            {/if}
          {/each}

          {#if marquee}
            <rect class="marquee" data-testid="diagrams-marquee" x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} stroke-width={px} stroke-dasharray="{3 * px} {2 * px}" />
          {/if}
        </g>
      </svg>

      {#if editing && editBox}
        <textarea
          bind:this={textArea}
          bind:value={editing.value}
          class="editor"
          data-testid="diagrams-text-editor"
          aria-label="Shape text"
          style:left="{(editBox.x - vb.x) * zoom}px"
          style:top="{(editBox.y - vb.y) * zoom}px"
          style:width="{editBox.w * zoom}px"
          style:height="{editBox.h * zoom}px"
          style:font-size="{editBox.font * zoom}px"
          style:font-family={editBox.family}
          style:font-weight={editBox.bold ? 'bold' : 'normal'}
          style:font-style={editBox.italic ? 'italic' : 'normal'}
          style:text-align={editBox.align}
          style:transform-origin="{editBox.origin.x * zoom}px {editBox.origin.y * zoom}px"
          style:transform={editBox.rotation ? `rotate(${editBox.rotation}deg)` : undefined}
          onkeydown={editKey}
          onblur={commitEditing}
        ></textarea>
      {/if}
    </div>
  </div>
</div>

<style>
  .canvas {
    position: relative;
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: grid;
    /* minmax(0, …): the rulers and the page must not hold the grid wider than the window when a pane opens. */
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    overflow: hidden;
    background: #808080;
  }
  .canvas.rulers {
    grid-template-columns: 18px minmax(0, 1fr);
    grid-template-rows: 18px minmax(0, 1fr);
  }
  .corner {
    background: var(--xp-face);
    border-right: 1px solid #a0a0a0;
    border-bottom: 1px solid #a0a0a0;
  }
  .scroller {
    position: relative;
    overflow: auto;
    outline: 0;
    background: #9ca8b8;
    grid-column: -2;
    grid-row: -2;
  }
  .scroller:focus-visible {
    box-shadow: inset 0 0 0 1px #316ac5;
  }
  .desk {
    position: relative;
  }
  svg {
    display: block;
    user-select: none;
    touch-action: none;
  }
  .shape {
    cursor: move;
  }
  .connector {
    cursor: pointer;
  }
  .overlay .flash {
    fill: none;
    stroke: #ff9c00;
    opacity: 0.85;
    pointer-events: none;
  }
  .hover {
    fill: none;
    stroke: #316ac5;
    stroke-opacity: 0.6;
    pointer-events: none;
  }
  .glue {
    fill: none;
    stroke: #e02020;
    pointer-events: none;
  }
  .ghost {
    pointer-events: none;
  }
  .port {
    stroke: #1a50b8;
    cursor: crosshair;
  }
  .port.on {
    stroke: #e02020;
  }
  .sel {
    fill: none;
    stroke: #2a8a2a;
    pointer-events: none;
  }
  .sel.multi {
    stroke: #c02ac0;
  }
  .sel-line {
    stroke: #2a8a2a;
  }
  .sel-conn {
    stroke: #2a8a2a;
    pointer-events: none;
  }
  /* Visio-style green handles; a glued connector end is red. */
  .handle,
  .end {
    fill: #3fbf3f;
    stroke: #146014;
  }
  .end.glued {
    fill: #f04a3a;
    stroke: #8a1a10;
  }
  .rot {
    fill: #3fbf3f;
    stroke: #146014;
    cursor: grab;
  }
  .locked {
    stroke: #7a7a7a;
  }
  .guide {
    stroke: #e020e0;
    pointer-events: none;
  }
  .marquee {
    fill: rgba(49, 106, 197, 0.08);
    stroke: #316ac5;
    pointer-events: none;
  }
  .editor {
    position: absolute;
    z-index: 2;
    box-sizing: border-box;
    min-width: 40px;
    padding: 1px 2px;
    border: 1px solid #316ac5;
    background: rgba(255, 255, 255, 0.95);
    color: #000;
    line-height: 1.25;
    resize: none;
    overflow: hidden;
    outline: 0;
  }
</style>

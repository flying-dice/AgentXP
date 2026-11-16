<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import type { PaintTool } from '@shared/desktop'
  import type { AppProps } from '../types'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import type { MenuItemDef } from '../../kit/molecules/MenuItem'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { registerAppRequestHandler } from '../appRequests'
  import { applyOp, fillAt, resizeCanvas } from './paintCanvas'
  import { PALETTE, STROKE_SIZES, boxOf, clampSize, opAnchor, parseColor, parseDrawParams, parseResizeParams, toHex } from './paintOps'

  let { window: win, host, focused }: AppProps<'paint'> = $props()

  const TOOLS: { id: PaintTool; label: string }[] = [
    { id: 'pencil', label: 'Pencil' },
    { id: 'brush', label: 'Brush' },
    { id: 'eraser', label: 'Eraser' },
    { id: 'fill', label: 'Fill with color' },
    { id: 'text', label: 'Text' },
    { id: 'picker', label: 'Color picker' }
  ]
  const SHAPES: { id: PaintTool; label: string }[] = [
    { id: 'line', label: 'Line' },
    { id: 'rect', label: 'Rectangle' },
    { id: 'ellipse', label: 'Oval' }
  ]
  const TIPS = ['Tip: the agent can draw here too.', 'Tip: right mouse button paints with Color 2.', 'Tip: Ctrl+Z undoes the last stroke.']

  // svelte-ignore state_referenced_locally
  let tool = $state<PaintTool>(win.view.tool)
  // svelte-ignore state_referenced_locally
  let color1 = $state(win.view.color)
  let color2 = $state('#ffffff')
  let selecting = $state<1 | 2>(1)
  let size = $state(2)
  // svelte-ignore state_referenced_locally
  let width = $state(win.view.width)
  // svelte-ignore state_referenced_locally
  let height = $state(win.view.height)
  let dirty = $state(false)
  let pointer = $state<{ x: number; y: number } | null>(null)
  let canvas = $state<HTMLCanvasElement | null>(null)
  let agentDrawing = $state(false)
  let ghost = $state<{ x: number; y: number } | null>(null)
  let textBox = $state<{ x: number; y: number; value: string } | null>(null)
  let textInput = $state<HTMLInputElement | null>(null)
  let resizing = $state<{ width: number; height: number } | null>(null)
  let menuOpen = $state(false)
  let menuX = $state(0)
  let menuY = $state(0)
  const tip = TIPS[Math.floor(Math.random() * TIPS.length)]

  const undo: ImageData[] = []
  let ghostTimer: ReturnType<typeof setTimeout> | undefined

  const ctx = (): CanvasRenderingContext2D => canvas!.getContext('2d', { willReadFrequently: true })!

  function blank(): void {
    const c = ctx()
    c.fillStyle = '#ffffff'
    c.fillRect(0, 0, canvas!.width, canvas!.height)
  }

  onMount(() => {
    blank()
  })

  function snapshot(): void {
    undo.push(ctx().getImageData(0, 0, canvas!.width, canvas!.height))
    if (undo.length > 20) undo.shift()
  }

  function undoLast(): void {
    const last = undo.pop()
    if (!last || !canvas) return
    width = canvas.width = last.width
    height = canvas.height = last.height
    ctx().putImageData(last, 0, 0)
  }

  // ---- reporting --------------------------------------------------------------------------------
  $effect(() => {
    const view = { app: 'paint' as const, path: null, width, height, tool, color: color1, dirty }
    untrack(() => host.updateView(win.id, view))
  })

  // ---- agent requests ---------------------------------------------------------------------------
  const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

  async function draw(params: unknown): Promise<unknown> {
    const ops = parseDrawParams(params)
    snapshot()
    agentDrawing = true
    const delay = Math.min(70, Math.floor(3000 / ops.length))
    for (const op of ops) {
      applyOp(ctx(), op, color1)
      const at = opAnchor(op)
      if (at) ghost = { x: at[0], y: at[1] }
      if (delay > 4) await sleep(delay)
    }
    dirty = true
    clearTimeout(ghostTimer)
    ghostTimer = setTimeout(() => {
      agentDrawing = false
      ghost = null
    }, 1300)
    return { ok: true, applied: ops.length, width, height }
  }

  async function handle(method: string, params: unknown): Promise<unknown> {
    if (!canvas) throw new Error('The canvas is not ready')
    switch (method) {
      case 'draw':
        return draw(params)
      case 'read':
        return canvas.toDataURL('image/png')
      case 'clear': {
        snapshot()
        const c = (params as { color?: string } | null)?.color
        applyOp(ctx(), { op: 'clear', color: c ? (parseColor(c) ? c : undefined) : undefined }, color1)
        dirty = false
        return { ok: true }
      }
      case 'resize': {
        const size2 = parseResizeParams(params)
        snapshot()
        resizeCanvas(canvas, size2.width, size2.height)
        width = size2.width
        height = size2.height
        dirty = true
        return { ok: true, ...size2 }
      }
      default:
        throw new Error(`Agent Paint does not know "${method}". Use draw, read, clear or resize.`)
    }
  }

  $effect(() => registerAppRequestHandler(win.id, handle))

  // ---- drawing by hand --------------------------------------------------------------------------
  let drag: { button: 0 | 2; sx: number; sy: number; lx: number; ly: number; base: ImageData | null; color: string } | null = null

  const pos = (event: PointerEvent): { x: number; y: number } => {
    const r = canvas!.getBoundingClientRect()
    return { x: Math.round(event.clientX - r.left), y: Math.round(event.clientY - r.top) }
  }

  function stroke(from: { x: number; y: number }, to: { x: number; y: number }, color: string): void {
    const c = ctx()
    c.save()
    c.strokeStyle = tool === 'eraser' ? color2 : color
    c.lineCap = tool === 'eraser' ? 'square' : 'round'
    c.lineJoin = 'round'
    c.lineWidth = tool === 'pencil' ? 1 : tool === 'brush' ? size * 2.5 : size * 4
    c.globalAlpha = tool === 'brush' ? 0.9 : 1
    c.beginPath()
    c.moveTo(from.x + 0.5, from.y + 0.5)
    c.lineTo(to.x + 0.5, to.y + 0.5)
    c.stroke()
    c.restore()
  }

  function shape(to: { x: number; y: number }): void {
    if (!drag) return
    const c = ctx()
    if (drag.base) c.putImageData(drag.base, 0, 0)
    if (tool === 'line') applyOp(c, { op: 'line', x1: drag.sx, y1: drag.sy, x2: to.x, y2: to.y, color: drag.color, width: size }, drag.color)
    else {
      const b = boxOf(drag.sx, drag.sy, to.x, to.y)
      applyOp(c, { op: tool === 'rect' ? 'rect' : 'ellipse', ...b, color: drag.color, width: size }, drag.color)
    }
  }

  function commitText(): void {
    const t = textBox
    textBox = null
    if (!t || !t.value.trim()) return
    snapshot()
    applyOp(ctx(), { op: 'text', x: t.x, y: t.y, text: t.value, color: color1, size: 12 + size * 2 }, color1)
    dirty = true
  }

  function onpointerdown(event: PointerEvent): void {
    if (event.button !== 0 && event.button !== 2) return
    const p = pos(event)
    const color = event.button === 2 ? color2 : color1
    if (textBox) commitText()
    if (tool === 'picker') {
      const [r, g, b] = ctx().getImageData(p.x, p.y, 1, 1).data
      if (event.button === 2) color2 = toHex(r, g, b)
      else color1 = toHex(r, g, b)
      return
    }
    if (tool === 'text') {
      event.preventDefault()
      textBox = { x: p.x, y: p.y, value: '' }
      queueMicrotask(() => textInput?.focus())
      return
    }
    if (tool === 'fill') {
      snapshot()
      fillAt(ctx(), p.x, p.y, color)
      dirty = true
      return
    }
    canvas!.setPointerCapture(event.pointerId)
    snapshot()
    drag = { button: event.button as 0 | 2, sx: p.x, sy: p.y, lx: p.x, ly: p.y, base: tool === 'line' || tool === 'rect' || tool === 'ellipse' ? ctx().getImageData(0, 0, canvas!.width, canvas!.height) : null, color }
    if (!drag.base) stroke(p, p, color)
    dirty = true
  }

  function onpointermove(event: PointerEvent): void {
    const p = pos(event)
    pointer = p
    if (!drag) return
    if (drag.base) shape(p)
    else {
      stroke({ x: drag.lx, y: drag.ly }, p, drag.color)
      drag.lx = p.x
      drag.ly = p.y
    }
  }

  function onpointerup(): void {
    drag = null
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      undoLast()
    }
  }

  /** Ctrl+N works wherever the focus is inside the focused Paint window (not while typing text on the canvas). */
  function onWindowKey(event: KeyboardEvent): void {
    if (!focused || textBox || !event.ctrlKey || event.altKey || event.shiftKey || event.key.toLowerCase() !== 'n') return
    event.preventDefault()
    void newImage()
  }

  // ---- canvas resize handle ---------------------------------------------------------------------
  function gripDown(event: PointerEvent): void {
    event.preventDefault()
    const el = event.currentTarget as HTMLElement
    el.setPointerCapture(event.pointerId)
    const start = { x: event.clientX, y: event.clientY, w: width, h: height }
    resizing = { width, height }
    const move = (e: PointerEvent): void => {
      resizing = { width: clampSize(start.w + e.clientX - start.x), height: clampSize(start.h + e.clientY - start.y) }
    }
    const up = (): void => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      const next = resizing
      resizing = null
      if (next && canvas && (next.width !== width || next.height !== height)) {
        snapshot()
        resizeCanvas(canvas, next.width, next.height)
        width = next.width
        height = next.height
        dirty = true
      }
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
  }

  // ---- menu -------------------------------------------------------------------------------------
  async function newImage(): Promise<void> {
    if (dirty) {
      const answer = await showMessageBox({ text: 'Do you want to discard the picture?', caption: 'Agent Paint', buttons: 'YesNo', icon: 'warning' })
      if (answer !== 'yes') return
    }
    snapshot()
    blank()
    dirty = false
  }

  async function copyImage(): Promise<void> {
    try {
      const blob = await new Promise<Blob | null>((r) => canvas!.toBlob(r, 'image/png'))
      if (blob) await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    } catch {
      await showMessageBox({ text: 'The picture could not be copied to the clipboard.', caption: 'Agent Paint', buttons: 'OK', icon: 'error' })
    }
  }

  const menu = $derived<MenuItemDef[]>([
    { label: '&New', shortcut: 'Ctrl+N', action: () => void newImage() },
    { label: '&Undo', shortcut: 'Ctrl+Z', disabled: undo.length === 0, action: undoLast },
    { label: '&Copy picture', action: () => void copyImage() },
    { separator: true },
    { id: 'paint-help', testid: 'paint-menu-help', label: '&Help on Paint', shortcut: 'F1', action: () => void host.openApp({ app: 'help', topic: 'paint' }) },
    { label: 'E&xit', action: () => void host.closeWindow(win.id) }
  ])

  function openMenu(event: MouseEvent): void {
    const r = (event.currentTarget as HTMLElement).getBoundingClientRect()
    menuX = r.left
    menuY = r.bottom
    menuOpen = true
  }

  function pickColor(event: MouseEvent, color: string): void {
    if (event.button === 2) color2 = color
    else if (selecting === 2) color2 = color
    else color1 = color
  }
</script>

<svelte:window onkeydown={onWindowKey} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="paint" data-testid="paint-app" role="application" aria-label="Agent Paint" tabindex="-1" {onkeydown}>
  <div class="tabs">
    <button type="button" class="appbtn" data-testid="paint-menu" onclick={openMenu}>Paint</button>
    <span class="tab on">Home</span>
    <span class="tab">View</span>
  </div>
  <div class="ribbon">
    <section class="group" aria-label="Tools">
      <div class="body tools">
        {#each TOOLS as t (t.id)}
          <button type="button" class="rb" data-testid="paint-tool-{t.id}" class:on={tool === t.id} title={t.label} aria-label={t.label} aria-pressed={tool === t.id} onclick={() => (tool = t.id)}>
            <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
              {#if t.id === 'pencil'}<path d="M2 14l.8-3.2L11 2.6l2.4 2.4-8.2 8.2z" fill="#f4c542" stroke="#7a5a10" stroke-linejoin="round" /><path d="M2 14l.8-3.2 2.4 2.4z" fill="#e8c9a0" stroke="#7a5a10" stroke-linejoin="round" /><path d="M11 2.6l2.4 2.4" stroke="#d9534f" stroke-width="2" />
              {:else if t.id === 'brush'}<path d="M13.5 1.5c.8.8-.4 2.4-4.6 6.2L7.4 6.2c3.8-4.2 5.3-5.5 6.1-4.7z" fill="#b97a57" stroke="#6b4423" stroke-linejoin="round" /><path d="M7.4 6.2l1.5 1.5c-.5 2.4-2.4 3.6-4.6 3.8-1 0-1.8.4-2.3 1.2 2.6 1.6 7.4 1 8.3-3.4.2-1 0-2-.9-3z" fill="#3f9bf0" stroke="#1d5fae" stroke-linejoin="round" />
              {:else if t.id === 'eraser'}<path d="M2.5 10.5l6-7 5 4.2-6 7H4.6z" fill="#f2a0b4" stroke="#8a3a50" stroke-linejoin="round" /><path d="M5.7 7l5 4.2" stroke="#8a3a50" /><path d="M4 14.5h9" stroke="#8a8a8a" />
              {:else if t.id === 'fill'}<path d="M3 8.5l5-5.5 5 5-5 5.2z" fill="#e6eef9" stroke="#3a4f6e" stroke-linejoin="round" /><path d="M13.3 10.5c1 1.4 1.3 2.2.5 2.9-.8.5-1.7-.1-1.8-1.1 0-.7.9-1.4 1.3-1.8z" fill="#2f78cf" stroke="#1d5fae" /><path d="M3 8.5h10" stroke="#3a4f6e" />
              {:else if t.id === 'text'}<text x="8" y="13" text-anchor="middle" font-size="14" font-weight="700" font-family="serif" fill="#1d3f7a">A</text>
              {:else}<path d="M13.4 2.6a2 2 0 00-2.8 0l-1.5 1.5-.8-.8-1 1 .8.8-6 6V14h2.9l6-6 .8.8 1-1-.8-.8 1.5-1.5a2 2 0 000-2.9z" fill="#dfe7f1" stroke="#3a4f6e" stroke-linejoin="round" /><path d="M2.7 11.3l2 2" stroke="#3a4f6e" />{/if}
            </svg>
          </button>
        {/each}
      </div>
      <div class="label">Tools</div>
    </section>
    <section class="group" aria-label="Shapes">
      <div class="body shapes">
        {#each SHAPES as s (s.id)}
          <button type="button" class="rb" data-testid="paint-tool-{s.id}" class:on={tool === s.id} title={s.label} aria-label={s.label} aria-pressed={tool === s.id} onclick={() => (tool = s.id)}>
            <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
              {#if s.id === 'line'}<path d="M2.5 13.5l11-11" stroke="#1d3f7a" stroke-width="1.6" />
              {:else if s.id === 'rect'}<rect x="2.5" y="4" width="11" height="8" fill="none" stroke="#1d3f7a" stroke-width="1.6" />
              {:else}<ellipse cx="8" cy="8" rx="5.8" ry="4.2" fill="none" stroke="#1d3f7a" stroke-width="1.6" />{/if}
            </svg>
          </button>
        {/each}
      </div>
      <div class="label">Shapes</div>
    </section>
    <section class="group" aria-label="Size">
      <div class="body sizes">
        {#each STROKE_SIZES as s (s)}
          <button type="button" class="size" data-testid="paint-size-{s}" class:on={size === s} aria-label="Size {s}" aria-pressed={size === s} onclick={() => (size = s)}>
            <span style:height="{s}px"></span>
          </button>
        {/each}
      </div>
      <div class="label">Size</div>
    </section>
    <section class="group colors" aria-label="Colors">
      <div class="body">
        <div class="current">
          <button type="button" class="cur" class:on={selecting === 1} aria-label="Color 1" aria-pressed={selecting === 1} onclick={() => (selecting = 1)}>
            <i style:background={color1}></i><span>Color 1</span>
          </button>
          <button type="button" class="cur" class:on={selecting === 2} aria-label="Color 2" aria-pressed={selecting === 2} onclick={() => (selecting = 2)}>
            <i style:background={color2}></i><span>Color 2</span>
          </button>
        </div>
        <div class="palette" role="group" aria-label="Palette">
          {#each PALETTE as c (c)}
            <button type="button" class="sw" data-testid="paint-swatch" data-color={c} style:background={c} title={c} aria-label={c} onclick={(e) => pickColor(e, c)} oncontextmenu={(e) => (e.preventDefault(), pickColor(new MouseEvent('click', { button: 2 }), c))}></button>
          {/each}
        </div>
      </div>
      <div class="label">Colors</div>
    </section>
  </div>

  <div class="workspace w7-scroll">
    {#if agentDrawing}<div class="pill" data-testid="paint-agent-drawing" role="status">The agent is drawing…</div>{/if}
    <div class="sheet" style:width="{width}px" style:height="{height}px">
      <canvas
        bind:this={canvas}
        {width}
        {height}
        data-testid="paint-canvas"
        class:cross={tool !== 'picker' && tool !== 'text'}
        aria-label="Canvas"
        {onpointerdown}
        {onpointermove}
        {onpointerup}
        onpointercancel={onpointerup}
        onpointerleave={() => (pointer = null)}
        oncontextmenu={(e) => e.preventDefault()}
      ></canvas>
      {#if ghost}
        <div class="ghost" style:left="{ghost.x}px" style:top="{ghost.y}px" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="22" height="22"><path d="M1 1l5.5 13 2-5.5L14 6.5z" fill="#fff" stroke="#000" stroke-linejoin="round" /></svg>
          <span>Agent7</span>
        </div>
      {/if}
      {#if textBox}
        <input
          class="textbox"
          bind:this={textInput}
          bind:value={textBox.value}
          style:left="{textBox.x}px"
          style:top="{textBox.y}px"
          style:color={color1}
          style:font-size="{12 + size * 2}px"
          aria-label="Text"
          onkeydown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter') commitText()
            else if (e.key === 'Escape') textBox = null
          }}
          onblur={commitText}
        />
      {/if}
      {#if resizing}<div class="outline" style:width="{resizing.width}px" style:height="{resizing.height}px"></div>{/if}
      <div class="grip" role="separator" aria-label="Resize canvas" aria-orientation="horizontal" onpointerdown={gripDown}></div>
    </div>
  </div>

  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text={pointer ? `${pointer.x}, ${pointer.y}px` : ''} width={110} />
    <StatusStripLabel text="{resizing?.width ?? width} × {resizing?.height ?? height}px" borders={['left']} width={130} />
    <StatusStripLabel text={agentDrawing ? 'The agent is drawing…' : tip} borders={['left']} spring />
  </StatusStrip>
  <ContextMenuStrip items={menu} bind:open={menuOpen} x={menuX} y={menuY} label="Paint menu" />
</div>

<style>
  .paint {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: #dbe6f4;
    outline: 0;
  }
  .tabs {
    flex: none;
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 24px;
    padding: 0 4px;
    background: linear-gradient(#f7faff, #dfe9f6);
  }
  .appbtn {
    align-self: center;
    height: 19px;
    margin-right: 6px;
    padding: 0 14px;
    border: 1px solid #1e4f8a;
    border-radius: 3px 3px 0 0;
    background: linear-gradient(#5b9be0, #2a6cc0 48%, #1f5cae 50%, #3d86d8);
    color: #fff;
    font: inherit;
    font-weight: 600;
    text-shadow: 0 0 2px rgba(0, 30, 80, 0.6);
    cursor: default;
  }
  .appbtn:hover {
    filter: brightness(1.12);
  }
  .tab {
    padding: 2px 12px 3px;
    border: 1px solid transparent;
    border-bottom: 0;
    color: #1e3287;
  }
  .tab.on {
    border-color: #a5b9d5;
    border-radius: 3px 3px 0 0;
    background: linear-gradient(#fdfeff, #e6eef9);
  }
  .ribbon {
    flex: none;
    display: flex;
    gap: 0;
    height: 92px;
    padding: 3px 4px 0;
    border-top: 1px solid #a5b9d5;
    border-bottom: 1px solid #8ea6c6;
    background: linear-gradient(#fdfeff 0, #e8f0fa 46%, #dce7f5 50%, #e7eff9 100%);
  }
  .group {
    display: flex;
    flex-direction: column;
    padding: 0 6px;
    border-right: 1px solid #b9c9de;
  }
  .group .body {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .label {
    flex: none;
    height: 16px;
    color: #4a5f80;
    text-align: center;
  }
  .tools {
    display: grid !important;
    grid-template-columns: repeat(3, 26px);
    grid-auto-rows: 26px;
    align-content: center;
  }
  .shapes {
    display: grid !important;
    grid-template-columns: repeat(3, 26px);
    align-content: center;
  }
  .rb {
    width: 26px;
    height: 26px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    cursor: default;
  }
  .rb:hover {
    border-color: var(--w7-toolbar-hover-border);
    background: var(--w7-toolbar-hover-face);
  }
  .rb.on {
    border-color: #8fa8cc;
    background: linear-gradient(#cfdff5, #e3ecf9);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
  }
  .sizes {
    flex-direction: column;
    align-items: stretch !important;
    justify-content: center;
    gap: 1px !important;
  }
  .size {
    width: 62px;
    height: 17px;
    padding: 0 6px;
    display: flex;
    align-items: center;
    border: 1px solid transparent;
    border-radius: 2px;
    background: transparent;
    cursor: default;
  }
  .size span {
    flex: 1;
    background: #000;
  }
  .size:hover {
    border-color: var(--w7-toolbar-hover-border);
    background: var(--w7-toolbar-hover-face);
  }
  .size.on {
    border-color: #8fa8cc;
    background: linear-gradient(#cfdff5, #e3ecf9);
  }
  .colors .body {
    gap: 10px;
  }
  .current {
    display: flex;
    gap: 4px;
  }
  .cur {
    width: 52px;
    height: 58px;
    padding: 4px 2px 2px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    font: inherit;
    font-size: 11px;
    cursor: default;
  }
  .cur i {
    width: 30px;
    height: 30px;
    border: 1px solid #5d6c82;
    box-shadow: inset 0 0 0 1px #fff;
  }
  .cur:hover {
    border-color: var(--w7-toolbar-hover-border);
    background: var(--w7-toolbar-hover-face);
  }
  .cur.on {
    border-color: #8fa8cc;
    background: linear-gradient(#cfdff5, #e3ecf9);
  }
  .palette {
    display: grid;
    grid-template-columns: repeat(10, 18px);
    grid-auto-rows: 18px;
    gap: 2px;
  }
  .sw {
    width: 18px;
    height: 18px;
    padding: 0;
    border: 1px solid #6e7f99;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
    cursor: default;
  }
  .sw:hover {
    outline: 2px solid #f0a43c;
    outline-offset: -1px;
  }
  .workspace {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 6px 6px 18px;
    background: #aab8cc;
    background-image: linear-gradient(#a3b2c8, #b4c1d4);
    box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.35);
  }
  .sheet {
    position: relative;
    flex: none;
    box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.45);
  }
  canvas {
    display: block;
    background: #fff;
    touch-action: none;
  }
  canvas.cross {
    cursor: crosshair;
  }
  .grip {
    position: absolute;
    right: -6px;
    bottom: -6px;
    width: 6px;
    height: 6px;
    border: 1px solid #3a4f6e;
    background: #fff;
    cursor: nwse-resize;
  }
  .outline {
    position: absolute;
    left: 0;
    top: 0;
    border: 1px dotted #000;
    pointer-events: none;
  }
  .pill {
    position: sticky;
    top: 0;
    z-index: 3;
    float: right;
    margin: 0 0 -24px;
    padding: 3px 12px 3px 10px;
    border: 1px solid #4a7fb8;
    border-radius: 11px;
    background: linear-gradient(#f4f9ff, #cfe2f8);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
    color: #1e3287;
    animation: pulse 1s ease-in-out infinite alternate;
  }
  @keyframes pulse {
    to {
      box-shadow: 0 0 8px 1px rgba(63, 155, 240, 0.8);
    }
  }
  .ghost {
    position: absolute;
    z-index: 2;
    display: flex;
    align-items: flex-start;
    pointer-events: none;
    transition: left 0.08s linear, top 0.08s linear;
  }
  .ghost span {
    margin: 12px 0 0 -2px;
    padding: 0 5px;
    border: 1px solid #4a7fb8;
    border-radius: 3px;
    background: #e8f2fe;
    font-size: 11px;
    color: #1e3287;
  }
  .textbox {
    position: absolute;
    min-width: 80px;
    padding: 0 2px;
    border: 1px dashed #3a4f6e;
    outline: 0;
    background: transparent;
    font-family: 'Segoe UI', 'Noto Sans', sans-serif;
  }
</style>

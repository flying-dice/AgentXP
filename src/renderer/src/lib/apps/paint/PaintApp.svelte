<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import type { PaintTool } from '@shared/desktop'
  import type { AppProps } from '../types'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import type { MenuDef, MenuItemDef } from '../../kit/molecules/MenuItem'
  import { closeItems, editItems, menuBar } from '../../kit/molecules/standardMenu'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import AppAbout from '../shared/AppAbout.svelte'
  import { AppHelp } from '../shared/AppHelp.svelte'
  import { useAppContext } from '../shared/appContext.svelte'
  import { ContextMenu } from '../shared/ContextMenu.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { registerAppRequestHandler } from '../appRequests'
  import OpenFileDialog from '../shared/OpenFileDialog.svelte'
  import SaveAsDialog from '../shared/SaveAsDialog.svelte'
  import { errorText } from '../shared/listing'
  import { joinVPath, vpathName, vpathParent, type VPath } from '@shared/vfs'
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
  /** The picture file on the desktop's disks, once saved or opened. */
  // svelte-ignore state_referenced_locally
  let path = $state<VPath | null>(win.view.path)
  let picking = $state(false)
  let saveAs = $state<string | null>(null)
  let message = $state('')
  let pointer = $state<{ x: number; y: number } | null>(null)
  let canvas = $state<HTMLCanvasElement | null>(null)
  let agentDrawing = $state(false)
  let ghost = $state<{ x: number; y: number } | null>(null)
  let textBox = $state<{ x: number; y: number; value: string } | null>(null)
  let textInput = $state<HTMLInputElement | null>(null)
  let resizing = $state<{ width: number; height: number } | null>(null)
  // svelte-ignore state_referenced_locally
  const help = new AppHelp(host, 'paint')
  const menuCtx = new ContextMenu()
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
    // A window that showed a saved picture shows it again (closed and reopened, or after a restart).
    if (path) void load(path, { quiet: true })
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

  // A new stroke replaces the "Saved" note with the file name and (modified).
  $effect(() => {
    if (dirty) untrack(() => (message = ''))
  })

  // ---- reporting --------------------------------------------------------------------------------
  $effect(() => {
    const view = { app: 'paint' as const, path, width, height, tool, color: color1, dirty }
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
    if (!focused || textBox || picking || saveAs !== null || !event.ctrlKey || event.altKey || event.shiftKey) return
    const key = event.key.toLowerCase()
    if (key !== 'n' && key !== 'o' && key !== 's') return
    event.preventDefault()
    void (key === 'n' ? newImage() : key === 'o' ? chooseOpen() : save())
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
    path = null
    message = ''
  }

  const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp']
  const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp' }
  const extensionOf = (p: string): string => p.slice(p.lastIndexOf('.') + 1).toLowerCase()

  /** File > Save (Ctrl+S): writes the picture to its file; a new picture asks for a name in Documents first. */
  async function save(): Promise<void> {
    if (path === null) {
      saveAs = 'Picture.png'
      return
    }
    try {
      const type = MIME[extensionOf(path)] ?? 'image/png'
      const blob = await new Promise<Blob | null>((r) => canvas!.toBlob(r, type))
      if (!blob) throw new Error('The canvas is empty.')
      await host.api.vfs.writeBytes(host.state.desktopId, path, new Uint8Array(await blob.arrayBuffer()))
      dirty = false
      message = `Saved ${vpathName(path)}`
    } catch (error) {
      await showMessageBox({ text: `The picture could not be saved. ${errorText(error)}`, caption: 'Agent Paint', buttons: 'OK', icon: 'error' })
    }
  }

  /** A name without a picture extension is saved as PNG, so File > Open lists it. */
  function finishSaveAs(name: string): void {
    saveAs = null
    const file = IMAGE_EXTENSIONS.includes(extensionOf(name)) && name.includes('.') ? name : `${name}.png`
    path = joinVPath(host.state.home, 'Documents', file)
    void save()
  }

  /** Shows a picture file of the desktop on the canvas. */
  async function load(target: VPath, { quiet = false } = {}): Promise<void> {
    try {
      const bytes = await host.api.vfs.readBytes(host.state.desktopId, target)
      const bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type: MIME[extensionOf(target)] ?? 'image/png' }))
      snapshot()
      width = canvas!.width = Math.min(bitmap.width, 4000)
      height = canvas!.height = Math.min(bitmap.height, 4000)
      blank()
      ctx().drawImage(bitmap, 0, 0)
      bitmap.close()
      dirty = false
      path = target
      message = ''
    } catch {
      if (quiet) path = null
      else await showMessageBox({ text: `${vpathName(target)} is not a picture Agent Paint can open.`, caption: 'Agent Paint', buttons: 'OK', icon: 'error' })
    }
  }

  /** File > Open... (Ctrl+O): picks a picture on the desktop's disks. */
  async function chooseOpen(): Promise<void> {
    if (dirty) {
      const answer = await showMessageBox({ text: 'Do you want to discard the picture?', caption: 'Agent Paint', buttons: 'YesNo', icon: 'warning' })
      if (answer !== 'yes') return
    }
    picking = true
  }

  async function copyImage(): Promise<void> {
    try {
      const blob = await new Promise<Blob | null>((r) => canvas!.toBlob(r, 'image/png'))
      if (blob) await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    } catch {
      await showMessageBox({ text: 'The picture could not be copied to the clipboard.', caption: 'Agent Paint', buttons: 'OK', icon: 'error' })
    }
  }

  // The chat pane knows the canvas.
  // svelte-ignore state_referenced_locally
  useAppContext(host, () => win.id, () => ({ canvas: { width, height }, tool, color: color1, unsavedChanges: dirty }))

  const menus = $derived<MenuDef[]>(
    menuBar([
      { label: '&File', items: [{ id: 'new', testid: 'paint-menu-new', label: '&New', shortcut: 'Ctrl+N', action: () => void newImage() }, { id: 'open', testid: 'paint-menu-open', label: '&Open...', shortcut: 'Ctrl+O', action: () => void chooseOpen() }, { id: 'save', testid: 'paint-menu-save', label: '&Save', shortcut: 'Ctrl+S', action: () => void save() }, { id: 'save-as', testid: 'paint-menu-save-as', label: 'Save &as...', action: () => (saveAs = path ? vpathName(path) : 'Picture.png') }, ...closeItems('paint', () => void host.closeWindow(win.id))] },
      { label: '&Edit', items: editItems('paint-menu', { undo: undoLast, copy: () => void copyImage() }, { hasSelection: true }) },
      help.viewMenu(win.id),
      help.menu()
    ])
  )

  /** Undo, Copy picture and New: the same actions as the menu bar. The canvas itself paints with the right button. */
  const contextItems = (): MenuItemDef[] => [
    ...editItems('paint-ctx', { undo: undoLast, copy: () => void copyImage() }, { hasSelection: true, canUndo: undo.length > 0 }),
    { separator: true },
    { id: 'paint-ctx-new', testid: 'paint-ctx-new', label: '&New', shortcut: 'Ctrl+N', action: () => void newImage() }
  ]

  function pickColor(event: MouseEvent, color: string): void {
    if (event.button === 2) color2 = color
    else if (selecting === 2) color2 = color
    else color1 = color
  }
</script>

<svelte:window onkeydown={onWindowKey} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="paint" data-testid="paint-app" role="application" aria-label="Agent Paint" tabindex="-1" onkeydown={(e) => {
    menuCtx.key(e, contextItems)
    onkeydown(e)
  }} oncontextmenu={(e) => menuCtx.show(e, contextItems())}>
  <MenuStrip {menus} aria-label="Paint menu" />
  <div class="toolbox">
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
    </section>
    <section class="group" aria-label="Size">
      <div class="body sizes">
        {#each STROKE_SIZES as s (s)}
          <button type="button" class="size" data-testid="paint-size-{s}" class:on={size === s} aria-label="Size {s}" aria-pressed={size === s} onclick={() => (size = s)}>
            <span style:height="{s}px"></span>
          </button>
        {/each}
      </div>
    </section>
  </div>

  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="workspace xp-scroll" role="region" tabindex="0" aria-label="Drawing area">
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
        oncontextmenu={(e) => (e.preventDefault(), e.stopPropagation())}
      ></canvas>
      {#if ghost}
        <div class="ghost" style:left="{ghost.x}px" style:top="{ghost.y}px" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="22" height="22"><path d="M1 1l5.5 13 2-5.5L14 6.5z" fill="#fff" stroke="#000" stroke-linejoin="round" /></svg>
          <span>AgentXP</span>
        </div>
      {/if}
      {#if textBox}
        <input data-testid="paint-text-input"
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
      <div data-testid="paint-canvas-grip" class="grip" role="separator" aria-label="Resize canvas" aria-orientation="horizontal" onpointerdown={gripDown}></div>
    </div>
  </div>

    <div class="colorbar" role="group" aria-label="Colors">
      <div class="body">
        <div class="current">
          <button data-testid="paint-color-1" type="button" class="cur" class:on={selecting === 1} aria-label="Color 1" aria-pressed={selecting === 1} onclick={() => (selecting = 1)}>
            <i style:background={color1}></i><span>Color 1</span>
          </button>
          <button data-testid="paint-color-2" type="button" class="cur" class:on={selecting === 2} aria-label="Color 2" aria-pressed={selecting === 2} onclick={() => (selecting = 2)}>
            <i style:background={color2}></i><span>Color 2</span>
          </button>
        </div>
        <div class="palette" role="group" aria-label="Palette">
          {#each PALETTE as c (c)}
            <button type="button" class="sw" data-testid="paint-swatch" data-color={c} style:background={c} title={c} aria-label={c} onclick={(e) => pickColor(e, c)} oncontextmenu={(e) => (e.preventDefault(), e.stopPropagation(), pickColor(new MouseEvent('click', { button: 2 }), c))}></button>
          {/each}
        </div>
      </div>
  </div>

  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text={pointer ? `${pointer.x}, ${pointer.y}px` : ''} width={110} />
    <StatusStripLabel text="{resizing?.width ?? width} × {resizing?.height ?? height}px" borders={['left']} width={130} />
    <StatusStripLabel text={agentDrawing ? 'The agent is drawing…' : message || (path ? `${vpathName(path)}${dirty ? ' (modified)' : ''}` : tip)} borders={['left']} spring testid="paint-status" />
  </StatusStrip>
  <ContextMenuStrip items={menuCtx.items} bind:open={menuCtx.open} x={menuCtx.x} y={menuCtx.y} label="Paint" />
  <AppAbout {help} />
  {#if picking}
    <OpenFileDialog
      api={host.api}
      desktopId={host.state.desktopId}
      startPath={path ? (vpathParent(path) ?? '') : (joinVPath(host.state.home, 'Documents') ?? '')}
      extensions={IMAGE_EXTENSIONS}
      onopen={(p) => {
        picking = false
        void load(p)
      }}
      onclose={() => (picking = false)}
    />
  {/if}
  {#if saveAs !== null}
    <SaveAsDialog caption="Agent Paint" name={saveAs} onsave={finishSaveAs} onclose={() => (saveAs = null)} />
  {/if}
</div>

<style>
  /* XP Paint: a toolbox on the left, the drawing area, a colour box at the bottom. */
  .paint {
    position: relative;
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 58px 1fr;
    grid-template-rows: auto 1fr auto auto;
    background: var(--xp-face);
    outline: 0;
  }
  .paint > :global(:first-child) {
    grid-column: 1 / 3;
  }
  .toolbox {
    grid-column: 1;
    grid-row: 2;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px 4px;
    background: var(--xp-face);
  }
  .workspace {
    grid-column: 2;
    grid-row: 2;
  }
  .colorbar {
    grid-column: 1 / 3;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 6px;
    background: var(--xp-face);
    border-top: 1px solid #fff;
  }
  .paint > :global(.xp-statusstrip), .paint > :global([data-xp-statusstrip]) {
    grid-column: 1 / 3;
  }
  .group {
    display: flex;
    flex-direction: column;
  }
  .group .body {
    display: flex;
    gap: 0;
  }
  .tools,
  .shapes {
    display: grid !important;
    grid-template-columns: repeat(2, 24px);
    grid-auto-rows: 24px;
    justify-content: center;
    padding: 2px;
    border: 1px solid;
    border-color: #808080 #fff #fff #808080;
    background: var(--xp-face);
  }
  .rb {
    width: 24px;
    height: 24px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid;
    border-color: #fff #808080 #808080 #fff;
    border-radius: 0;
    background: var(--xp-face);
    cursor: default;
  }
  .rb:hover {
    background: #f4f2e8;
  }
  .rb.on {
    border-color: #808080 #fff #fff #808080;
    background: repeating-conic-gradient(#fff 0 25%, #ece9d8 0 50%) 0 0 / 2px 2px;
  }
  .sizes {
    display: grid !important;
    grid-template-columns: 1fr;
    gap: 2px !important;
    padding: 4px;
    border: 1px solid;
    border-color: #808080 #fff #fff #808080;
    background: #fff;
  }
  .size {
    width: 100%;
    height: 14px;
    padding: 0 3px;
    display: flex;
    align-items: center;
    border: 1px solid transparent;
    background: transparent;
    cursor: default;
  }
  .size span {
    flex: 1;
    background: #000;
  }
  .size.on {
    background: var(--xp-highlight);
  }
  .size.on span {
    background: #fff;
  }
  .colors .body {
    gap: 10px;
  }
  .current {
    position: relative;
    width: 40px;
    height: 36px;
    flex: none;
    border: 1px solid;
    border-color: #808080 #fff #fff #808080;
    background: var(--xp-face);
  }
  .cur {
    position: absolute;
    width: 22px;
    height: 22px;
    padding: 0;
    border: 1px solid;
    border-color: #fff #808080 #808080 #fff;
    background: var(--xp-face);
    cursor: default;
    font-size: 0;
  }
  .cur:first-child {
    left: 4px;
    top: 4px;
    z-index: 2;
  }
  .cur:last-child {
    left: 14px;
    top: 12px;
  }
  .cur i {
    display: block;
    width: 100%;
    height: 100%;
    border: 1px solid #808080;
  }
  .cur span {
    display: none;
  }
  .cur.on {
    outline: 1px dotted #000;
    outline-offset: 1px;
  }
  .palette {
    display: grid;
    grid-template-columns: repeat(10, 16px);
    grid-auto-rows: 16px;
    gap: 0;
  }
  .sw {
    width: 16px;
    height: 16px;
    padding: 0;
    border: 1px solid;
    border-color: #808080 #fff #fff #808080;
    cursor: default;
  }
  .sw:hover {
    outline: 1px dotted #000;
    outline-offset: -3px;
  }
  .workspace {
    position: relative;
    min-height: 0;
    overflow: auto;
    padding: 4px 4px 18px;
    background: #808080;
    border: 1px solid;
    border-color: #808080 #fff #fff #808080;
  }
  .sheet {
    position: relative;
    flex: none;
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
    font-family: Tahoma, 'Noto Sans', sans-serif;
  }
</style>

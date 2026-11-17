<script lang="ts">
  /**
   * Agent Diagrams: a drawing program for flowcharts, UML, ER diagrams, org charts and network maps, laid out like an
   * XP-era office drawing tool (menus, Standard and Formatting toolbars, a Shapes window, the drawing page with
   * rulers and page tabs, a Format task pane and a status bar). The agent draws in the same document through the
   * diagram_* tools (app requests), one undo step per call.
   */
  import { onMount, untrack } from 'svelte'
  import { joinVPath, vpathName, vpathParent } from '@shared/vfs'
  import type { AppProps } from '../types'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import Separator from '../../kit/atoms/Separator.svelte'
  import type { MenuDef, MenuItemDef } from '../../kit/molecules/MenuItem'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ToolStripColorButton from '../../kit/molecules/ToolStripColorButton.svelte'
  import { closeItems, menuBar } from '../../kit/molecules/standardMenu'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import ToolStrip from '../../kit/organisms/ToolStrip.svelte'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { registerAppRequestHandler } from '../appRequests'
  import AppAbout from '../shared/AppAbout.svelte'
  import { AppHelp } from '../shared/AppHelp.svelte'
  import { useAppContext } from '../shared/appContext.svelte'
  import { ContextMenu } from '../shared/ContextMenu.svelte'
  import OpenFileDialog from '../shared/OpenFileDialog.svelte'
  import SaveAsDialog from '../shared/SaveAsDialog.svelte'
  import { DiagramEditor, ZOOM_STEPS } from './editor.svelte'
  import { download, svgToPng } from './exportImage'
  import { describeShape, pageIndexFor, pageSummary } from './model/agentApi'
  import { createDoc, DiagramError, parseDiagram, serializeDiagram, type AlignMode } from './model/document'
  import { exportSvg } from './model/render'
  import { stencilOf } from './model/stencils'
  import { FONT_FAMILIES } from './model/style'
  import { DIAGRAM_EXTENSION as EXT, type DashStyle, type Point, type ShapeStyle } from './model/types'
  import DiagramCanvas from './parts/DiagramCanvas.svelte'
  import FormatPane from './parts/FormatPane.svelte'
  import Glyph from './parts/Glyph.svelte'
  import PageTabs from './parts/PageTabs.svelte'
  import ShapesPane from './parts/ShapesPane.svelte'
  import ToolButton from './parts/ToolButton.svelte'

  let { window: win, host, focused }: AppProps<'diagrams'> = $props()

  const APP = 'Agent Diagrams'
  const DIAGRAM_EXTENSION = `.${EXT}`
  const editor = new DiagramEditor()
  // svelte-ignore state_referenced_locally
  const help = new AppHelp(host, 'diagrams')
  const ctx = new ContextMenu()

  let canvas = $state<ReturnType<typeof DiagramCanvas> | null>(null)
  let tabs = $state<ReturnType<typeof PageTabs> | null>(null)
  let showShapes = $state(true)
  let showFormat = $state(true)
  /** The width of the window body. A narrow window hides the side panes so the drawing page keeps room. */
  let width = $state(0)
  // A pane closes when the window gets narrower than its limit, and opens again when the window gets wider, unless
  // the person closed or opened it in between (only crossing a limit changes a pane).
  let autoHidden = { format: false, shapes: false }
  let lastWidth = Infinity
  $effect(() => {
    const w = width
    if (!w) return
    untrack(() => {
      const crossed = (limit: number): -1 | 0 | 1 => (lastWidth >= limit && w < limit ? -1 : lastWidth < limit && w >= limit ? 1 : 0)
      const f = crossed(900)
      const sh = crossed(640)
      if (f < 0 && showFormat) [showFormat, autoHidden.format] = [false, true]
      if (f > 0 && autoHidden.format) [showFormat, autoHidden.format] = [true, false]
      if (sh < 0 && showShapes) [showShapes, autoHidden.shapes] = [false, true]
      if (sh > 0 && autoHidden.shapes) [showShapes, autoHidden.shapes] = [true, false]
      lastWidth = w
    })
  })
  let pointer = $state<Point | null>(null)
  let agentBusy = $state(false)
  let message = $state('')
  let picking = $state(false)
  let saveAs = $state<{ kind: 'save' | 'svg'; name: string } | null>(null)
  let busyTimer: ReturnType<typeof setTimeout> | undefined
  let messageTimer: ReturnType<typeof setTimeout> | undefined

  const fileName = $derived(editor.path ? vpathName(editor.path) : `${editor.doc.title}${DIAGRAM_EXTENSION}`)
  const sel = $derived(editor.selectedShapes)
  const selConn = $derived(editor.selectedConnectors)
  const hasSelection = $derived(editor.selection.length > 0)
  const first = $derived(sel[0] ?? null)
  const firstStyle = $derived.by(() => {
    if (first) return { ...stencilOf(first.stencil).style, ...first.style } as Partial<ShapeStyle>
    if (selConn[0]) return selConn[0].style as Partial<ShapeStyle>
    return {}
  })

  function say(text: string): void {
    message = text
    clearTimeout(messageTimer)
    messageTimer = setTimeout(() => (message = ''), 4000)
  }

  // ---- files ------------------------------------------------------------------------------------

  async function confirmDiscard(): Promise<boolean> {
    if (!editor.dirty) return true
    const answer = await showMessageBox({ text: `Do you want to save the changes you made to ${fileName}?`, caption: APP, buttons: 'YesNoCancel', icon: 'warning' })
    if (answer === 'cancel') return false
    if (answer === 'yes') return save()
    return true
  }

  async function newDrawing(): Promise<void> {
    if (!(await confirmDiscard())) return
    editor.load(createDoc(nextTitle()), null)
    say('New drawing')
  }

  let counter = 1
  const nextTitle = (): string => `Drawing${++counter}`

  async function openFile(path: string): Promise<void> {
    try {
      const text = await host.api.vfs.readFile(host.state.desktopId, path)
      editor.load(parseDiagram(text), path)
      say(`Opened ${vpathName(path)}`)
      queueMicrotask(() => void canvas?.fit('page'))
    } catch (error) {
      await showMessageBox({ text: `${vpathName(path)} could not be opened.\n\n${error instanceof Error ? error.message : String(error)}`, caption: APP, buttons: 'OK', icon: 'error' })
    }
  }

  const openDialog = (): Promise<void> => confirmDiscard().then((ok) => void (ok && (picking = true)))

  /** Saves to the current file; a new drawing asks for a name first. Resolves true when it was saved. */
  async function save(): Promise<boolean> {
    if (!editor.path) {
      saveAs = { kind: 'save', name: `${editor.doc.title}${DIAGRAM_EXTENSION}` }
      return false
    }
    try {
      await host.api.vfs.writeFile(host.state.desktopId, editor.path, serializeDiagram(editor.doc))
      editor.dirty = false
      say(`Saved ${vpathName(editor.path)}`)
      return true
    } catch (error) {
      await showMessageBox({ text: `The drawing could not be saved.\n\n${error instanceof Error ? error.message : String(error)}`, caption: APP, buttons: 'OK', icon: 'error' })
      return false
    }
  }

  async function finishSaveAs(name: string): Promise<void> {
    const kind = saveAs?.kind
    saveAs = null
    const folder = editor.path ? (vpathParent(editor.path) ?? joinVPath(host.state.home, 'Documents')) : joinVPath(host.state.home, 'Documents')
    if (kind === 'svg') {
      const file = joinVPath(folder ?? host.state.home, name.toLowerCase().endsWith('.svg') ? name : `${name}.svg`)
      if (!file) return
      try {
        await host.api.vfs.writeFile(host.state.desktopId, file, exportSvg(editor.doc, editor.pageIndex, editor.measure).svg)
        say(`Exported ${vpathName(file)}`)
      } catch (error) {
        await showMessageBox({ text: `The picture could not be saved.\n\n${error instanceof Error ? error.message : String(error)}`, caption: APP, buttons: 'OK', icon: 'error' })
      }
      return
    }
    const file = joinVPath(folder ?? host.state.home, name.toLowerCase().endsWith(DIAGRAM_EXTENSION) ? name : `${name}${DIAGRAM_EXTENSION}`)
    if (!file) return
    editor.path = file
    if (editor.doc.title.startsWith('Drawing')) editor.doc = { ...editor.doc, title: name.replace(/\.[^.]+$/, '') }
    await save()
  }

  async function exportPng(): Promise<void> {
    try {
      const out = exportSvg(editor.doc, editor.pageIndex, editor.measure)
      download(await svgToPng(out.svg, out.width, out.height, 2), `${editor.doc.title} - ${editor.page.name}.png`)
      say('The picture is in your Downloads folder.')
    } catch (error) {
      await showMessageBox({ text: error instanceof Error ? error.message : String(error), caption: APP, buttons: 'OK', icon: 'error' })
    }
  }

  // A window opened on a file (from Explorer, or desktop_open_app with a path) loads it.
  onMount(() => {
    const path = win.view.path
    if (path) void openFile(path)
  })

  // ---- what the agent and the shell see ---------------------------------------------------------

  $effect(() => {
    void editor.version
    const view = {
      app: 'diagrams' as const,
      path: editor.path,
      title: editor.doc.title,
      dirty: editor.dirty,
      page: editor.pageIndex,
      pages: editor.doc.pages.map((p) => p.name),
      shapeCount: editor.page.shapes.length,
      connectorCount: editor.page.connectors.length,
      selection: [...editor.selection],
      outline: pageSummary(editor.doc, editor.pageIndex, 40)
    }
    untrack(() => host.updateView(win.id, view))
  })

  // svelte-ignore state_referenced_locally
  useAppContext(host, () => win.id, () => ({
    openFile: editor.path,
    drawing: editor.doc.title,
    page: `${editor.pageIndex + 1} of ${editor.doc.pages.length}: ${editor.page.name}`,
    unsavedChanges: editor.dirty,
    ...(editor.selection.length
      ? { selection: [...editor.selectedShapes.map((s) => describeShape(s)), ...editor.selectedConnectors.map((c) => `${c.id} connector${c.label ? ` "${c.label}"` : ''}`)].join('\n') }
      : {})
  }))

  async function handle(method: string, params: unknown): Promise<unknown> {
    agentBusy = true
    clearTimeout(busyTimer)
    busyTimer = setTimeout(() => (agentBusy = false), 1500)
    const p = (params ?? {}) as Record<string, unknown>
    switch (method) {
      case 'export-png': {
        const index = pageIndexFor(editor.doc, editor.pageIndex, p['page'])
        const out = exportSvg(editor.doc, index, editor.measure, { area: p['area'] === 'page' ? 'page' : 'content' })
        return svgToPng(out.svg, out.width, out.height, 1)
      }
      case 'serialize':
        return { json: serializeDiagram(editor.doc), path: editor.path, title: editor.doc.title }
      case 'saved':
        if (typeof p['path'] === 'string') editor.path = p['path']
        editor.dirty = false
        return { ok: true }
      case 'load': {
        if (typeof p['text'] !== 'string' || typeof p['path'] !== 'string') throw new DiagramError('load needs path and text.')
        editor.load(parseDiagram(p['text']), p['path'])
        queueMicrotask(() => void canvas?.fit('page'))
        return `Opened ${p['path']}.\n\n${editor.agent('read', {}).text}`
      }
      default:
        return editor.agent(method, params).text
    }
  }

  $effect(() => registerAppRequestHandler(win.id, handle))

  // ---- editing helpers --------------------------------------------------------------------------

  const style = (patch: Record<string, unknown>, label = 'Format'): void => {
    if (!hasSelection) return
    editor.styleSelection(patch, label)
  }
  const toggle = (key: 'bold' | 'italic' | 'underline'): void => style({ [key]: !firstStyle[key] })

  function addAt(stencil: string, at: Point): void {
    const st = stencilOf(stencil)
    editor.tool = 'pointer'
    editor.addShape({ stencil, x: Math.round(at.x - st.w / 2), y: Math.round(at.y - st.h / 2) })
  }

  function dropStencil(stencil: string, clientX: number, clientY: number): void {
    const at = canvas?.pagePointAt(clientX, clientY)
    if (at) addAt(stencil, at)
  }

  const align = (mode: AlignMode): void => editor.align(mode)

  // ---- menus ------------------------------------------------------------------------------------

  const zoomItems = (): MenuItemDef[] => [
    ...([4, 2, 1.5, 1, 0.75, 0.5] as const).map((z) => ({ id: `diagrams-zoom-${z * 100}`, testid: `diagrams-menu-zoom-${z * 100}`, label: `${z * 100}%`, radio: true, checked: Math.abs(editor.zoom - z) < 0.001, action: () => editor.setZoom(z) })),
    { separator: true },
    { id: 'diagrams-zoom-page', testid: 'diagrams-menu-zoom-page', label: '&Whole Page', shortcut: 'Ctrl+Shift+W', action: () => void canvas?.fit('page') },
    { id: 'diagrams-zoom-width', testid: 'diagrams-menu-zoom-width', label: 'Page &Width', action: () => void canvas?.fit('width') }
  ]

  const alignItems = (prefix: string): MenuItemDef[] => [
    { id: `${prefix}-align-left`, testid: `${prefix}-align-left`, label: 'Align &Left', disabled: sel.length < 2, action: () => align('left') },
    { id: `${prefix}-align-center`, testid: `${prefix}-align-center`, label: 'Align &Center', disabled: sel.length < 2, action: () => align('center') },
    { id: `${prefix}-align-right`, testid: `${prefix}-align-right`, label: 'Align &Right', disabled: sel.length < 2, action: () => align('right') },
    { separator: true },
    { id: `${prefix}-align-top`, testid: `${prefix}-align-top`, label: 'Align &Top', disabled: sel.length < 2, action: () => align('top') },
    { id: `${prefix}-align-middle`, testid: `${prefix}-align-middle`, label: 'Align &Middle', disabled: sel.length < 2, action: () => align('middle') },
    { id: `${prefix}-align-bottom`, testid: `${prefix}-align-bottom`, label: 'Align &Bottom', disabled: sel.length < 2, action: () => align('bottom') },
    { separator: true },
    { id: `${prefix}-distribute-h`, testid: `${prefix}-distribute-h`, label: 'Distribute &Horizontally', disabled: sel.length < 3, action: () => editor.distribute('horizontal') },
    { id: `${prefix}-distribute-v`, testid: `${prefix}-distribute-v`, label: 'Distribute &Vertically', disabled: sel.length < 3, action: () => editor.distribute('vertical') }
  ]

  const orderItems = (prefix: string): MenuItemDef[] => [
    { id: `${prefix}-front`, testid: `${prefix}-front`, label: 'Bring to &Front', shortcut: 'Ctrl+Shift+F', disabled: !sel.length, action: () => editor.order('front') },
    { id: `${prefix}-forward`, testid: `${prefix}-forward`, label: 'Bring F&orward', disabled: !sel.length, action: () => editor.order('forward') },
    { id: `${prefix}-backward`, testid: `${prefix}-backward`, label: 'Send Back&ward', disabled: !sel.length, action: () => editor.order('backward') },
    { id: `${prefix}-back`, testid: `${prefix}-back`, label: 'Send to &Back', shortcut: 'Ctrl+Shift+B', disabled: !sel.length, action: () => editor.order('back') }
  ]

  const layoutItems = (): MenuItemDef[] => [
    { id: 'diagrams-layout-tb', testid: 'diagrams-menu-layout-tb', label: '&Top to Bottom', action: () => editor.layout({ algorithm: 'layered', direction: 'TB' }) },
    { id: 'diagrams-layout-lr', testid: 'diagrams-menu-layout-lr', label: '&Left to Right', action: () => editor.layout({ algorithm: 'layered', direction: 'LR' }) },
    { id: 'diagrams-layout-grid', testid: 'diagrams-menu-layout-grid', label: '&Grid', action: () => editor.layout({ algorithm: 'grid' }) },
    { id: 'diagrams-layout-circle', testid: 'diagrams-menu-layout-circle', label: '&Circle', action: () => editor.layout({ algorithm: 'circle' }) }
  ]

  const editMenuItems = (prefix: string): MenuItemDef[] => [
    { id: `${prefix}-undo`, testid: `${prefix}-undo`, label: editor.undoLabel ? `&Undo ${editor.undoLabel}` : "&Can't Undo", shortcut: 'Ctrl+Z', icon: 'undo', disabled: !editor.undoLabel, action: () => editor.undo() },
    { id: `${prefix}-redo`, testid: `${prefix}-redo`, label: editor.redoLabel ? `&Redo ${editor.redoLabel}` : "Can't &Redo", shortcut: 'Ctrl+Y', icon: 'redo', disabled: !editor.redoLabel, action: () => editor.redo() },
    { separator: true },
    { id: `${prefix}-cut`, testid: `${prefix}-cut`, label: 'Cu&t', shortcut: 'Ctrl+X', icon: 'cut', disabled: !hasSelection, action: () => editor.cut() },
    { id: `${prefix}-copy`, testid: `${prefix}-copy`, label: '&Copy', shortcut: 'Ctrl+C', icon: 'copy', disabled: !hasSelection, action: () => void editor.copy() },
    { id: `${prefix}-paste`, testid: `${prefix}-paste`, label: '&Paste', shortcut: 'Ctrl+V', icon: 'paste', disabled: !editor.canPaste, action: () => editor.paste() },
    { id: `${prefix}-duplicate`, testid: `${prefix}-duplicate`, label: 'D&uplicate', shortcut: 'Ctrl+D', disabled: !sel.length, action: () => editor.duplicate() },
    { id: `${prefix}-delete`, testid: `${prefix}-delete`, label: 'De&lete', shortcut: 'Del', icon: 'delete', disabled: !hasSelection, action: () => editor.deleteSelection() }
  ]

  const menus = $derived<MenuDef[]>(
    menuBar([
      {
        label: '&File',
        items: [
          { id: 'new', testid: 'diagrams-menu-new', label: '&New', shortcut: 'Ctrl+N', icon: 'new', action: () => void newDrawing() },
          { id: 'open', testid: 'diagrams-menu-open', label: '&Open...', shortcut: 'Ctrl+O', icon: 'open-folder', action: () => void openDialog() },
          { id: 'save', testid: 'diagrams-menu-save', label: '&Save', shortcut: 'Ctrl+S', icon: 'save', action: () => void save() },
          { id: 'save-as', testid: 'diagrams-menu-save-as', label: 'Save &As...', action: () => (saveAs = { kind: 'save', name: fileName }) },
          { separator: true },
          { id: 'export-svg', testid: 'diagrams-menu-export-svg', label: 'Export Page as S&VG...', action: () => (saveAs = { kind: 'svg', name: `${editor.doc.title} - ${editor.page.name}.svg` }) },
          { id: 'export-png', testid: 'diagrams-menu-export-png', label: 'Export Page as P&NG', action: () => void exportPng() },
          { separator: true },
          { id: 'page-setup', testid: 'diagrams-menu-page-setup', label: 'Page Set&up...', action: pageSetup },
          ...closeItems('diagrams', () => void host.closeWindow(win.id), 'E&xit')
        ]
      },
      { label: '&Edit', items: [...editMenuItems('diagrams-menu'), { separator: true }, { id: 'select-all', testid: 'diagrams-menu-select-all', label: 'Select &All', shortcut: 'Ctrl+A', action: () => editor.selectAll() }, { id: 'edit-text', testid: 'diagrams-menu-edit-text', label: 'Edit &Text', shortcut: 'F2', disabled: editor.selection.length !== 1, action: () => canvas?.startEditing() }] },
      {
        label: '&View',
        items: [
          { id: 'zoom', label: '&Zoom', items: zoomItems() },
          { id: 'zoom-in', testid: 'diagrams-menu-zoom-in', label: 'Zoom &In', shortcut: 'Ctrl+=', action: () => editor.zoomBy(1) },
          { id: 'zoom-out', testid: 'diagrams-menu-zoom-out', label: 'Zoom O&ut', shortcut: 'Ctrl+-', action: () => editor.zoomBy(-1) },
          { separator: true },
          { id: 'rulers', testid: 'diagrams-menu-rulers', label: '&Rulers', checked: editor.showRulers, action: () => (editor.showRulers = !editor.showRulers) },
          { id: 'grid', testid: 'diagrams-menu-grid', label: '&Grid', checked: editor.showGrid, action: () => (editor.showGrid = !editor.showGrid) },
          { id: 'snap', testid: 'diagrams-menu-snap', label: '&Snap to Grid', checked: editor.snapToGrid, action: () => (editor.snapToGrid = !editor.snapToGrid) },
          { separator: true },
          { id: 'shapes', testid: 'diagrams-menu-shapes', label: 'S&hapes Window', checked: showShapes, action: () => (showShapes = !showShapes) },
          { id: 'format', testid: 'diagrams-menu-format-pane', label: '&Format Pane', checked: showFormat, action: () => (showFormat = !showFormat) },
          { separator: true },
          help.paneItem(win.id)
        ]
      },
      {
        label: '&Insert',
        items: [
          { id: 'new-page', testid: 'diagrams-menu-new-page', label: 'New &Page', action: () => editor.addPage() },
          { id: 'duplicate-page', testid: 'diagrams-menu-duplicate-page', label: '&Duplicate Page', action: () => editor.duplicatePage() },
          { separator: true },
          { id: 'text-tool', testid: 'diagrams-menu-text-tool', label: '&Text Box', shortcut: 'Ctrl+2', action: () => (editor.tool = 'text') },
          { id: 'connector-tool', testid: 'diagrams-menu-connector-tool', label: '&Connector', shortcut: 'Ctrl+3', action: () => (editor.tool = 'connector') }
        ]
      },
      {
        label: 'F&ormat',
        items: [
          { id: 'bold', testid: 'diagrams-menu-bold', label: '&Bold', shortcut: 'Ctrl+B', checked: !!firstStyle.bold, disabled: !hasSelection, action: () => toggle('bold') },
          { id: 'italic', testid: 'diagrams-menu-italic', label: '&Italic', shortcut: 'Ctrl+I', checked: !!firstStyle.italic, disabled: !hasSelection, action: () => toggle('italic') },
          { id: 'underline', testid: 'diagrams-menu-underline', label: '&Underline', shortcut: 'Ctrl+U', checked: !!firstStyle.underline, disabled: !hasSelection, action: () => toggle('underline') },
          { separator: true },
          { id: 'shadow', testid: 'diagrams-menu-shadow', label: '&Shadow', checked: !!firstStyle.shadow, disabled: !sel.length, action: () => style({ shadow: !firstStyle.shadow }) },
          { id: 'clear-format', testid: 'diagrams-menu-clear-format', label: '&Clear Formatting', disabled: !hasSelection, action: clearFormatting },
          { separator: true },
          { id: 'format-pane', testid: 'diagrams-menu-format', label: '&Format Pane...', action: () => (showFormat = true) }
        ]
      },
      {
        label: '&Shape',
        items: [
          { id: 'rotate-left', testid: 'diagrams-menu-rotate-left', label: 'Rotate &Left', shortcut: 'Ctrl+L', disabled: !sel.length, action: () => editor.rotateSelection(-90) },
          { id: 'rotate-right', testid: 'diagrams-menu-rotate-right', label: 'Rotate &Right', shortcut: 'Ctrl+R', disabled: !sel.length, action: () => editor.rotateSelection(90) },
          { separator: true },
          { id: 'align', label: 'Align and &Distribute', items: alignItems('diagrams-menu') },
          { id: 'order', label: '&Order', items: orderItems('diagrams-menu') },
          { separator: true },
          { id: 'group', testid: 'diagrams-menu-group', label: '&Group', shortcut: 'Ctrl+G', disabled: sel.length < 2, action: () => editor.group() },
          { id: 'ungroup', testid: 'diagrams-menu-ungroup', label: '&Ungroup', shortcut: 'Ctrl+Shift+U', disabled: !sel.some((s) => s.groupId), action: () => editor.ungroup() },
          { separator: true },
          { id: 'layout', label: 'Lay Out &Shapes', items: layoutItems() },
          {
            id: 'routing',
            label: 'Connector &Style',
            items: (['orthogonal', 'straight', 'curved'] as const).map((r) => ({ id: `diagrams-route-${r}`, testid: `diagrams-menu-route-${r}`, label: r === 'orthogonal' ? '&Right Angle' : r === 'straight' ? '&Straight' : '&Curved', radio: true, checked: (selConn[0]?.routing ?? editor.routing) === r, action: () => setRouting(r) }))
          }
        ]
      },
      help.menu()
    ])
  )

  function pageSetup(): void {
    editor.clearSelection()
    showFormat = true
  }

  function clearFormatting(): void {
    const shapes = sel.map((s) => s.id)
    if (shapes.length) editor.updateShapes(shapes, { style: null }, 'Clear formatting')
    const conns = selConn.map((c) => c.id)
    if (conns.length) editor.updateConnectors(conns, { style: null }, 'Clear formatting')
  }

  function setRouting(r: 'orthogonal' | 'straight' | 'curved'): void {
    editor.routing = r
    if (selConn.length) editor.updateConnectors(selConn.map((c) => c.id), { routing: r, waypoints: [] }, 'Connector style')
  }

  /** The right-click menu of the drawing: what fits the selection, else the page. */
  const contextItems = (): MenuItemDef[] => {
    if (!hasSelection)
      return [
        { id: 'diagrams-ctx-paste', testid: 'diagrams-ctx-paste', label: '&Paste', shortcut: 'Ctrl+V', icon: 'paste', disabled: !editor.canPaste, action: () => editor.paste() },
        { id: 'diagrams-ctx-select-all', testid: 'diagrams-ctx-select-all', label: 'Select &All', shortcut: 'Ctrl+A', action: () => editor.selectAll() },
        { separator: true },
        { id: 'diagrams-ctx-layout', label: 'Lay Out &Shapes', items: layoutItems().map((i) => ({ ...i, testid: i.testid?.replace('-menu-', '-ctx-') })) },
        { id: 'diagrams-ctx-zoom', label: '&Zoom', items: zoomItems().map((i) => ({ ...i, testid: i.testid?.replace('-menu-', '-ctx-') })) },
        { separator: true },
        { id: 'diagrams-ctx-new-page', testid: 'diagrams-ctx-new-page', label: 'Insert &Page', action: () => editor.addPage() },
        { id: 'diagrams-ctx-page-setup', testid: 'diagrams-ctx-page-setup', label: 'Page Set&up...', action: pageSetup }
      ]
    return [
      ...editMenuItems('diagrams-ctx').slice(3),
      { separator: true },
      { id: 'diagrams-ctx-edit-text', testid: 'diagrams-ctx-edit-text', label: 'Edit &Text', shortcut: 'F2', disabled: editor.selection.length !== 1, action: () => canvas?.startEditing() },
      { id: 'diagrams-ctx-format', testid: 'diagrams-ctx-format', label: '&Format...', action: () => (showFormat = true) },
      { separator: true },
      { id: 'diagrams-ctx-order', label: '&Order', items: orderItems('diagrams-ctx') },
      ...(sel.length > 1 ? [{ id: 'diagrams-ctx-align', label: 'Align and &Distribute', items: alignItems('diagrams-ctx') }, { id: 'diagrams-ctx-group', testid: 'diagrams-ctx-group', label: '&Group', shortcut: 'Ctrl+G', action: () => editor.group() }] : []),
      ...(sel.some((s) => s.groupId) ? [{ id: 'diagrams-ctx-ungroup', testid: 'diagrams-ctx-ungroup', label: '&Ungroup', action: () => editor.ungroup() }] : []),
      ...(sel.length ? [{ id: 'diagrams-ctx-lock', testid: 'diagrams-ctx-lock', label: sel.every((s) => s.locked) ? 'Un&lock' : '&Lock', action: () => editor.updateShapes(sel.map((s) => s.id), { locked: !sel.every((s) => s.locked) }, 'Lock') }] : []),
      ...(selConn.length ? [{ id: 'diagrams-ctx-routing', label: 'Connector &Style', items: (['orthogonal', 'straight', 'curved'] as const).map((r) => ({ id: `diagrams-ctx-route-${r}`, testid: `diagrams-ctx-route-${r}`, label: r === 'orthogonal' ? '&Right Angle' : r === 'straight' ? '&Straight' : '&Curved', radio: true, checked: selConn[0].routing === r, action: () => setRouting(r) })) }] : [])
    ]
  }

  const pageItems = (index: number): MenuItemDef[] => [
    { id: 'diagrams-page-insert', testid: 'diagrams-page-ctx-insert', label: '&Insert Page', action: () => editor.addPage() },
    { id: 'diagrams-page-duplicate', testid: 'diagrams-page-ctx-duplicate', label: 'D&uplicate Page', action: () => editor.duplicatePage(index) },
    { id: 'diagrams-page-rename', testid: 'diagrams-page-ctx-rename', label: '&Rename Page', action: () => void tabs?.rename(index) },
    { id: 'diagrams-page-delete', testid: 'diagrams-page-ctx-delete', label: '&Delete Page', disabled: editor.doc.pages.length <= 1, action: () => void deletePage(index) },
    { separator: true },
    { id: 'diagrams-page-left', testid: 'diagrams-page-ctx-left', label: 'Move &Left', disabled: index === 0, action: () => movePage(index, -1) },
    { id: 'diagrams-page-right', testid: 'diagrams-page-ctx-right', label: 'Move Ri&ght', disabled: index >= editor.doc.pages.length - 1, action: () => movePage(index, 1) }
  ]

  async function deletePage(index: number): Promise<void> {
    const page = editor.doc.pages[index]
    if (page.shapes.length) {
      const answer = await showMessageBox({ text: `Delete the page "${page.name}" and its ${page.shapes.length} shape${page.shapes.length === 1 ? '' : 's'}?`, caption: APP, buttons: 'YesNo', icon: 'question' })
      if (answer !== 'yes') return
    }
    editor.deletePage(index)
  }

  function movePage(index: number, by: -1 | 1): void {
    editor.commit('Move page', (d) => {
      const [p] = d.pages.splice(index, 1)
      d.pages.splice(index + by, 0, p)
    })
    editor.pageIndex = index + by
  }

  // ---- keyboard ---------------------------------------------------------------------------------

  const typing = (target: EventTarget | null): boolean => target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

  function onkeydown(event: KeyboardEvent): void {
    ctx.key(event, contextItems)
    if (event.defaultPrevented || typing(event.target)) return
    const key = event.key
    const lower = key.toLowerCase()
    const run = (fn: () => void): void => {
      event.preventDefault()
      fn()
    }
    if (event.ctrlKey && !event.altKey) {
      if (event.shiftKey) {
        if (lower === 'u') return run(() => editor.ungroup())
        if (lower === 'f') return run(() => editor.order('front'))
        if (lower === 'b') return run(() => editor.order('back'))
        if (lower === 'w') return run(() => void canvas?.fit('page'))
        if (lower === 'z') return run(() => editor.redo())
        return
      }
      const map: Record<string, () => void> = {
        a: () => editor.selectAll(),
        c: () => void editor.copy(),
        x: () => editor.cut(),
        v: () => editor.paste(),
        d: () => editor.duplicate(),
        z: () => editor.undo(),
        y: () => editor.redo(),
        g: () => editor.group(),
        s: () => void save(),
        b: () => toggle('bold'),
        i: () => toggle('italic'),
        u: () => toggle('underline'),
        l: () => editor.rotateSelection(-90),
        r: () => editor.rotateSelection(90),
        '1': () => (editor.tool = 'pointer'),
        '2': () => (editor.tool = 'text'),
        '3': () => (editor.tool = 'connector'),
        '=': () => editor.zoomBy(1),
        '+': () => editor.zoomBy(1),
        '-': () => editor.zoomBy(-1)
      }
      if (map[lower]) run(map[lower])
      return
    }
    if (event.altKey || event.metaKey) return
    if (key === 'Delete' || key === 'Backspace') return run(() => editor.deleteSelection())
    if (key === 'Escape') return run(() => (editor.tool !== 'pointer' ? (editor.tool = 'pointer') : editor.clearSelection()))
    if (key === 'F2') return run(() => canvas?.startEditing())
    const nudge: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    if (nudge[key] && sel.length) {
      const step = event.shiftKey ? 1 : editor.snapToGrid ? editor.page.gridSize : 1
      return run(() => editor.move(sel.filter((s) => !s.locked).map((s) => s.id), nudge[key][0] * step, nudge[key][1] * step, 'Nudge'))
    }
    // Typing on one selected shape replaces its text (as in a drawing program).
    if (key.length === 1 && editor.selection.length === 1 && !event.ctrlKey) run(() => canvas?.startEditing(undefined, key))
  }

  /** New, Open: wherever the focus is inside the focused window. */
  function onWindowKey(event: KeyboardEvent): void {
    if (!focused || picking || saveAs || !event.ctrlKey || event.altKey || event.shiftKey) return
    const key = event.key.toLowerCase()
    if (key !== 'n' && key !== 'o') return
    event.preventDefault()
    void (key === 'n' ? newDrawing() : openDialog())
  }

  // ---- toolbars ---------------------------------------------------------------------------------

  const ZOOMS = [...ZOOM_STEPS].reverse().map((z) => ({ value: String(z), label: `${Math.round(z * 100)}%` }))
  const zoomValue = $derived(ZOOMS.some((z) => Number(z.value) === editor.zoom) ? String(editor.zoom) : `${Math.round(editor.zoom * 100)}%`)
  const zoomItemsCombo = $derived(ZOOMS.some((z) => Number(z.value) === editor.zoom) ? ZOOMS : [{ value: `${Math.round(editor.zoom * 100)}%`, label: `${Math.round(editor.zoom * 100)}%` }, ...ZOOMS])
  const FONTS = FONT_FAMILIES.map((f) => ({ value: f, label: f }))
  const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72].map((s) => ({ value: String(s), label: String(s) }))
  const DASHES: { id: DashStyle; label: string }[] = [
    { id: 'solid', label: 'Solid' },
    { id: 'dashed', label: 'Dashed' },
    { id: 'dotted', label: 'Dotted' },
    { id: 'dash-dot', label: 'Dash dot' }
  ]
  const lineItems = (): MenuItemDef[] => [
    ...[0.5, 1, 1.5, 2, 3, 4, 6].map((w) => ({ id: `diagrams-weight-${w}`, testid: `diagrams-weight-${w}`, label: `${w} pt`, radio: true, checked: firstStyle.strokeWidth === w, action: () => style({ strokeWidth: w }) })),
    { separator: true },
    ...DASHES.map((d) => ({ id: `diagrams-dash-${d.id}`, testid: `diagrams-dash-${d.id}`, label: d.label, radio: true, checked: (firstStyle.dash ?? 'solid') === d.id, action: () => style({ dash: d.id }) }))
  ]
  const endItems = (): MenuItemDef[] => [
    { id: 'diagrams-ends-arrow', testid: 'diagrams-ends-arrow', label: 'Arrow at end', action: () => style({ startMarker: 'none', endMarker: 'arrow' }) },
    { id: 'diagrams-ends-both', testid: 'diagrams-ends-both', label: 'Arrows at both ends', action: () => style({ startMarker: 'arrow', endMarker: 'arrow' }) },
    { id: 'diagrams-ends-none', testid: 'diagrams-ends-none', label: 'No arrows', action: () => style({ startMarker: 'none', endMarker: 'none' }) },
    { separator: true },
    { id: 'diagrams-ends-triangle', testid: 'diagrams-ends-triangle', label: 'Hollow triangle (inheritance)', action: () => style({ startMarker: 'none', endMarker: 'triangle' }) },
    { id: 'diagrams-ends-diamond', testid: 'diagrams-ends-diamond', label: 'Filled diamond (composition)', action: () => style({ startMarker: 'filled-diamond', endMarker: 'none' }) },
    { id: 'diagrams-ends-crow', testid: 'diagrams-ends-crow', label: "Crow's foot (one to many)", action: () => style({ startMarker: 'erd-one-only', endMarker: 'erd-zero-many' }) }
  ]

  function dropMenu(event: MouseEvent, items: MenuItemDef[]): void {
    const r = (event.currentTarget as HTMLElement).getBoundingClientRect()
    ctx.showAt(r.left, r.bottom, items)
  }

  const statusSize = $derived.by(() => {
    if (sel.length === 1) return `Width: ${Math.round(first!.w)}   Height: ${Math.round(first!.h)}   Angle: ${Math.round(first!.rotation)}°`
    if (sel.length > 1) return `${sel.length} shapes selected`
    if (selConn.length) return selConn.length === 1 ? `Connector ${selConn[0].id}` : `${selConn.length} connectors selected`
    return ''
  })
</script>

<svelte:window onkeydown={onWindowKey} />

{#snippet fillGlyph()}<Glyph name="fill-color" />{/snippet}
{#snippet lineGlyph()}<Glyph name="line-color" />{/snippet}
{#snippet fontGlyph()}<Glyph name="font-color" />{/snippet}

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="diagrams" data-testid="diagrams-app" role="application" aria-label={APP} tabindex="-1" bind:clientWidth={width} {onkeydown}>
  <MenuStrip {menus} aria-label="Diagrams menu" />

  <ToolStrip class="dg-strip" aria-label="Standard">
    <ToolButton icon="new" title="New (Ctrl+N)" testid="diagrams-tb-new" onclick={() => void newDrawing()} />
    <ToolButton icon="open-folder" title="Open (Ctrl+O)" testid="diagrams-tb-open" onclick={() => void openDialog()} />
    <ToolButton icon="save" title="Save (Ctrl+S)" testid="diagrams-tb-save" onclick={() => void save()} />
    <ToolButton glyph="export-image" title="Export page as PNG" testid="diagrams-tb-export" onclick={() => void exportPng()} />
    <Separator orientation="vertical" />
    <ToolButton icon="cut" title="Cut (Ctrl+X)" disabled={!hasSelection} testid="diagrams-tb-cut" onclick={() => editor.cut()} />
    <ToolButton icon="copy" title="Copy (Ctrl+C)" disabled={!hasSelection} testid="diagrams-tb-copy" onclick={() => void editor.copy()} />
    <ToolButton icon="paste" title="Paste (Ctrl+V)" disabled={!editor.canPaste} testid="diagrams-tb-paste" onclick={() => editor.paste()} />
    <ToolButton icon="undo" title={editor.undoLabel ? `Undo ${editor.undoLabel} (Ctrl+Z)` : "Can't undo"} disabled={!editor.undoLabel} testid="diagrams-tb-undo" onclick={() => editor.undo()} />
    <ToolButton icon="redo" title={editor.redoLabel ? `Redo ${editor.redoLabel} (Ctrl+Y)` : "Can't redo"} disabled={!editor.redoLabel} testid="diagrams-tb-redo" onclick={() => editor.redo()} />
    <Separator orientation="vertical" />
    <ToolButton glyph="pointer" title="Pointer Tool (Ctrl+1)" checked={editor.tool === 'pointer'} testid="diagrams-tool-pointer" onclick={() => (editor.tool = 'pointer')} />
    <ToolButton glyph="connector" title="Connector Tool (Ctrl+3): drag from shape to shape" checked={editor.tool === 'connector'} testid="diagrams-tool-connector" onclick={() => (editor.tool = editor.tool === 'connector' ? 'pointer' : 'connector')} />
    <ToolButton glyph="text" title="Text Tool (Ctrl+2): click the page to type" checked={editor.tool === 'text'} testid="diagrams-tool-text" onclick={() => (editor.tool = editor.tool === 'text' ? 'pointer' : 'text')} />
    <Separator orientation="vertical" />
    <ToolButton glyph="route-orthogonal" title="Right-angle connectors" checked={editor.routing === 'orthogonal'} testid="diagrams-route-orthogonal" onclick={() => setRouting('orthogonal')} />
    <ToolButton glyph="route-straight" title="Straight connectors" checked={editor.routing === 'straight'} testid="diagrams-route-straight" onclick={() => setRouting('straight')} />
    <ToolButton glyph="route-curved" title="Curved connectors" checked={editor.routing === 'curved'} testid="diagrams-route-curved" onclick={() => setRouting('curved')} />
    <Separator orientation="vertical" />
    <ToolButton glyph="zoom-out" title="Zoom Out (Ctrl+-)" testid="diagrams-tb-zoom-out" onclick={() => editor.zoomBy(-1)} />
    <span class="combo zoom"><ComboBox items={zoomItemsCombo} value={zoomValue} testid="diagrams-zoom" aria-label="Zoom" onchange={(v) => Number(v) > 0 && editor.setZoom(Number(v))} /></span>
    <ToolButton glyph="zoom-in" title="Zoom In (Ctrl+=)" testid="diagrams-tb-zoom-in" onclick={() => editor.zoomBy(1)} />
    <ToolButton glyph="whole-page" title="Whole Page (Ctrl+Shift+W)" testid="diagrams-tb-whole-page" onclick={() => void canvas?.fit('page')} />
    <Separator orientation="vertical" />
    <ToolButton glyph="shapes-pane" title="Shapes Window" checked={showShapes} testid="diagrams-tb-shapes" onclick={() => (showShapes = !showShapes)} />
    <ToolButton glyph="format-pane" title="Format Pane" checked={showFormat} testid="diagrams-tb-format" onclick={() => (showFormat = !showFormat)} />
  </ToolStrip>

  <ToolStrip class="dg-strip" aria-label="Formatting">
    <span class="combo font"><ComboBox items={FONTS} value={firstStyle.fontFamily ?? 'Segoe UI'} disabled={!hasSelection} testid="diagrams-font" aria-label="Font" onchange={(v) => style({ fontFamily: v })} /></span>
    <span class="combo size"><ComboBox items={SIZES} value={String(firstStyle.fontSize ?? 12)} dropDownStyle="DropDown" disabled={!hasSelection} testid="diagrams-font-size" aria-label="Font size" onchange={(v) => Number(v) > 0 && style({ fontSize: Number(v) })} /></span>
    <ToolButton glyph="bold" title="Bold (Ctrl+B)" checked={!!firstStyle.bold} disabled={!hasSelection} testid="diagrams-tb-bold" onclick={() => toggle('bold')} />
    <ToolButton glyph="italic" title="Italic (Ctrl+I)" checked={!!firstStyle.italic} disabled={!hasSelection} testid="diagrams-tb-italic" onclick={() => toggle('italic')} />
    <ToolButton glyph="underline" title="Underline (Ctrl+U)" checked={!!firstStyle.underline} disabled={!hasSelection} testid="diagrams-tb-underline" onclick={() => toggle('underline')} />
    <Separator orientation="vertical" />
    <ToolButton glyph="align-text-left" title="Align Text Left" checked={firstStyle.textAlign === 'left'} disabled={!sel.length} testid="diagrams-tb-text-left" onclick={() => style({ textAlign: 'left' })} />
    <ToolButton glyph="align-text-center" title="Center Text" checked={(firstStyle.textAlign ?? 'center') === 'center' && sel.length > 0} disabled={!sel.length} testid="diagrams-tb-text-center" onclick={() => style({ textAlign: 'center' })} />
    <ToolButton glyph="align-text-right" title="Align Text Right" checked={firstStyle.textAlign === 'right'} disabled={!sel.length} testid="diagrams-tb-text-right" onclick={() => style({ textAlign: 'right' })} />
    <Separator orientation="vertical" />
    <ToolStripColorButton value={firstStyle.fontColor ?? '#000000'} glyph={fontGlyph} title="Font Color" disabled={!hasSelection} testid="diagrams-tb-font-color" onpick={(c) => style({ fontColor: c })} />
    <ToolStripColorButton value={firstStyle.fill ?? '#dbe8f8'} glyph={fillGlyph} title="Fill Color" allowNone noneLabel="No Fill" disabled={!sel.length} testid="diagrams-tb-fill" onpick={(c) => style({ fill: c })} />
    <ToolStripColorButton value={firstStyle.stroke ?? '#3a6aa5'} glyph={lineGlyph} title="Line Color" allowNone noneLabel="No Line" disabled={!hasSelection} testid="diagrams-tb-line-color" onpick={(c) => style({ stroke: c })} />
    <ToolButton glyph="line-weight" title="Line Weight and Pattern" disabled={!hasSelection} testid="diagrams-tb-line" onclick={(e) => dropMenu(e, lineItems())} />
    <ToolButton glyph="line-ends" title="Line Ends" disabled={!selConn.length} testid="diagrams-tb-ends" onclick={(e) => dropMenu(e, endItems())} />
    <ToolButton glyph="shadow" title="Shadow" checked={!!firstStyle.shadow && sel.length > 0} disabled={!sel.length} testid="diagrams-tb-shadow" onclick={() => style({ shadow: !firstStyle.shadow })} />
    <Separator orientation="vertical" />
    <ToolButton glyph="align-left" title="Align Left" disabled={sel.length < 2} testid="diagrams-tb-align-left" onclick={() => align('left')} />
    <ToolButton glyph="align-center" title="Align Center" disabled={sel.length < 2} testid="diagrams-tb-align-center" onclick={() => align('center')} />
    <ToolButton glyph="align-top" title="Align Top" disabled={sel.length < 2} testid="diagrams-tb-align-top" onclick={() => align('top')} />
    <ToolButton glyph="align-middle" title="Align Middle" disabled={sel.length < 2} testid="diagrams-tb-align-middle" onclick={() => align('middle')} />
    <ToolButton glyph="distribute-h" title="Distribute Horizontally" disabled={sel.length < 3} testid="diagrams-tb-distribute-h" onclick={() => editor.distribute('horizontal')} />
    <ToolButton glyph="distribute-v" title="Distribute Vertically" disabled={sel.length < 3} testid="diagrams-tb-distribute-v" onclick={() => editor.distribute('vertical')} />
    <Separator orientation="vertical" />
    <ToolButton glyph="front" title="Bring to Front (Ctrl+Shift+F)" disabled={!sel.length} testid="diagrams-tb-front" onclick={() => editor.order('front')} />
    <ToolButton glyph="back" title="Send to Back (Ctrl+Shift+B)" disabled={!sel.length} testid="diagrams-tb-back" onclick={() => editor.order('back')} />
    <ToolButton glyph="group" title="Group (Ctrl+G)" disabled={sel.length < 2} testid="diagrams-tb-group" onclick={() => editor.group()} />
    <ToolButton glyph="ungroup" title="Ungroup (Ctrl+Shift+U)" disabled={!sel.some((s) => s.groupId)} testid="diagrams-tb-ungroup" onclick={() => editor.ungroup()} />
    <ToolButton glyph="rotate-left" title="Rotate Left (Ctrl+L)" disabled={!sel.length} testid="diagrams-tb-rotate-left" onclick={() => editor.rotateSelection(-90)} />
    <ToolButton glyph="rotate-right" title="Rotate Right (Ctrl+R)" disabled={!sel.length} testid="diagrams-tb-rotate-right" onclick={() => editor.rotateSelection(90)} />
    <Separator orientation="vertical" />
    <ToolButton glyph="layout" title="Lay Out Shapes (top to bottom)" disabled={!editor.page.shapes.length} testid="diagrams-tb-layout" onclick={() => editor.layout({ algorithm: 'layered', direction: 'TB' })} />
  </ToolStrip>

  <div class="main">
    {#if showShapes}
      <ShapesPane onadd={(id) => canvas && addAt(id, canvas.viewCenter())} ondrop={dropStencil} onclose={() => (showShapes = false)} />
    {/if}
    <div class="center">
      {#if agentBusy}<div class="pill" data-testid="diagrams-agent-editing" role="status">The agent is editing the drawing…</div>{/if}
      <DiagramCanvas bind:this={canvas} {editor} onpointer={(p) => (pointer = p)} oncontextmenu={(e) => ctx.show(e, contextItems())} />
      <PageTabs bind:this={tabs} pages={editor.doc.pages.map((p) => p.name)} current={editor.pageIndex} onselect={(i) => editor.setPage(i)} onrename={(i, name) => editor.renamePage(i, name)} oninsert={() => editor.addPage()} oncontextmenu={(e, i) => ctx.show(e, pageItems(i))} />
    </div>
    {#if showFormat}
      <FormatPane {editor} onclose={() => (showFormat = false)} />
    {/if}
  </div>

  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text={agentBusy ? 'The agent is editing the drawing…' : message || statusSize || (editor.dirty ? `${fileName} (modified)` : fileName)} spring testid="diagrams-status" />
    <StatusStripLabel text="Page {editor.pageIndex + 1}/{editor.doc.pages.length}" borders={['left']} width={80} testid="diagrams-status-page" />
    <StatusStripLabel text={pointer ? `X: ${Math.round(pointer.x)}  Y: ${Math.round(pointer.y)}` : ''} borders={['left']} width={120} />
    <StatusStripLabel text="{Math.round(editor.zoom * 100)}%" borders={['left']} width={64} textAlign="right" testid="diagrams-status-zoom" />
  </StatusStrip>

  <ContextMenuStrip items={ctx.items} bind:open={ctx.open} x={ctx.x} y={ctx.y} label="Diagrams" />
  <AppAbout {help} />
  {#if picking}
    <OpenFileDialog
      api={host.api}
      desktopId={host.state.desktopId}
      title="Open drawing"
      startPath={editor.path ? (vpathParent(editor.path) ?? '') : (joinVPath(host.state.home, 'Documents') ?? '')}
      extensions={[EXT]}
      onopen={(p) => {
        picking = false
        void openFile(p)
      }}
      onclose={() => (picking = false)}
    />
  {/if}
  {#if saveAs}
    <SaveAsDialog caption={APP} name={saveAs.name} onsave={(n) => void finishSaveAs(n)} onclose={() => (saveAs = null)} />
  {/if}
</div>

<style>
  .diagrams {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--xp-face);
    outline: 0;
  }
  /* Office XP toolbars are compact: 24 px buttons on a 28 px strip. */
  .diagrams :global(.dg-strip) {
    height: 28px;
    gap: 0;
    overflow: hidden;
  }
  .diagrams :global(.dg-strip .tb) {
    height: 24px;
    padding: 0 3px;
  }
  .combo {
    display: inline-flex;
    margin: 0 2px;
  }
  .combo :global(> *) {
    width: 100%;
  }
  .combo.zoom {
    width: 70px;
  }
  .combo.font {
    width: 128px;
  }
  .combo.size {
    width: 50px;
  }
  .main {
    flex: 1;
    min-height: 0;
    display: flex;
  }
  .center {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .pill {
    position: absolute;
    top: 26px;
    left: 50%;
    z-index: 5;
    transform: translateX(-50%);
    padding: 3px 12px;
    border: 1px solid #a87a0c;
    border-radius: 3px;
    background: #ffffe1;
    box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);
    pointer-events: none;
  }
</style>

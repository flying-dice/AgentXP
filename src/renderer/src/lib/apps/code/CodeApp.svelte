<script lang="ts">
  import { tick, untrack } from 'svelte'
  import type { FileChangeDto } from '@shared/models'
  import { GIT_STATE_INFO, formatBranch, gitFileState, type GitLineChange, type GitStatusDto } from '@shared/git'
  import type { AppProps } from '../types'
  import ChangesPane from '../../app/shell/ChangesPane.svelte'
  import FileTree from '../../app/shell/FileTree.svelte'
  import Button from '../../kit/atoms/Button.svelte'
  import Icon from '../../kit/atoms/Icon.svelte'
  import Separator from '../../kit/atoms/Separator.svelte'
  import type { MenuDef } from '../../kit/molecules/MenuItem'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import CodeViewer from '../../kit/organisms/CodeViewer.svelte'
  import type { GutterMark } from '../../kit/organisms/CodeViewer'
  import { languageFromPath } from '../../kit/organisms/highlighter'
  import ListView from '../../kit/organisms/ListView.svelte'
  import type { ListColumn, ListRow } from '../../kit/organisms/ListView'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import SplitContainer from '../../kit/organisms/SplitContainer.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import TabControl from '../../kit/organisms/TabControl.svelte'
  import ToolStrip from '../../kit/organisms/ToolStrip.svelte'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { normaliseVPath, parseVPath, vpathName } from '@shared/vfs'
  import { driveRoot, driveTitle, sortDrives } from '../explorer/explorerModel'
  import OpenFileDialog from '../shared/OpenFileDialog.svelte'
  import { errorText } from '../shared/listing'
  import { useDesktopStores } from '../sessionStores.svelte'
  import { ViewSync } from '../viewSync'
  import { closeTab, openTab, reconcileTabs, sameRange, scrollTopForLine, visibleRange } from './codeModel'
  import DockPane from './DockPane.svelte'
  import { anchorLine, changeAtLine, indexGitStatus, marksOf, stepChange } from './gitModel'

  let { window: win, host, focused = false }: AppProps<'code'> = $props()

  const desktopId = $derived(host.state.desktopId)
  /** The tree shows every plugged-in project; with none, the agent's home. */
  const roots = $derived.by(() => {
    const usb = sortDrives(host.state.drives).filter((d) => d.kind === 'removable')
    return usb.length > 0 ? usb.map((d) => ({ path: driveRoot(d.letter), name: driveTitle(d) })) : [{ path: host.state.home, name: vpathName(host.state.home) }]
  })
  const rootsKey = $derived(roots.map((r) => r.path).join('|'))

  let tabs = $state<string[]>([])
  let active = $state<string | null>(null)
  let visible = $state.raw<[number, number] | null>(null)
  let selection = $state.raw<{ startLine: number; endLine: number } | null>(null)
  let selectedChangeId = $state<number | null>(null)
  /** Docked panes (View menu): Management on the left, Logs & others at the bottom. */
  let showManagement = $state(true)
  let showLogs = $state(true)
  let showRuler = $state(true)
  let mgmtTab = $state('projects')
  let logsTab = $state('changes')
  let openDialog = $state(false)
  // Git: the status of every drive's repository, the changes of the active file and the open peek.
  let gitStatuses = $state.raw<(GitStatusDto | null)[]>([])
  let lineChanges = $state.raw<GitLineChange[]>([])
  let peek = $state<number | null>(null)
  let caret = $state({ line: 1, col: 1 })
  let files = $state.raw<Record<string, { text: string | null; error: string | null }>>({})
  /** Lines the agent asked to reveal; highlighted until another file is shown. */
  let revealed = $state.raw<[number, number] | null>(null)
  let host_el = $state<HTMLDivElement | null>(null)
  let reportedVisible: [number, number] | null = null

  const sync = new ViewSync<{ tabs: string[]; activePath: string | null; visibleLines: [number, number] | null; selectedChangeId: number | null }>((v) =>
    JSON.stringify([v.tabs, v.activePath, v.visibleLines, v.selectedChangeId])
  )

  function report(): void {
    const view = { tabs: [...tabs], activePath: active, visibleLines: visible ? ([...visible] as [number, number]) : null, selectedChangeId }
    if (sync.mark(view)) host.updateView(win.id, { app: 'code', ...view, selection })
  }

  // Everything the agents of this desktop did: all their changes and edit tool calls.
  // svelte-ignore state_referenced_locally
  const desktop = useDesktopStores(host)
  const stores = $derived(desktop.list)
  const changes = $derived<FileChangeDto[]>(stores.flatMap((s) => s.state.changes))
  const changedPaths = $derived(changes.map((c) => normaliseVPath(c.path) ?? c.path))
  const editing = $derived(
    active !== null &&
      stores.some((s) =>
        Object.values(s.state.toolCalls).some(
          (c) =>
            c.kind === 'edit' &&
            (c.status === 'in_progress' || c.status === 'pending') &&
            c.locations.some((l) => normaliseVPath(l.path) === active)
        )
      )
  )
  /** Changes to the active file, so the text is re-read when an edit lands. */
  const activeChangeKey = $derived(
    JSON.stringify(changes.filter((c) => normaliseVPath(c.path) === active).map((c) => [c.id, c.additions, c.deletions, c.kind]))
  )

  async function loadFile(path: string): Promise<void> {
    try {
      const text = await host.api.vfs.readFile(desktopId, path)
      files = { ...files, [path]: { text, error: null } }
    } catch (error) {
      files = { ...files, [path]: { text: null, error: errorText(error) } }
    }
  }

  const gitIndex = $derived(indexGitStatus(gitStatuses))
  const gitEntries = $derived(gitStatuses.flatMap((s) => s?.entries ?? []))
  /** The repository of the active file's drive, else the first one found. */
  const activeStatus = $derived.by(() => {
    const drive = active ? parseVPath(active)?.drive : undefined
    const at = roots.findIndex((r) => parseVPath(r.path)?.drive === drive)
    return (at >= 0 ? gitStatuses[at] : null) ?? gitStatuses.find((s) => s !== null) ?? null
  })

  const sameChanges = (a: readonly GitLineChange[], b: readonly GitLineChange[]): boolean => JSON.stringify(a) === JSON.stringify(b)

  /** Re-reads the active file (when it changed on disk) and its line changes against HEAD. */
  async function refreshActive(): Promise<void> {
    const path = active
    if (!path) {
      lineChanges = []
      peek = null
      return
    }
    const now = await host.api.vfs.readFile(desktopId, path).catch(() => null)
    if (path !== active) return
    if (now !== null && now !== files[path]?.text) files = { ...files, [path]: { text: now, error: null } }
    const changes = await host.api.git.lineChanges(desktopId, path).catch(() => [])
    if (path !== active) return
    if (!sameChanges(changes, lineChanges)) lineChanges = changes
    if (peek !== null && peek >= changes.length) peek = null
  }

  let refreshing = false
  let refreshAgain = false
  /** Status of every drive plus the active file's changes. Overlapping calls collapse into one more run. */
  async function refreshGit(): Promise<void> {
    if (refreshing) {
      refreshAgain = true
      return
    }
    refreshing = true
    try {
      do {
        refreshAgain = false
        const next = await Promise.all(untrack(() => roots).map((r) => host.api.git.status(desktopId, r.path).catch(() => null)))
        if (JSON.stringify(next) !== JSON.stringify(untrack(() => gitStatuses))) gitStatuses = next
        await refreshActive()
      } while (refreshAgain)
    } finally {
      refreshing = false
    }
  }

  // Refresh on git.changed (agent edits, saves, the 5 s poll), on window focus and when the window gets focus.
  $effect(() => host.api.on('git.changed', (e) => e.desktopId === untrack(() => desktopId) && void refreshGit()))
  $effect(() => {
    const onFocus = (): void => void refreshGit()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  })
  $effect(() => {
    if (focused) untrack(() => void refreshGit())
  })
  $effect(() => {
    void rootsKey
    void active
    untrack(() => void refreshGit())
  })

  // Load the text of every tab that has none yet.
  $effect(() => {
    for (const path of tabs) {
      if (!(path in untrack(() => files))) {
        files = { ...untrack(() => files), [path]: { text: null, error: null } }
        void loadFile(path)
      }
    }
  })

  // Reload the active file when the agent changed it.
  let lastChangeKey = ''
  $effect(() => {
    const key = activeChangeKey
    untrack(() => {
      if (key === lastChangeKey) return
      lastChangeKey = key
      if (active && active in files) void loadFile(active).then(() => refreshGit())
    })
  })

  function show(path: string): void {
    const next = openTab({ tabs, active }, path)
    tabs = next.tabs
    active = next.active
    visible = null
    selection = null
    revealed = null
    report()
  }

  function close(path: string): void {
    const next = closeTab({ tabs, active }, path)
    tabs = next.tabs
    if (next.active !== active) {
      active = next.active
      visible = null
      selection = null
      revealed = null
    }
    report()
  }

  // The agent opens a file, reveals lines or picks a change.
  $effect(() => {
    const view = win.view
    if (!sync.isExternal({ tabs: view.tabs, activePath: view.activePath, visibleLines: view.visibleLines, selectedChangeId: view.selectedChangeId })) return
    untrack(() => {
      const next = reconcileTabs(view.tabs.map((t) => normaliseVPath(t) ?? t), view.activePath ? (normaliseVPath(view.activePath) ?? view.activePath) : null)
      const changedFile = next.active !== active
      tabs = next.tabs
      active = next.active
      selectedChangeId = view.selectedChangeId
      if (changedFile) {
        selection = null
        revealed = null
      }
      if (view.visibleLines && !sameRange(view.visibleLines, reportedVisible)) {
        revealed = view.visibleLines
        visible = view.visibleLines
        void reveal(view.visibleLines[0])
      } else if (changedFile) visible = null
    })
  })

  const scroller = (): HTMLElement | null => host_el?.querySelector<HTMLElement>('.w7-codeviewer .scroll') ?? null
  const lineHeight = (): number => host_el?.querySelector<HTMLElement>('.w7-codeviewer .row')?.offsetHeight || 17

  async function reveal(line: number): Promise<void> {
    await tick()
    // The text may still be loading: wait a few frames for the rows.
    for (let i = 0; i < 20 && !scroller()?.querySelector('.row'); i++) await new Promise((r) => setTimeout(r, 30))
    const el = scroller()
    if (el) el.scrollTop = scrollTopForLine(line, el.clientHeight, lineHeight())
  }

  const text = $derived(active ? (files[active]?.text ?? null) : null)
  const totalLines = $derived(text === null ? 0 : text.split('\n').length)

  function measure(): void {
    const el = scroller()
    if (!el || text === null) return
    const next = visibleRange(el.scrollTop, el.clientHeight, lineHeight(), totalLines)
    if (sameRange(next, visible)) return
    visible = next
    reportedVisible = next
    report()
  }

  function readCaret(el: HTMLElement, sel: Selection): void {
    const node = sel.focusNode
    const row = (node instanceof Element ? node : node?.parentElement)?.closest('.row')
    const code = row?.querySelector('.code')
    if (!node || !row || !code || !code.contains(node)) return
    try {
      const range = document.createRange()
      range.setStart(code, 0)
      range.setEnd(node, sel.focusOffset)
      const line = [...el.querySelectorAll('.row')].indexOf(row) + 1
      if (line !== caret.line || range.toString().length + 1 !== caret.col) caret = { line, col: range.toString().length + 1 }
    } catch {
      /* the caret is not in text */
    }
  }

  function readSelection(): void {
    const el = scroller()
    const sel = window.getSelection()
    if (el && sel && sel.focusNode && el.contains(sel.focusNode)) readCaret(el, sel)
    if (!el || !sel || sel.isCollapsed || !sel.anchorNode || !el.contains(sel.anchorNode)) {
      if (selection !== null) {
        selection = null
        report()
      }
      return
    }
    const rows = [...el.querySelectorAll('.row')]
    const lineOf = (node: Node | null): number => {
      const row = (node instanceof Element ? node : node?.parentElement)?.closest('.row')
      return row ? rows.indexOf(row) + 1 : 0
    }
    const a = lineOf(sel.anchorNode)
    const b = lineOf(sel.focusNode)
    if (a === 0 || b === 0) return
    const next = { startLine: Math.min(a, b), endLine: Math.max(a, b) }
    if (selection?.startLine === next.startLine && selection.endLine === next.endLine) return
    selection = next
    report()
  }

  // Follow scrolling and selection of the code viewer (its scroller is re-created per file).
  $effect(() => {
    void active
    void text
    let frame = 0
    let el: HTMLElement | null = null
    const onScroll = (): void => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    void tick().then(() => {
      el = scroller()
      el?.addEventListener('scroll', onScroll, { passive: true })
      el?.addEventListener('mouseup', readSelection)
      el?.addEventListener('keyup', readSelection)
      measure()
    })
    return () => {
      cancelAnimationFrame(frame)
      el?.removeEventListener('scroll', onScroll)
      el?.removeEventListener('mouseup', readSelection)
      el?.removeEventListener('keyup', readSelection)
    }
  })

  async function revert(change: FileChangeDto): Promise<void> {
    const answer = await showMessageBox({
      text: `Revert the changes to ${change.path}?\n\nThe file goes back to how it was before the agent edited it.`,
      caption: 'Code',
      buttons: 'YesNo',
      icon: 'warning'
    })
    if (answer !== 'yes') return
    try {
      await host.api.sessions.revertChange(change.id)
      await desktop.stores.open(change.sessionId).connect()
      selectedChangeId = null
      report()
      await loadFile(change.path)
    } catch (error) {
      await showMessageBox({ text: error instanceof Error ? error.message : String(error), caption: 'Code', buttons: 'OK', icon: 'error' })
    }
  }

  // ---- git changes of the active file: gutter marks, peek, navigation, revert ----------------------

  const marks = $derived(marksOf(lineChanges))
  const kindLabel = (kind: GitLineChange['kind']): string => ({ added: 'Added', modified: 'Modified', deleted: 'Deleted' })[kind]
  const rangeLabel = (c: GitLineChange): string => (c.kind === 'deleted' ? `after line ${c.start}` : c.start === c.end ? `line ${c.start}` : `lines ${c.start}-${c.end}`)
  const textLines = $derived(text === null ? [] : text.split('\n'))
  const newLinesOf = (c: GitLineChange): string[] => (c.kind === 'deleted' ? [] : textLines.slice(c.start - 1, c.end))

  async function goToChange(index: number | null): Promise<void> {
    if (index === null) return
    const change = lineChanges[index]
    if (!change) return
    peek = index
    await reveal(anchorLine(change))
  }

  function step(direction: 1 | -1): void {
    const from = peek !== null && lineChanges[peek] ? anchorLine(lineChanges[peek]) : visible ? visible[0] - 1 : null
    void goToChange(stepChange(lineChanges, from, direction))
  }

  function clickMark(mark: GutterMark): void {
    peek = peek === mark.index ? null : mark.index
    if (peek !== null) void tick().then(() => scroller()?.querySelector('[data-testid="code-hunk-peek"]')?.scrollIntoView({ block: 'nearest' }))
  }

  /** The change to revert: the open peek, else the one under the caret. */
  const revertTarget = $derived(peek ?? changeAtLine(lineChanges, caret.line))

  async function revertHunk(index: number | null): Promise<void> {
    const path = active
    const change = index === null ? null : lineChanges[index]
    if (!path || index === null || !change) return
    const answer = await showMessageBox({
      text: `Revert this change in ${vpathName(path)} (${rangeLabel(change)})?\n\nThe lines go back to how they are in the last commit.`,
      caption: 'Code',
      buttons: 'YesNo',
      icon: 'warning'
    })
    if (answer !== 'yes') return
    try {
      await host.api.git.revertHunk(desktopId, path, index)
      peek = null
      await loadFile(path)
      await refreshGit()
    } catch (error) {
      await showMessageBox({ text: error instanceof Error ? error.message : String(error), caption: 'Code', buttons: 'OK', icon: 'error' })
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'F5' && event.altKey) {
      event.preventDefault()
      step(event.shiftKey ? -1 : 1)
    } else if (event.key === 'Escape' && peek !== null) peek = null
  }

  // ---- menu, lists -------------------------------------------------------------------------------

  const menus = $derived<MenuDef[]>([
    {
      label: '&File',
      items: [
        { id: 'code-open', label: '&Open...', icon: 'open-folder', shortcut: 'Ctrl+O', action: () => (openDialog = true) },
        { separator: true },
        { id: 'code-close-file', label: '&Close file', disabled: active === null, action: () => active && close(active) },
        { id: 'code-close-all', label: 'Close &all files', disabled: tabs.length === 0, action: () => [...tabs].forEach(close) },
        { separator: true },
        { id: 'code-exit', label: 'E&xit', action: () => void host.closeWindow(win.id) }
      ]
    },
    {
      label: '&Edit',
      items: [
        { id: 'code-copy', label: '&Copy', icon: 'copy', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
        { separator: true },
        { id: 'code-revert-hunk', label: '&Revert hunk...', disabled: revertTarget === null, action: () => void revertHunk(revertTarget) }
      ]
    },
    {
      label: '&View',
      items: [
        { id: 'code-view-management', label: '&Management', checked: showManagement, action: () => (showManagement = !showManagement) },
        { id: 'code-view-logs', label: '&Logs & others', checked: showLogs, action: () => (showLogs = !showLogs) },
        { id: 'code-view-ruler', label: '&Overview ruler', checked: showRuler, action: () => (showRuler = !showRuler) }
      ]
    },
    {
      label: '&Search',
      items: [
        { id: 'code-next-change', label: '&Next change', icon: 'chevron-down', shortcut: 'Alt+F5', disabled: lineChanges.length === 0, action: () => step(1) },
        { id: 'code-prev-change', label: '&Previous change', icon: 'chevron-up', shortcut: 'Shift+Alt+F5', disabled: lineChanges.length === 0, action: () => step(-1) }
      ]
    },
    { label: '&Tools', items: [{ id: 'code-refresh', label: '&Refresh git status', icon: 'refresh', action: () => void refreshGit() }] },
    {
      label: '&Help',
      items: [
        {
          id: 'code-about',
          label: '&About Code...',
          action: () =>
            void showMessageBox({ text: 'Code shows the files of the plugged-in projects. The agent edits them; you review the changes here, with git status in the tree and the margin.', caption: 'About Code', buttons: 'OK', icon: 'information' })
        }
      ]
    }
  ])

  const mgmtTabs = [
    { id: 'projects', title: 'Projects', testid: 'code-mgmt-tab-projects' },
    { id: 'files', title: 'Files', testid: 'code-mgmt-tab-files' },
    { id: 'changes', title: 'Changes', testid: 'code-mgmt-tab-changes' }
  ]
  const logTabs = $derived([
    { id: 'changes', title: changes.length > 0 ? `Agent changes (${changes.length})` : 'Agent changes', testid: 'code-logs-tab-changes' },
    { id: 'git', title: gitEntries.length > 0 ? `Git (${gitEntries.length})` : 'Git', testid: 'code-logs-tab-git' }
  ])

  const stateOf = (path: string): string => {
    const found = gitIndex.files.get(normaliseVPath(path) ?? path)
    return found ?? 'none'
  }
  /** The "Files" tab: open files first, then everything git or the agent changed. */
  const fileRows = $derived.by<ListRow[]>(() => {
    const seen = new Set<string>()
    const rows: ListRow[] = []
    for (const path of [...tabs, ...changedPaths, ...gitEntries.map((e) => e.path)]) {
      if (seen.has(path)) continue
      seen.add(path)
      const state = gitIndex.files.get(path)
      rows.push({
        id: path,
        testid: 'code-files-item',
        icon: 'file-code',
        attrs: { 'data-path': path, 'data-git-status': state ?? 'none' },
        name: vpathName(path),
        status: state ? GIT_STATE_INFO[state].text : changedPaths.includes(path) ? 'Agent changed' : ''
      })
    }
    return rows
  })
  const fileColumns: ListColumn[] = [
    { key: 'name', header: 'File' },
    { key: 'status', header: 'State', width: 84 }
  ]
  const changeRows = $derived<ListRow[]>(changes.map((c) => ({ id: String(c.id), testid: 'code-mgmt-change', icon: 'file-code', name: vpathName(c.path), kind: c.kind })))
  const changeColumns: ListColumn[] = [
    { key: 'name', header: 'File' },
    { key: 'kind', header: 'Change', width: 62 }
  ]
  const gitRows = $derived<ListRow[]>(
    gitEntries.map((e) => {
      const state = gitFileState(e)
      return {
        id: e.path,
        testid: 'code-git-entry',
        icon: 'file-code',
        attrs: { 'data-path': e.path, 'data-git-status': state },
        status: `${e.index}${e.worktree}`.replaceAll(' ', '\u00b7'),
        text: GIT_STATE_INFO[state].text,
        file: e.path
      }
    })
  )
  const gitColumns: ListColumn[] = [
    { key: 'status', header: 'XY', width: 36 },
    { key: 'text', header: 'Status', width: 90 },
    { key: 'file', header: 'File' }
  ]
  const eol = $derived(text === null ? '' : text.includes('\r\n') ? 'CRLF' : 'LF')

  const highlightLines = $derived(revealed ? Array.from({ length: Math.min(80, revealed[1] - revealed[0] + 1) }, (_, i) => revealed![0] + i) : [])
  const language = $derived(active ? languageFromPath(active) : 'text')
  const lineLabel = $derived(visible ? `Lines ${visible[0]}-${visible[1]} of ${totalLines}` : '')
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="code" data-testid="code-app" onkeydown={onKeydown}>
  <MenuStrip {menus} aria-label="Code menu" />
  <ToolStrip aria-label="Code toolbar" class="cb-tools">
    <ToolStripButton data-testid="code-new" icon="new" title="New file (the agent creates files)" disabled />
    <ToolStripButton data-testid="code-open" icon="open-folder" title="Open file (Ctrl+O)" onclick={() => (openDialog = true)} />
    <ToolStripButton data-testid="code-save" icon="save" title="Save (files are edited by the agent)" disabled />
    <ToolStripButton data-testid="code-save-all" icon="library" title="Save all" disabled />
    <Separator orientation="vertical" />
    <ToolStripButton data-testid="code-undo" icon="undo" title="Undo" disabled />
    <ToolStripButton data-testid="code-redo" icon="redo" title="Redo" disabled />
    <Separator orientation="vertical" />
    <ToolStripButton data-testid="code-prev-change" icon="chevron-up" title="Previous change (Shift+Alt+F5)" aria-label="Previous change" disabled={lineChanges.length === 0} onclick={() => step(-1)} />
    <ToolStripButton data-testid="code-next-change" icon="chevron-down" title="Next change (Alt+F5)" aria-label="Next change" disabled={lineChanges.length === 0} onclick={() => step(1)} />
    <ToolStripButton data-testid="code-toolbar-revert-hunk" icon="recycle" title="Revert hunk" aria-label="Revert hunk" disabled={revertTarget === null} onclick={() => void revertHunk(revertTarget)} />
    <Separator orientation="vertical" />
    <ToolStripButton data-testid="code-refresh" icon="refresh" title="Refresh git status" aria-label="Refresh git status" onclick={() => void refreshGit()} />
    <ToolStripButton text="Management" icon="folder" bind:checked={showManagement} checkOnClick data-testid="code-management-toggle" title="Show or hide the Management pane" />
    <ToolStripButton text={changes.length > 0 ? `Logs (${changes.length})` : 'Logs'} icon="changes" bind:checked={showLogs} checkOnClick data-testid="code-changes-toggle" title="Show or hide the Logs & others pane" />
    {#snippet trailing()}
      {#if editing}
        <span class="editing" data-testid="code-editing" role="status"><Icon name="edit" /> Agent is editing {active ? vpathName(active) : ''}</span>
      {/if}
    {/snippet}
  </ToolStrip>
  <div class="work">
    {#snippet management()}
      <DockPane title="Management" testid="code-management" onclose={() => (showManagement = false)}>
        <TabControl tabs={mgmtTabs} bind:selected={mgmtTab} aria-label="Management">
          {#snippet panel(tab)}
            {#if tab.id === 'projects'}
              <div class="tree">
                {#key rootsKey}
                  <FileTree {roots} readDir={(p) => host.api.vfs.readDir(desktopId, p)} {changedPaths} git={gitIndex} onopen={show} />
                {/key}
              </div>
            {:else if tab.id === 'files'}
              <ListView
                columns={fileColumns}
                rows={fileRows}
                testid="code-files"
                emptyText="No open or changed files."
                aria-label="Open and changed files"
                selected={active ? [active] : []}
                onactivate={(row) => show(row.id)}
                onselect={(ids) => ids[0] && show(ids[0])}
              />
            {:else}
              <ListView
                columns={changeColumns}
                rows={changeRows}
                testid="code-mgmt-changes"
                emptyText="The agent has not changed any files."
                aria-label="Agent changes"
                selected={selectedChangeId === null ? [] : [String(selectedChangeId)]}
                onselect={(ids) => {
                  selectedChangeId = ids[0] ? Number(ids[0]) : null
                  report()
                }}
                onactivate={(row) => {
                  const c = changes.find((x) => String(x.id) === row.id)
                  if (c) show(c.path)
                }}
              />
            {/if}
          {/snippet}
        </TabControl>
      </DockPane>
    {/snippet}
    {#snippet peekView(mark: GutterMark)}
      {@const change = lineChanges[mark.index]}
      {#if change}
        <div class="peek-head">
          <span class="peek-title">{kindLabel(change.kind)} {rangeLabel(change)}</span>
          <span class="peek-spring"></span>
          <Button data-testid="code-hunk-revert" onclick={() => void revertHunk(mark.index)}>Revert hunk</Button>
          <Button data-testid="code-hunk-close" onclick={() => (peek = null)}>Close</Button>
        </div>
        <div class="peek-lines" data-testid="code-hunk-lines">
          {#each change.oldLines as old, i (i)}
            <div class="pl old" data-testid="code-hunk-old"><span class="sign">&minus;</span><code>{old}</code></div>
          {/each}
          {#each newLinesOf(change) as line, i (i)}
            <div class="pl new" data-testid="code-hunk-new"><span class="sign">+</span><code>{line}</code></div>
          {/each}
        </div>
      {/if}
    {/snippet}
    {#snippet editor()}
      <div class="editor">
        <div class="tabs" role="tablist" aria-label="Open files">
          {#each tabs as tab (tab)}
            <div class="tab" class:on={tab === active} role="presentation" data-testid="code-tab" data-path={tab} data-git-status={stateOf(tab)}>
              <button class="name" data-testid="code-tab-name" role="tab" aria-selected={tab === active} title={tab} onclick={() => show(tab)}>
                <Icon name="file-code" />{vpathName(tab)}{#if changedPaths.includes(tab) || stateOf(tab) !== 'none'}<span class="mod" title="Modified">&#9679;</span>{/if}
              </button>
              <button class="x" data-testid="code-tab-close" aria-label="Close {vpathName(tab)}" onclick={() => close(tab)}>&times;</button>
            </div>
          {/each}
        </div>
        <div class="view" data-testid="code-editor" data-path={active} bind:this={host_el}>
          {#if active === null}
            <div class="hint" data-testid="code-hint">Open a file from the tree to view it here.</div>
          {:else if files[active]?.error}
            <div class="hint">{files[active].error}</div>
          {:else if text === null}
            <div class="hint">Loading...</div>
          {:else}
            {#key active}
              <CodeViewer
                code={text}
                {language}
                {highlightLines}
                label={active}
                gutterMarks={marks}
                ruler={showRuler}
                peekMark={peek}
                peek={peekView}
                onmarkclick={clickMark}
              />
            {/key}
          {/if}
        </div>
      </div>
    {/snippet}
    {#snippet logs()}
      <DockPane title="Logs &amp; others" testid="code-logs" onclose={() => (showLogs = false)}>
        <TabControl tabs={logTabs} bind:selected={logsTab} aria-label="Logs and others">
          {#snippet panel(tab)}
            {#if tab.id === 'changes'}
              <div class="changes" data-testid="code-changes">
                <ChangesPane {changes} bind:selectedId={selectedChangeId} onrevert={(c) => void revert(c)} onopeneditor={(c) => show(c.path)} />
              </div>
            {:else}
              <div class="gitpane" data-testid="code-git-pane">
                <div class="gitline" data-testid="code-git-summary">
                  {#if activeStatus}
                    <Icon name="session" /> On branch <b>{activeStatus.branch}</b>{#if activeStatus.ahead || activeStatus.behind}&nbsp;({activeStatus.ahead} ahead, {activeStatus.behind} behind){/if}
                    &mdash; {gitEntries.length === 0 ? 'working tree clean' : `${gitEntries.length} changed ${gitEntries.length === 1 ? 'file' : 'files'}`}
                  {:else}
                    Not a git repository.
                  {/if}
                </div>
                <ListView
                  columns={gitColumns}
                  rows={gitRows}
                  testid="code-git-list"
                  emptyText={activeStatus ? 'Nothing to commit.' : ''}
                  aria-label="Git status"
                  onactivate={(row) => show(row.id)}
                />
              </div>
            {/if}
          {/snippet}
        </TabControl>
      </DockPane>
    {/snippet}
    {#snippet center()}
      {#if showLogs}
        <SplitContainer orientation="horizontal" splitterDistance={175} panel1MinSize={120} panel2MinSize={110} fixedPanel="panel2">
          {#snippet panel1()}{@render editor()}{/snippet}
          {#snippet panel2()}{@render logs()}{/snippet}
        </SplitContainer>
      {:else}
        {@render editor()}
      {/if}
    {/snippet}
    {#if showManagement}
      <SplitContainer splitterDistance={200} panel1MinSize={130} panel2MinSize={260} fixedPanel="panel1">
        {#snippet panel1()}{@render management()}{/snippet}
        {#snippet panel2()}{@render center()}{/snippet}
      </SplitContainer>
    {:else}
      {@render center()}
    {/if}
  </div>
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text={active ?? 'Ready'} spring testid="code-status-path" />
    {#if editing}<StatusStripLabel text="Agent editing" borders={['left']} width={100} testid="code-status-editing" />{/if}
    {#if lineLabel}<StatusStripLabel text={lineLabel} borders={['left']} />{/if}
    {#if selection}<StatusStripLabel text="Selected {selection.startLine}-{selection.endLine}" borders={['left']} />{/if}
    {#if active}<StatusStripLabel text="Ln {caret.line}, Col {caret.col}" borders={['left']} width={96} testid="code-status-caret" />{/if}
    {#if active && text !== null}<StatusStripLabel text="UTF-8 / {eol}" borders={['left']} width={84} />{/if}
    {#if activeStatus}<StatusStripLabel text={formatBranch(activeStatus)} borders={['left']} width={130} testid="code-git-branch" />{/if}
    <StatusStripLabel text={language} borders={['left']} width={80} />
  </StatusStrip>
  {#if openDialog}
    <OpenFileDialog
      api={host.api}
      {desktopId}
      startPath={roots[0]?.path ?? ''}
      title="Open file"
      onopen={(path) => {
        openDialog = false
        show(path)
      }}
      onclose={() => (openDialog = false)}
    />
  {/if}
</div>

<style>
  .code {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
  }
  .code :global(.cb-tools) {
    height: 30px;
  }
  .code :global(.cb-tools .tb) {
    height: 24px;
    padding: 0 4px;
  }
  .editing {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px 2px 5px;
    color: #5c3b00;
    background: linear-gradient(#fff4c8, #ffe28a);
    border: 1px solid #d6b34a;
    border-radius: 2px;
  }
  .work {
    flex: 1;
    min-height: 0;
    display: flex;
    padding: 4px;
  }
  .work :global(.w7-split) {
    flex: 1;
  }
  .tree {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-window);
  }
  .editor {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .tabs {
    flex: none;
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 24px;
    padding: 0 4px;
    background: linear-gradient(#e9eff8, #d7e1f0);
    border: 1px solid var(--w7-list-border);
    border-bottom: 0;
    overflow: hidden;
  }
  .tab {
    display: flex;
    align-items: center;
    height: 21px;
    padding: 0 2px 0 4px;
    background: linear-gradient(#f4f7fb, #dbe4f1);
    border: 1px solid #98a8c0;
    border-bottom: 0;
    border-radius: 3px 3px 0 0;
  }
  .tab.on {
    height: 23px;
    background: var(--w7-window);
    border-top: 2px solid var(--w7-tab-accent);
  }
  .name,
  .x {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0 2px;
    border: 0;
    background: transparent;
    font: inherit;
    cursor: default;
  }
  .x {
    width: 16px;
    justify-content: center;
    color: #555;
    font-size: 14px;
  }
  .x:hover {
    color: #fff;
    background: #c4503e;
  }
  .mod {
    color: #c0302a;
    font-size: 9px;
    line-height: 1;
  }
  .peek-head {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 6px;
    background: linear-gradient(#f4f7fb, #dbe4f1);
    border-bottom: 1px solid #b6c4d8;
  }
  .peek-title {
    font-weight: 700;
    color: #1e395b;
  }
  .peek-spring {
    flex: 1;
  }
  .peek-lines {
    max-height: 110px;
    overflow: auto;
    font: var(--w7-font-mono);
    font-size: 12px;
  }
  .pl {
    display: flex;
    min-height: 17px;
    white-space: pre;
  }
  .pl code {
    font: inherit;
  }
  .pl .sign {
    flex: none;
    width: 18px;
    text-align: center;
    color: #777;
    user-select: none;
  }
  .pl.old {
    background: var(--w7-git-old-bg);
  }
  .pl.new {
    background: var(--w7-git-new-bg);
  }
  .gitpane {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .gitline {
    flex: none;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 6px;
    background: var(--w7-face);
    border-bottom: 1px solid var(--w7-border-light);
  }
  .view {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .view :global(.w7-codeviewer) {
    flex: 1;
  }
  .hint {
    flex: 1;
    padding: 8px;
    color: var(--w7-text-muted);
    background: var(--w7-window);
    border: 1px solid var(--w7-list-border);
  }
  .changes {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
  }
</style>

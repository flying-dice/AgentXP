<script lang="ts">
  import { tick, untrack } from 'svelte'
  import type { FileChangeDto } from '@shared/models'
  import type { ReviewFileDto } from '@shared/review'
  import { formatBranch, gitFileState, type GitLineChange, type GitStatusDto } from '@shared/git'
  import type { AskChatRequest, CodeSearchView } from '@shared/desktop'
  import type { TextMatchDto, TextSearchResultDto } from '@shared/search'
  import type { AppProps } from '../types'
  import ChangesPane from '../../app/shell/ChangesPane.svelte'
  import { attachLineSelect } from './lineSelect'
  import { openRecycleBin, restoreReverted } from '../../app/changes/openRecycleBin'
  import FileTree from '../../app/shell/FileTree.svelte'
  import Button from '../../kit/atoms/Button.svelte'
  import Icon from '../../kit/atoms/Icon.svelte'
  import Separator from '../../kit/atoms/Separator.svelte'
  import type { MenuDef, MenuItemDef } from '../../kit/molecules/MenuItem'
  import { closeItems, editItems, newChatItem } from '../../kit/molecules/standardMenu'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import AppAbout from '../shared/AppAbout.svelte'
  import { AppHelp } from '../shared/AppHelp.svelte'
  import { ContextMenu } from '../shared/ContextMenu.svelte'
  import { askChatItems, copyText } from '../shared/contextItems'
  import { selectionContext, useAppContext } from '../shared/appContext.svelte'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import CodeViewer from '../../kit/organisms/CodeViewer.svelte'
  import DiffViewer from '../../kit/organisms/DiffViewer.svelte'
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
  import { chatSessionIds, useDesktopStores } from '../sessionStores.svelte'
  import { ViewSync } from '../viewSync'
  import { closeTab, focusKey, isFocused, linesOf, managementFits, openTab, readLayout, reconcileTabs, sameRange, scrollTopForLine, toggleFocus, visibleRange, writeLayout, type Panes } from './codeModel'
  import { localStore } from '../../desktop/chatPane'
  import { chatStripHidden } from '../../desktop/chatStrip.svelte'
  import { treeMenu, treeToolbar, type TreeMenuTarget } from './codeContext'
  import DockPane from './DockPane.svelte'
  import CodeSearchPane from './CodeSearchPane.svelte'
  import { lookInItems, searchKey } from './codeSearch'
  import { GIT_STATE_WORD, NOT_A_GIT_REPOSITORY, TURN_ON_GIT_TEXT, anchorLine, changeAtLine, countsByPath, gitLinesLabel, gitRowTooltip, gitTabTitle, gitTabTooltip, indexGitStatus, marksOf, relativeToRoot, rowReviewPath, stepChange } from './gitModel'
  import { revertConfirmText } from '../../app/changes/changeFormat'
  import { refreshOnRevert } from '../../app/changes/refreshOnRevert'
  import { useRevertedChanges } from '../../app/changes/revertedChanges.svelte'
  import { useUncommittedChanges } from '../../app/changes/uncommitted.svelte'
  import type { FileTreeTarget } from '../../app/files/fileTree'

  let { window: win, host, focused = false }: AppProps<'code'> = $props()

  const desktopId = $derived(host.state.desktopId)
  /** The tree shows every plugged-in project; with none, the agent's home. */
  const roots = $derived.by(() => {
    const usb = sortDrives(host.state.drives).filter((d) => d.kind === 'removable')
    return usb.length > 0 ? usb.map((d) => ({ path: driveRoot(d.letter), name: driveTitle(d) })) : [{ path: host.state.home, name: vpathName(host.state.home) }]
  })
  /** At least one project is plugged in: with none the tree shows only the agent's home. */
  const hasProject = $derived(host.state.drives.some((d) => d.kind === 'removable'))
  const rootsKey = $derived(roots.map((r) => r.path).join('|'))

  let tabs = $state<string[]>([])
  let active = $state<string | null>(null)
  let visible = $state.raw<[number, number] | null>(null)
  let selection = $state.raw<{ startLine: number; endLine: number } | null>(null)
  let selectedChangeId = $state<number | null>(null)
  /** Docked panes (View menu): Management on the left, Changes and Git at the bottom. */
  let showManagement = $state(true)
  let showLogs = $state(true)
  let showRuler = $state(true)
  let mgmtTab = $state('projects')
  let logsTab = $state('changes')
  let openDialog = $state(false)
  // Git: the status of every drive's repository, the changes of the active file and the open peek.
  let gitStatuses = $state.raw<(GitStatusDto | null)[]>([])
  let lineChanges = $state.raw<GitLineChange[]>([])
  /** The lines added and removed per changed file, per project (the Git list's last column). */
  let gitCounts = $state.raw<{ root: string; counts: ReturnType<typeof countsByPath> }[]>([])
  /** The changed lines of every file in the Git list (the row's tooltip names them). */
  let gitHunks = $state.raw<Record<string, GitLineChange[]>>({})
  let peek = $state<number | null>(null)
  let caret = $state({ line: 1, col: 1 })
  let files = $state.raw<Record<string, { text: string | null; error: string | null }>>({})
  /** Lines the agent asked to reveal; highlighted until another file is shown. */
  let revealed = $state.raw<[number, number] | null>(null)
  let host_el = $state<HTMLDivElement | null>(null)
  let reportedVisible: [number, number] | null = null
  // The Search tab (find in files): the form, the search on screen (also in the view, for the agent) and its results.
  let searchQuery = $state('')
  let searchRegex = $state(false)
  let searchMatchCase = $state(false)
  let searchInclude = $state('')
  let searchRoot = $state('')
  let searchView = $state.raw<CodeSearchView | null>(null)
  let searchResult = $state.raw<TextSearchResultDto | null>(null)
  let searching = $state(false)
  let searchError = $state<string | null>(null)
  let searchByAgent = $state(false)
  const searchSync = new ViewSync<CodeSearchView | null>(searchKey)

  const sync = new ViewSync<{ tabs: string[]; activePath: string | null; visibleLines: [number, number] | null; selectedChangeId: number | null }>((v) =>
    JSON.stringify([v.tabs, v.activePath, v.visibleLines, v.selectedChangeId])
  )

  const syncedView = (): { tabs: string[]; activePath: string | null; visibleLines: [number, number] | null; selectedChangeId: number | null } => ({
    tabs: [...tabs],
    activePath: active,
    visibleLines: visible ? ([...visible] as [number, number]) : null,
    selectedChangeId
  })

  function report(): void {
    const view = syncedView()
    if (sync.report(view)) host.updateView(win.id, { app: 'code', ...view, selection, search: searchView })
  }

  /** Tells the view which search the Search tab shows, with the rest of the view as this window has it (never a stale copy). */
  function reportSearch(): void {
    if (!searchSync.report(searchView)) return
    const view = syncedView()
    sync.report(view)
    host.updateView(win.id, { app: 'code', ...view, selection, search: searchView })
  }

  // Everything the agents of this desktop did: all their changes and edit tool calls.
  // svelte-ignore state_referenced_locally
  const desktop = useDesktopStores(host)
  const stores = $derived(desktop.list)
  // A revert from anywhere updates the Changes list at once (UX-79).
  $effect(() => refreshOnRevert(host.api, desktopId, () => untrack(() => stores)))
  const allChanges = $derived<FileChangeDto[]>(stores.flatMap((s) => s.state.changes))
  // Only what is still uncommitted: a change leaves the list once Git lists its file as clean (folders without Git keep all).
  // svelte-ignore state_referenced_locally
  const uncommitted = useUncommittedChanges(host.api, () => desktopId, () => allChanges)
  const changes = $derived(uncommitted.list)
  // Files reverted by any chat of this desktop stay in the list after a reopen (UX-117).
  const revertedChanges = useRevertedChanges(
    host.api,
    () => desktopId,
    () => chatSessionIds(host),
    () => allChanges
  )
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

  /** The line changes of the files in the Git list, for the row tooltips (the first files only: a long list stays cheap). */
  const MAX_HUNK_FILES = 40
  async function hunksOf(paths: readonly string[]): Promise<Record<string, GitLineChange[]>> {
    const found = await Promise.all(paths.slice(0, MAX_HUNK_FILES).map(async (path) => [path, await host.api.git.lineChanges(desktopId, path).catch(() => [])] as const))
    return Object.fromEntries(found)
  }

  let refreshing = false
  let refreshAgain = false
  /** Status of every drive plus the active file's changes. Overlapping calls collapse into one more run. */
  async function refreshGit(): Promise<void> {
    void uncommitted.refresh()
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
        const rootsNow = untrack(() => roots)
        const counted = await Promise.all(
          rootsNow.map(async (r, i) => ({
            root: r.path,
            counts: countsByPath(next[i]?.entries.length ? await host.api.review.changes(desktopId, r.path, 'HEAD').catch(() => []) : [])
          }))
        )
        if (JSON.stringify(counted.map((c) => [c.root, [...c.counts]])) !== JSON.stringify(untrack(() => gitCounts).map((c) => [c.root, [...c.counts]]))) gitCounts = counted
        const hunks = await hunksOf(next.flatMap((s) => s?.entries.map((e) => e.path) ?? []))
        if (JSON.stringify(hunks) !== JSON.stringify(untrack(() => gitHunks))) gitHunks = hunks
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

  /** Runs a search and shows it in the Search tab: the user's (Search button, Enter) or the agent's (code_search). */
  let searchRun = 0
  async function runSearch(next: CodeSearchView): Promise<void> {
    const run = ++searchRun
    searchQuery = next.query
    searchRegex = next.regex
    searchMatchCase = next.matchCase
    searchInclude = next.include
    searchRoot = next.root
    searchView = next
    searchByAgent = next.by === 'agent'
    searching = true
    searchError = null
    try {
      const result = await host.api.vfs.searchText(desktopId, next.root, { query: next.query, regex: next.regex, matchCase: next.matchCase, include: next.include, limit: next.limit })
      if (run === searchRun) searchResult = result
    } catch (error) {
      if (run !== searchRun) return
      searchResult = null
      searchError = errorText(error)
    } finally {
      if (run === searchRun) searching = false
    }
  }

  /** The Search button: runs the form's search and tells the view (the agent sees what the user searched for). */
  function searchFromForm(): void {
    if (searchQuery === '') return
    const next: CodeSearchView = { query: searchQuery, root: searchRoot || roots[0]?.path || host.state.home, regex: searchRegex, matchCase: searchMatchCase, include: searchInclude.trim(), by: 'user' }
    void runSearch(next)
    reportSearch()
  }

  /** Find in files (Search menu, Ctrl+F): the Search tab, with the cursor in the search box. */
  async function findInFiles(): Promise<void> {
    if (focusMode) toggleFocusOnFile()
    showManagement = true
    mgmtTab = 'search'
    if (!searchRoot) searchRoot = active ? rootOf(active) : (roots[0]?.path ?? host.state.home)
    await tick()
    document.querySelector<HTMLInputElement>(`[data-window-id="${win.id}"] [data-testid="code-search-query"]`)?.focus()
  }

  /** A search result: the file opens with the matching line in view and highlighted. */
  function openMatch(m: TextMatchDto): void {
    show(m.path)
    revealed = [m.line, m.line]
    void reveal(m.line)
  }

  // The agent searched (code_search), or the window opens again: the search of the view shows in the Search tab (Management opens
  // when there is room for it).
  $effect(() => {
    const search = win.view.search ?? null
    if (!searchSync.isExternal(search) || search === null) return
    untrack(() => {
      mgmtTab = 'search'
      if (!showManagement && !focusMode) {
        autoChange = true
        showManagement = true
      }
      void runSearch(search)
    })
  })

  const scroller = (): HTMLElement | null => host_el?.querySelector<HTMLElement>('.xp-codeviewer .scroll') ?? null
  const lineHeight = (): number => host_el?.querySelector<HTMLElement>('.xp-codeviewer .row')?.offsetHeight || 17

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
    let detachLines = (): void => {}
    const onScroll = (): void => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    void tick().then(() => {
      el = scroller()
      el?.addEventListener('scroll', onScroll, { passive: true })
      el?.addEventListener('mouseup', readSelection)
      el?.addEventListener('keyup', readSelection)
      // A click or a drag in the line number column selects lines (UX-186).
      if (el) detachLines = attachLineSelect(el, readSelection)
      measure()
    })
    return () => {
      cancelAnimationFrame(frame)
      el?.removeEventListener('scroll', onScroll)
      el?.removeEventListener('mouseup', readSelection)
      el?.removeEventListener('keyup', readSelection)
      detachLines()
    }
  })

  async function revert(change: FileChangeDto): Promise<void> {
    const answer = await showMessageBox({
      text: revertConfirmText(change.path),
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

  /**
   * Focus on the file (toolbar button, View menu, F11, Ctrl+Shift+F): the chat pane, Management and Changes and Git close
   * together and the file has the whole window. The same control then reads "Show panes" and brings back what was open.
   */
  let appWidth = $state(0)
  let squeezed = $state(false)
  let overridden = false
  let autoChange = false
  const panes = $derived<Panes>({ management: showManagement, logs: showLogs, chat: host.chatPaneOpen(win.id) })
  const focusMode = $derived(isFocused(panes))
  const allPanelsOpen = $derived(showManagement && showLogs && panes.chat)
  let restorePanes = $state.raw<Panes | null>(null)
  function setPanes(next: Panes): void {
    // "Show panes" asks for every pane at once: that is the user's choice, so the squeeze below leaves Management open (UX-210).
    if (next.chat && next.management) overridden = true
    showManagement = next.management
    showLogs = next.logs
    if (next.chat !== host.chatPaneOpen(win.id)) host.toggleChatPane(win.id)
  }
  // Focus mode hides the collapsed chat strip too; the Focus-mode bar has the way back to the chat (UX-153).
  $effect(() => {
    const id = win.id
    if (focusMode) chatStripHidden.add(id)
    else chatStripHidden.delete(id)
    return () => void chatStripHidden.delete(id)
  })
  // With the chat pane open the editor keeps at least EDITOR_MIN_WIDTH: Management closes when the room is short and returns when the
  // chat pane closes (UX-210). A click on Management while the chat pane is open is the user's choice and is never undone.
  $effect(() => {
    const open = panes.chat
    const width = appWidth
    untrack(() => {
      if (!open) {
        if (squeezed) {
          autoChange = true
          showManagement = true
          squeezed = false
        }
        overridden = false
      } else if (!overridden && !squeezed && showManagement && !managementFits(width)) {
        autoChange = true
        showManagement = false
        squeezed = true
      }
    })
  })
  $effect(() => {
    void showManagement
    untrack(() => {
      if (autoChange) autoChange = false
      else if (panes.chat) {
        overridden = true
        squeezed = false
      }
    })
  })
  /** Focus mode, "Chat": opens the chat pane, which ends Focus mode. */
  const openChatFromFocus = (): void => host.toggleChatPane(win.id)
  function toggleFocusOnFile(): void {
    const next = toggleFocus(panes, restorePanes)
    restorePanes = next.remembered
    setPanes(next.panes)
  }
  function showAllPanels(): void {
    restorePanes = null
    setPanes({ management: true, logs: true, chat: true })
  }

  // The window remembers its panes (and what Show panes brings back) for as long as the window lives on this computer.
  // svelte-ignore state_referenced_locally
  const layoutKey = focusKey(desktopId, win.id)
  // svelte-ignore state_referenced_locally
  const remembered = readLayout(localStore(), layoutKey)
  // svelte-ignore state_referenced_locally
  showManagement = remembered.management
  // svelte-ignore state_referenced_locally
  showLogs = remembered.logs
  // svelte-ignore state_referenced_locally
  restorePanes = remembered.restore
  $effect(() => {
    writeLayout(localStore(), layoutKey, { management: showManagement, logs: showLogs, restore: restorePanes })
  })

  /**
   * F11 and Ctrl+Shift+F (focus on the file) and Ctrl+F (find in files) work from the whole window, also after the panes
   * closed and took the keyboard focus with them.
   */
  function onFocusKey(event: KeyboardEvent): void {
    if (!focused || event.altKey) return
    const f11 = event.key === 'F11' && !event.ctrlKey && !event.shiftKey
    const ctrlF = event.key.toLowerCase() === 'f' && event.ctrlKey
    if (ctrlF && !event.shiftKey) {
      event.preventDefault()
      void findInFiles()
      return
    }
    if (!f11 && !ctrlF) return
    event.preventDefault()
    toggleFocusOnFile()
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'F5' && event.altKey) {
      event.preventDefault()
      step(event.shiftKey ? -1 : 1)
    } else if (event.key === 'Escape' && peek !== null) peek = null
  }

  // ---- menu, lists -------------------------------------------------------------------------------

  /** Review changes: asks what to review, with the project of the open file preselected. */
  function reviewChanges(): void {
    host.chooseReview(active)
  }

  /** The project root of a path: its drive. */
  const rootOf = (path: string): string => {
    const drive = parseVPath(path)?.drive
    return drive ? driveRoot(drive) : (roots[0]?.path ?? host.state.home)
  }

  /** Show changes: Code Review on the file against HEAD. Read only; the window starts no agent. The row's file is chosen before the window opens. */
  async function showChanges(path: string): Promise<void> {
    const root = rootOf(path)
    try {
      await host.api.desktop.openReview(desktopId, root, undefined, undefined, relativeToRoot(root, path) ?? undefined)
    } catch (error) {
      await showMessageBox({ text: errorText(error), caption: 'Code', buttons: 'OK', icon: 'error' })
    }
  }

  /**
   * One click on a Git row shows its diff in the pane below the list; no window opens (UX-168). A double click or Enter opens
   * Code Review on the file, and the status line says so while the window opens.
   */
  let gitPreview = $state.raw<{ path: string; file: ReviewFileDto | null } | null>(null)
  async function previewRow(id: string): Promise<void> {
    const path = rowReviewPath(gitRows, id)
    if (!path) return
    gitPreview = { path, file: null }
    const root = rootOf(path)
    const relative = relativeToRoot(root, path)
    const file = relative ? await host.api.review.file(desktopId, root, 'HEAD', relative).catch(() => null) : null
    if (gitPreview?.path === path) gitPreview = { path, file }
  }
  // A preview of a file that left the list (committed, reverted) goes away with its row.
  $effect(() => {
    const open = gitPreview?.path
    if (open && !gitRows.some((r) => r.id === open)) untrack(() => (gitPreview = null))
  })
  let openingReview = $state(false)
  function openReviewRow(id: string): void {
    const path = rowReviewPath(gitRows, id)
    if (!path) return
    openingReview = true
    void showChanges(path).finally(() => setTimeout(() => (openingReview = false), 1500))
  }

  async function plugIn(): Promise<void> {
    try {
      const drive = await host.plugInProject()
      if (drive) tree?.select(driveRoot(drive.letter)) // the tree shows the new project and selects it (UX-181)
    } catch (error) {
      await showMessageBox({ text: errorText(error), caption: 'Code', buttons: 'OK', icon: 'error' })
    }
  }

  /** The project to eject: the one of the open file, else the first plugged-in project. */
  const ejectable = $derived.by(() => {
    const drive = (active ? parseVPath(active)?.drive : undefined) ?? roots.map((r) => parseVPath(r.path)?.drive).find(Boolean)
    return drive && host.state.drives.some((d) => d.letter === drive && d.kind === 'removable') ? drive : null
  })

  async function initGit(): Promise<void> {
    const root = activeRoot()
    const answer = await showMessageBox({
      text: TURN_ON_GIT_TEXT,
      caption: 'Code',
      icon: 'question',
      actions: [
        { id: 'turn-on', label: 'Turn on' },
        { id: 'cancel', label: 'Cancel' }
      ],
      defaultButton: 1
    })
    if (answer !== 'turn-on') return
    try {
      await host.api.git.init(desktopId, root)
      await refreshGit()
    } catch (error) {
      await showMessageBox({ text: errorText(error), caption: 'Code', buttons: 'OK', icon: 'error' })
    }
  }
  /** The project of the open file, else the first project. */
  const activeRoot = (): string => (active ? rootOf(active) : (roots[0]?.path ?? host.state.home))

  // ---- the project tree: context menus ---------------------------------------------------------
  let tree = $state<{ expand(path: string): void; select(path: string): void } | null>(null)
  /** The row selected in the tree: the buttons above the tree act on it. */
  let treeTarget = $state<FileTreeTarget | null>(null)
  const treeBar = $derived.by(() => {
    const letter = treeTarget?.kind === 'project' ? parseVPath(treeTarget.path)?.drive : undefined
    const removable = letter !== undefined && host.state.drives.some((d) => d.letter === letter && d.kind === 'removable')
    return treeToolbar(treeTarget, activeRoot(), removable)
  })
  /** New chat here: a chat that works in the selected project or folder (the folder of the open file when nothing is selected). */
  const newChatHere = (): void => void host.startChat(treeBar.chatFolder)
  /** Remove from desktop: takes the selected project off the desktop; its folder stays on the disk. */
  const removeSelectedProject = (): void => {
    const letter = treeTarget ? parseVPath(treeTarget.path)?.drive : undefined
    if (letter) void host.ejectDrive(letter)
  }

  function treeContext(event: MouseEvent, target: FileTreeTarget | null): void {
    const kind: TreeMenuTarget = target ? target.kind : 'empty'
    const path = target?.path ?? ''
    const letter = path ? parseVPath(path)?.drive : undefined
    const canEject = letter !== undefined && host.state.drives.some((d) => d.letter === letter && d.kind === 'removable')
    ctx.show(
      event,
      treeMenu(
        kind,
        {
          open: () => (kind === 'file' ? show(path) : tree?.expand(path)),
          startChat: () => void host.startChat(path),
          openInExplorer: () => void host.openApp({ app: 'explorer', path }),
          openWithNotepad: () => void host.openApp({ app: 'notepad', path }),
          copyPath: () => copyText(path),
          askAboutFile: () => void host.askChat({ app: 'code', windowId: win.id, kind: 'ask', path }),
          eject: () => letter && void host.ejectDrive(letter),
          plugIn: () => void plugIn()
        },
        { canEject }
      )
    )
  }

  // svelte-ignore state_referenced_locally
  const help = new AppHelp(host, 'code')
  const ctx = new ContextMenu()

  /** The text selected in the editor (the viewer is plain DOM text), '' outside it. */
  function selectedText(): string {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !host_el || !sel.anchorNode || !host_el.contains(sel.anchorNode)) return ''
    return sel.toString()
  }
  const copySelection = (): void => void document.execCommand('copy')
  const selectAllText = (): void => {
    const code = host_el?.querySelector('.xp-codeviewer .scroll')
    if (code) window.getSelection()?.selectAllChildren(code)
  }

  function ask(kind: AskChatRequest['kind'], selected: string): void {
    void host.askChat({
      app: 'code',
      windowId: win.id,
      kind,
      ...(active ? { path: active } : {}),
      ...(selected ? { text: selected } : {}),
      range: selection ?? { startLine: caret.line, endLine: caret.line }
    })
  }

  /** Cut, Copy, Paste, Select All (the viewer is read only), Revert hunk when on a hunk, Go to file and the Ask the agent group. */
  const contextItems = (): MenuItemDef[] => {
    const selected = quotedText()
    const hasSelection = selected !== ''
    return [
      ...editItems('code-ctx', { cut: () => {}, copy: copySelection, paste: () => {}, selectAll: selectAllText }, { hasSelection, readOnly: true }),
      ...(revertTarget !== null ? [{ separator: true } as MenuItemDef, { id: 'code-ctx-revert-hunk', testid: 'code-ctx-revert-hunk', label: '&Revert hunk...', icon: 'recycle', action: () => void revertHunk(revertTarget) } as MenuItemDef] : []),
      { separator: true },
      { id: 'code-ctx-goto-file', testid: 'code-ctx-goto-file', label: '&Go to file...', icon: 'open-folder', shortcut: 'Ctrl+O', action: () => (openDialog = true) },
      ...askChatItems('code', { hasSelection, ask: (kind) => ask(kind, selected) })
    ]
  }

  /** The text of the selected lines: the DOM selection is gone once the focus moved to the chat pane, the range stays. */
  /** What a question about the selection quotes: the whole lines the status bar names, never half a line (UX-210). */
  const quotedText = (): string => (selection ? linesOf(text, selection) : selectedText())

  // The chat pane knows the open file, all tabs, the selection and the git status of the file.
  // svelte-ignore state_referenced_locally
  useAppContext(host, () => win.id, () => ({
    openFile: active,
    openTabs: [...tabs],
    ...selectionContext(quotedText(), selection),
    ...(active ? { gitStatus: stateOf(active), changedLines: lineChanges.length } : {})
  }))

  const menus = $derived<MenuDef[]>([
    {
      label: '&File',
      items: [
        newChatItem('code', () => void host.startDefaultChat()),
        { id: 'code-new-chat-here', testid: 'code-menu-new-chat-here', label: 'New chat &here', icon: 'session', title: 'Start a chat that works in the selected project or folder', action: newChatHere },
        { separator: true },
        { id: 'code-open', label: '&Open...', icon: 'open-folder', shortcut: 'Ctrl+O', action: () => (openDialog = true) },
        { separator: true },
        { id: 'code-plug-in', testid: 'code-menu-plug-in', label: '&Plug in a folder...', icon: 'plus', action: () => void plugIn() },
        { id: 'code-eject', testid: 'code-menu-eject', label: 'Remo&ve project from desktop...', icon: 'usb', disabled: ejectable === null, action: () => ejectable && void host.ejectDrive(ejectable) },
        { separator: true },
        { id: 'code-close-file', label: '&Close file', disabled: active === null, action: () => active && close(active) },
        { id: 'code-close-all', label: 'Close &all files', disabled: tabs.length === 0, action: () => [...tabs].forEach(close) },
        ...closeItems('code', () => void host.closeWindow(win.id))
      ]
    },
    {
      label: '&Edit',
      items: [
        { id: 'code-copy', label: '&Copy', icon: 'copy', shortcut: 'Ctrl+C', action: copySelection },
        { id: 'code-select-all', label: 'Select &All', shortcut: 'Ctrl+A', action: selectAllText },
        { separator: true },
        { id: 'code-revert-hunk', label: '&Revert hunk...', disabled: revertTarget === null, action: () => void revertHunk(revertTarget) }
      ]
    },
    {
      label: '&View',
      items: [
        { id: 'code-view-management', label: '&Management', checked: showManagement, action: () => (showManagement = !showManagement) },
        { id: 'code-view-logs', label: '&Changes and Git', checked: showLogs, action: () => (showLogs = !showLogs) },
        { id: 'code-view-ruler', label: '&Overview ruler', checked: showRuler, action: () => (showRuler = !showRuler) },
        { separator: true },
        { id: 'code-view-focus', testid: 'code-menu-focus', label: '&Focus on the file', shortcut: 'F11', disabled: focusMode, action: toggleFocusOnFile },
        { id: 'code-view-show-all', testid: 'code-menu-show-all', label: 'Show all &panels', disabled: allPanelsOpen, action: showAllPanels },
        { separator: true },
        help.paneItem(win.id)
      ]
    },
    {
      label: '&Search',
      items: [
        { id: 'code-search-find-in-files', testid: 'code-menu-find-in-files', label: '&Find in files...', icon: 'search', shortcut: 'Ctrl+F', action: () => void findInFiles() },
        { separator: true },
        { id: 'code-next-change', label: '&Next change', icon: 'chevron-down', shortcut: 'Alt+F5', disabled: lineChanges.length === 0, action: () => step(1) },
        { id: 'code-prev-change', label: '&Previous change', icon: 'chevron-up', shortcut: 'Shift+Alt+F5', disabled: lineChanges.length === 0, action: () => step(-1) }
      ]
    },
    {
      label: '&Tools',
      items: [
        { id: 'code-refresh', label: '&Refresh Git status', icon: 'refresh', action: () => void refreshGit() },
        { id: 'code-review-changes', testid: 'code-menu-review', label: 'Re&view changes', icon: 'changes', action: () => void reviewChanges() }
      ]
    },
    help.menu()
  ])

  const mgmtTabs = [
    { id: 'projects', title: 'Projects', testid: 'code-mgmt-tab-projects' },
    { id: 'files', title: 'Files', testid: 'code-mgmt-tab-files' },
    { id: 'search', title: 'Search', testid: 'code-mgmt-tab-search' }
  ]
  // One place to review changes: the Changes tab is the same pane the chat window shows (UX-40).
  const logTabs = $derived([
    { id: 'changes', title: changes.length > 0 ? `Changes (${changes.length})` : 'Changes', tooltip: 'The files an agent changed', testid: 'code-logs-tab-changes' },
    { id: 'git', title: gitTabTitle(gitEntries.length), tooltip: gitTabTooltip(gitEntries.length), testid: 'code-logs-tab-git' }
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
        status: state ? GIT_STATE_WORD[state] : changedPaths.includes(path) ? 'Agent changed' : ''
      })
    }
    return rows
  })
  const fileColumns: ListColumn[] = [
    { key: 'name', header: 'File' },
    { key: 'status', header: 'State', width: 84 }
  ]
  const countsOf = (path: string): { additions: number; deletions: number } | undefined => {
    for (const { root, counts } of gitCounts) {
      const rel = relativeToRoot(root, normaliseVPath(path) ?? path)
      const found = rel ? counts.get(rel) : undefined
      if (found) return found
    }
    return undefined
  }
  const gitRows = $derived<ListRow[]>(
    gitEntries.map((e) => {
      const state = gitFileState(e)
      return {
        id: e.path,
        testid: 'code-git-entry',
        icon: 'file-code',
        attrs: { 'data-path': e.path, 'data-git-status': state },
        text: GIT_STATE_WORD[state],
        file: e.path,
        lines: gitLinesLabel(countsOf(e.path)),
        tooltip: gitRowTooltip(vpathName(e.path), gitHunks[e.path])
      }
    })
  )
  const gitColumns: ListColumn[] = [
    { key: 'text', header: 'Status', width: 90 },
    { key: 'file', header: 'File' },
    { key: 'lines', header: 'Lines', width: 84, align: 'right' }
  ]

  /** Git list: double-click and the menu show the change (Code Review against the last commit) or open the file. */
  const gitRowMenu = (row: ListRow, event: MouseEvent): void =>
    ctx.show(event, [
      { id: 'code-git-ctx-show', testid: 'code-git-ctx-show', label: '&Show changes', icon: 'changes', action: () => openReviewRow(row.id) },
      { id: 'code-git-ctx-open', testid: 'code-git-ctx-open', label: '&Open file', icon: 'file-code', disabled: gitRows.find((r) => r.id === row.id)?.text === GIT_STATE_WORD.deleted, action: () => show(row.id) }
    ])
  const eol = $derived(text === null ? '' : text.includes('\r\n') ? 'CRLF' : 'LF')

  const highlightLines = $derived(revealed ? Array.from({ length: Math.min(80, revealed[1] - revealed[0] + 1) }, (_, i) => revealed![0] + i) : [])
  // The selected lines stay marked when the focus moves away (to the chat pane, for "Ask about selection"); while the code has the
  // focus the browser draws its own selection (UX-126).
  let codeFocused = $state(false)
  const selectedLines = $derived(selection && !codeFocused ? Array.from({ length: Math.min(400, selection.endLine - selection.startLine + 1) }, (_, i) => selection!.startLine + i) : [])
  const language = $derived(active ? languageFromPath(active) : 'text')
  /** "Line 1 of 6": short enough that the status bar never cuts it. */
  const lineLabel = $derived(active && text !== null ? `Line ${caret.line} of ${totalLines}` : '')
</script>

<svelte:window onkeydown={onFocusKey} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="code" data-testid="code-app" bind:clientWidth={appWidth} onkeydown={(e) => (ctx.key(e, contextItems), onKeydown(e))} oncontextmenu={(e) => ctx.show(e, contextItems())}>
  <MenuStrip {menus} aria-label="Code menu" />
  <ContextMenuStrip bind:open={ctx.open} x={ctx.x} y={ctx.y} items={ctx.items} label="Code" />
  <AppAbout {help} />
  <ToolStrip aria-label="Code toolbar" class="cb-tools">
    <ToolStripButton data-testid="code-open" icon="open-folder" title="Open a file (Ctrl+O)" aria-label="Open a file" onclick={() => (openDialog = true)} />
    <Separator orientation="vertical" />
    <ToolStripButton data-testid="code-prev-change" icon="chevron-up" aria-label="Previous change" title={lineChanges.length === 0 ? 'The open file has no changes to step through.' : 'Previous change (Shift+Alt+F5)'} disabled={lineChanges.length === 0} onclick={() => step(-1)} />
    <ToolStripButton data-testid="code-next-change" icon="chevron-down" aria-label="Next change" title={lineChanges.length === 0 ? 'The open file has no changes to step through.' : 'Next change (Alt+F5)'} disabled={lineChanges.length === 0} onclick={() => step(1)} />
    <ToolStripButton data-testid="code-toolbar-revert-hunk" icon="recycle" title={revertTarget === null ? 'Select a changed line in the file first.' : 'Revert hunk'} aria-label="Revert hunk" disabled={revertTarget === null} onclick={() => void revertHunk(revertTarget)} />
    <Separator orientation="vertical" />
    <ToolStripButton data-testid="code-ask-selection" icon="session" text="Ask about selection" title={selection ? 'Ask the chat about the lines you selected' : 'Select some lines of the file first'} disabled={active === null || selection === null} onclick={() => ask('ask', quotedText())} />
    <Separator orientation="vertical" />
    <ToolStripButton data-testid="code-refresh" icon="refresh" title="Refresh git status" aria-label="Refresh git status" onclick={() => void refreshGit()} />
    <ToolStripButton data-testid="code-review-changes" icon="changes" text="Review changes" title="Look at the changes of this project. Nothing starts until you ask the agent to review." onclick={() => void reviewChanges()} />
    <ToolStripButton text="Management" icon="folder" bind:checked={showManagement} checkOnClick data-testid="code-management-toggle" title="Show or hide the Management pane" />
    <ToolStripButton text={changes.length > 0 ? `Changes and Git (${changes.length})` : 'Changes and Git'} icon="changes" bind:checked={showLogs} checkOnClick data-testid="code-changes-toggle" title="Show or hide the Changes and Git pane" />
    {#snippet trailing()}
      {#if focusMode}
        <ToolStripButton data-testid="code-focus-chat" icon="session" text="Chat" title="Bring back the chat pane (Ctrl+Shift+C)" onclick={openChatFromFocus} />
      {/if}
      {#if editing}
        <span class="editing" data-testid="code-editing" role="status"><Icon name="edit" /> Agent is editing {active ? vpathName(active) : ''}</span>
      {/if}
      <ToolStripButton
        data-testid="code-focus-toggle"
        data-focused={focusMode}
        icon={focusMode ? 'folder' : 'open-folder'}
        text={focusMode ? 'Show panes' : 'Focus on the file'}
        title={focusMode ? 'Bring back the chat, Management and Changes and Git panes (F11)' : 'Hide the chat, Management and Changes and Git panes so that the file has the whole window (F11)'}
        onclick={toggleFocusOnFile}
      />
    {/snippet}
  </ToolStrip>
  <div class="work">
    {#snippet management()}
      <DockPane title="Management" testid="code-management" onclose={() => (showManagement = false)}>
        <TabControl tabs={mgmtTabs} bind:selected={mgmtTab} aria-label="Management">
          {#snippet panel(tab)}
            {#if tab.id === 'projects'}
              <ToolStrip aria-label="Project tools" class="tree-tools">
                <ToolStripButton data-testid="code-tree-new-chat" icon="session" text="New chat here" title="Start a chat that works in the selected project or folder" onclick={newChatHere} />
                <ToolStripButton data-testid="code-tree-plug-in" icon="plus" text="Plug in a folder" title="Give the agent a folder of your computer to work on" onclick={() => void plugIn()} />
                <ToolStripButton data-testid="code-tree-remove" icon="usb" text="Remove from desktop" disabled={!treeBar.removable} title={treeBar.removable ? 'Take the selected project off the desktop. Its folder stays on your disk.' : 'Select a project first: click a project in the tree to take it off the desktop.'} onclick={removeSelectedProject} />
              </ToolStrip>
              {#if !hasProject}
                <div class="plug-hint" data-testid="code-tree-empty">
                  No project is plugged in yet.
                  <button type="button" class="plug-link" data-testid="code-tree-empty-plug-in" onclick={() => void plugIn()}>Plug in a folder</button>
                </div>
              {/if}
              <div class="tree" data-testid="code-tree" role="presentation" oncontextmenu={(e) => treeContext(e, null)}>
                {#key rootsKey}
                  <FileTree bind:this={tree} bind:selectedTarget={treeTarget} {roots} readDir={(p) => host.api.vfs.readDir(desktopId, p)} {changedPaths} git={gitIndex} onopen={show} oncontextmenu={(target, e) => treeContext(e, target)} />
                {/key}
              </div>
            {:else if tab.id === 'search'}
              <CodeSearchPane
                bind:query={searchQuery}
                bind:regex={searchRegex}
                bind:matchCase={searchMatchCase}
                bind:include={searchInclude}
                bind:root={searchRoot}
                lookIn={lookInItems(roots, searchRoot)}
                result={searchResult}
                {searching}
                error={searchError}
                byAgent={searchByAgent}
                onsearch={searchFromForm}
                onopen={openMatch}
              />
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
        <!-- The close buttons sit beside the names, so the strip is a group of buttons, not a tab list. -->
        <div class="tabs" role="group" aria-label="Open files">
          {#each tabs as tab (tab)}
            <div class="tab" class:on={tab === active} role="presentation" data-testid="code-tab" data-path={tab} data-git-status={stateOf(tab)}>
              <button class="name" data-testid="code-tab-name" aria-current={tab === active ? 'true' : undefined} title={tab} onclick={() => show(tab)}>
                <Icon name="file-code" />{vpathName(tab)}{#if changedPaths.includes(tab) || stateOf(tab) !== 'none'}<span class="mod" title="Modified">&#9679;</span>{/if}
              </button>
              <button class="x" data-testid="code-tab-close" aria-label="Close {vpathName(tab)}" onclick={() => close(tab)}>&times;</button>
            </div>
          {/each}
        </div>
        <div class="view" data-testid="code-editor" data-path={active} bind:this={host_el} onfocusin={() => (codeFocused = true)} onfocusout={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && (codeFocused = false)}>
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
                selectedLines={selectedLines}
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
      <DockPane title="Changes and Git" testid="code-logs" onclose={() => (showLogs = false)}>
        <TabControl tabs={logTabs} bind:selected={logsTab} aria-label="Changes and Git">
          {#snippet panel(tab)}
            {#if tab.id === 'changes'}
              <div class="changes" data-testid="code-changes">
                <ChangesPane {changes} gitCount={gitEntries.length} gitTracked={gitStatuses.length > 0 ? gitStatuses.some((s) => s !== null) : undefined} onopengit={() => (logsTab = 'git')} reverted={revertedChanges.list} layoutKey={`code-${win.id}`} bind:selectedId={selectedChangeId} onrevert={(c) => revert(c)} onopeneditor={(c) => show(c.path)} onopenrecyclebin={(id) => void openRecycleBin(host, id)} onrestore={(id) => restoreReverted(host, id)} />
              </div>
            {:else}
              <div class="gitpane" data-testid="code-git-pane">
                <div class="gitline" data-testid="code-git-summary">
                  {#if activeStatus}
                    <Icon name="session" /> On branch <b>{activeStatus.branch}</b>{#if activeStatus.ahead || activeStatus.behind}&nbsp;({activeStatus.ahead} ahead, {activeStatus.behind} behind){/if}
                    &mdash; {gitEntries.length === 0 ? 'no changes since the last commit' : `${gitEntries.length} changed ${gitEntries.length === 1 ? 'file' : 'files'}`}
                  {:else}
                    <span data-testid="code-git-not-repo">{NOT_A_GIT_REPOSITORY}</span>
                    <Button data-testid="code-git-init" onclick={() => void initGit()}>Turn on Git here...</Button>
                  {/if}
                </div>
                <ListView
                  columns={gitColumns}
                  rows={gitRows}
                  testid="code-git-list"
                  emptyText={activeStatus ? 'Nothing to commit.' : ''}
                  aria-label="Git status"
                  onselect={(ids) => ids[0] && void previewRow(ids[0])}
                  onactivate={(row) => openReviewRow(row.id)}
                  oncontextmenu={gitRowMenu}
                />
                <div class="gitdiff" data-testid="code-git-preview" data-path={gitPreview?.path ?? ''}>
                  {#if gitPreview?.file}
                    {#key gitPreview.path}
                      <DiffViewer oldText={gitPreview.file.oldText} newText={gitPreview.file.newText} fileName={gitPreview.path} toolbar={false} wrap label="Changes in {gitPreview.path}" />
                    {/key}
                  {:else if gitPreview}
                    <div class="hint" data-testid="code-git-preview-hint">Loading the changes...</div>
                  {:else}
                    <div class="hint" data-testid="code-git-preview-hint">Click a file to see what changed. Double-click it to open Code Review.</div>
                  {/if}
                </div>
              </div>
            {/if}
          {/snippet}
        </TabControl>
      </DockPane>
    {/snippet}
    {#snippet center()}
      {#if showLogs}
        <SplitContainer orientation="horizontal" splitterDistance={120} panel1MinSize={100} panel2MinSize={110} fixedPanel="panel2">
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
    <StatusStripLabel text={openingReview ? 'Opening Review...' : (active ?? 'Ready')} spring testid="code-status-path" />
    {#if editing}<StatusStripLabel text="Agent editing" borders={['left']} width={100} testid="code-status-editing" />{/if}
    {#if lineLabel}<StatusStripLabel text={lineLabel} borders={['left']} />{/if}
    {#if selection}<StatusStripLabel text="Selected {selection.startLine}-{selection.endLine}" borders={['left']} testid="code-status-selected" />{:else if active}<StatusStripLabel text="Select some lines first" borders={['left']} width={150} testid="code-status-select-hint" />{/if}
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
    background: var(--xp-face);
  }
  .code :global(.cb-tools) {
    height: auto;
    min-height: 30px;
    flex-wrap: wrap;
    padding-top: 2px;
    padding-bottom: 2px;
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
  .work :global(.xp-split) {
    flex: 1;
  }
  .work :global(.tree-tools) {
    flex: none;
    height: auto;
    min-height: 26px;
    flex-wrap: wrap;
  }
  .plug-hint {
    flex: none;
    padding: 4px 6px;
    color: var(--xp-text-muted);
    background: var(--xp-window);
    border-bottom: 1px solid var(--xp-list-border);
  }
  .plug-link {
    min-height: 24px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--xp-link);
    font: inherit;
    text-decoration: underline;
    cursor: default;
  }
  .tree {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--xp-window);
  }
  .editor {
    flex: 1;
    min-width: 0;
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
    height: 28px;
    padding: 0 4px;
    background: linear-gradient(#e9eff8, #d7e1f0);
    border: 1px solid var(--xp-list-border);
    border-bottom: 0;
    overflow: hidden;
  }
  .tab {
    display: flex;
    align-items: center;
    height: 25px;
    padding: 0 2px 0 4px;
    background: linear-gradient(#f4f2e8, #dbe4f1);
    border: 1px solid #98a8c0;
    border-bottom: 0;
    border-radius: 3px 3px 0 0;
  }
  .tab.on {
    height: 27px;
    background: var(--xp-window);
    border-top: 2px solid var(--xp-tab-accent);
  }
  .name,
  .x {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 24px;
    padding: 0 2px;
    border: 0;
    background: transparent;
    font: inherit;
    cursor: default;
  }
  .x {
    width: 24px;
    height: 24px;
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
    background: linear-gradient(#f4f2e8, #dbe4f1);
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
    font: var(--xp-font-mono);
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
    background: var(--xp-git-old-bg);
  }
  .pl.new {
    background: var(--xp-git-new-bg);
  }
  .gitpane {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  /* The diff of the clicked row: half of the pane, so the list keeps its rows. */
  .gitdiff {
    flex: 1;
    min-height: 60px;
    display: flex;
    flex-direction: column;
    overflow: auto;
    background: var(--xp-window);
    border: 1px solid var(--xp-list-border);
  }
  .gitdiff :global(.xp-diffviewer) {
    flex: 1;
  }
  .gitpane :global(.xp-listview) {
    flex: 1;
    min-height: 60px;
  }
  .gitline {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    padding: 3px 6px;
    background: var(--xp-face);
    border-bottom: 1px solid var(--xp-border-light);
  }
  .view {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .view :global(.xp-codeviewer) {
    flex: 1;
  }
  .hint {
    flex: 1;
    padding: 8px;
    color: var(--xp-text-muted);
    background: var(--xp-window);
    border: 1px solid var(--xp-list-border);
  }
  .changes {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--xp-face);
  }
</style>

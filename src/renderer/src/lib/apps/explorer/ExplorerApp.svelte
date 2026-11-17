<script lang="ts">
  import { untrack } from 'svelte'
  import { SvelteMap } from 'svelte/reactivity'
  import type { Id } from '@shared/models'
  import { normaliseVPath, vpathParent, type DriveDto, type VfsEntryDto, type VPath } from '@shared/vfs'
  import type { AppProps } from '../types'
  import ToolTip from '../../kit/atoms/ToolTip.svelte'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import ListView from '../../kit/organisms/ListView.svelte'
  import type { ListColumn, ListRow } from '../../kit/organisms/ListView'
  import SplitContainer from '../../kit/organisms/SplitContainer.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import TreeView from '../../kit/organisms/TreeView.svelte'
  import type { TreeNodeData } from '../../kit/organisms/TreeView'
  import type { MenuDef, MenuItemDef } from '../../kit/molecules/MenuItem'
  import { closeItems, menuBar, newChatItem } from '../../kit/molecules/standardMenu'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import AppAbout from '../shared/AppAbout.svelte'
  import { AppHelp } from '../shared/AppHelp.svelte'
  import { ContextMenu } from '../shared/ContextMenu.svelte'
  import { copyText } from '../shared/contextItems'
  import { backgroundItems, defaultOpener, driveItems, driveProperties, entryItems, projectCountText, propertiesText } from './explorerContext'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { useDesktopStores } from '../sessionStores.svelte'
  import { errorText } from '../shared/listing'
  import { firstReason } from '../../kit/atoms/reason'
  import { NOTHING_REMOVED_TIP } from '../../desktop/projectDrives'
  import { opensInNotepad, typeName } from '../paths'
  import { useAppContext } from '../shared/appContext.svelte'
  import { ViewSync } from '../viewSync'
  import { deriveAgentStatus, statusLabelFor } from './agentStatus'
  import AddressBar from './AddressBar.svelte'
  import ExplorerSearchPane from './ExplorerSearchPane.svelte'
  import { SEARCH_COLUMNS, defaultLookIn, explorerSearchKey, searchLookIn, searchRows, searchStatus } from './explorerSearch'
  import type { ExplorerSearchView } from '@shared/desktop'
  import type { FileFindResultDto } from '@shared/search'
  import ComputerView from './ComputerView.svelte'
  import { breadcrumbs, driveGroups, driveRoot, driveTitle, favourites, libraries, parseAddress, upPath } from './explorerModel'

  let { window: win, host }: AppProps<'explorer'> = $props()

  const desktopId = $derived(host.state.desktopId)
  const drives = $derived(host.state.drives)
  const home = $derived(host.state.home)
  const favs = $derived(favourites(home))
  const libs = $derived(libraries(home))

  const DIR = 'p:'
  const treeIdOf = (path: VPath): string => `${DIR}${path}`
  const ancestors = (path: VPath | ''): VPath[] => breadcrumbs(path, []).slice(1).map((c) => c.path as VPath)

  /** '' is Computer. */
  let path = $state<VPath | ''>('')
  let selected = $state<string[]>([])
  let entries = $state.raw<VfsEntryDto[]>([])
  let loadError = $state<string | null>(null)
  let history = $state.raw<(VPath | '')[]>([])
  let expanded = $state(new Set<string>(['grp:fav', 'grp:lib', 'root:computer']))
  const listings = new SvelteMap<VPath, VfsEntryDto[]>()
  const requested = new Set<VPath>()

  const sync = new ViewSync<{ path: string; selected: string[] }>((v) => JSON.stringify([v.path, v.selected]))

  // The Search Companion: open or not, its criteria, the search on screen (also in the view, for the agent) and the results.
  let searchOpen = $state(false)
  let searchName = $state('')
  let searchContaining = $state('')
  let searchRoot = $state('')
  let searchView = $state.raw<ExplorerSearchView | null>(null)
  let searchResult = $state.raw<FileFindResultDto | null>(null)
  let searching = $state(false)
  let searchError = $state<string | null>(null)
  let searchByAgent = $state(false)
  let resultSelected = $state<string[]>([])
  const searchSync = new ViewSync<ExplorerSearchView | null>(explorerSearchKey)

  function report(): void {
    const view = { path, selected: $state.snapshot(selected) }
    if (sync.report(view)) host.updateView(win.id, { app: 'explorer', ...view, search: searchView })
  }

  /** Tells the view which search is on screen (null: none), so the agent sees what the user searched for. */
  function reportSearch(): void {
    if (!searchSync.report(searchView)) return
    const view = { path, selected: $state.snapshot(selected) }
    sync.report(view)
    host.updateView(win.id, { app: 'explorer', ...view, search: searchView })
  }

  function reveal(target: VPath | ''): void {
    const open = new Set(expanded)
    open.add('root:computer')
    for (const p of ancestors(target)) open.add(treeIdOf(p))
    expanded = open
  }

  /** Shows a location; `remember` pushes the old one on the Back stack. */
  function go(target: VPath | '', remember = true): void {
    const next = target === '' ? '' : (normaliseVPath(target) ?? path)
    if (next === path && (next === '' || entries.length > 0)) return
    if (remember && next !== path) history = [...history, path]
    path = next
    selected = []
    reveal(next)
    report()
  }

  // Follow the view from outside (the agent opens another folder or selects files).
  $effect(() => {
    const view = win.view
    if (!sync.isExternal({ path: view.path, selected: view.selected })) return
    untrack(() => {
      const next = view.path === '' ? '' : (normaliseVPath(view.path) ?? '')
      if (next !== path) {
        history = [...history, path]
        path = next
        reveal(next)
      }
      selected = [...view.selected]
    })
  })

  /** Runs a search and lists what it finds: the user's (Search button, Enter) or the agent's (fs_find). */
  let searchRun = 0
  async function runSearch(next: ExplorerSearchView): Promise<void> {
    const run = ++searchRun
    searchOpen = true
    searchName = next.name
    searchContaining = next.containing
    searchRoot = next.root
    searchView = next
    searchByAgent = next.by === 'agent'
    resultSelected = []
    searching = true
    searchError = null
    try {
      const result = await host.api.vfs.find(desktopId, next.root, { name: next.name, containing: next.containing })
      if (run === searchRun) searchResult = result
    } catch (error) {
      if (run !== searchRun) return
      searchResult = null
      searchError = errorText(error)
    } finally {
      if (run === searchRun) searching = false
    }
  }

  function searchFromForm(): void {
    const next: ExplorerSearchView = { name: searchName.trim(), containing: searchContaining.trim(), root: searchRoot || defaultLookIn(path, drives), by: 'user' }
    if (next.name === '' && next.containing === '') return
    void runSearch(next)
    reportSearch()
  }

  /** Search (toolbar, View menu, F3): opens the Search Companion, looking in the folder shown. */
  function openSearch(): void {
    if (searchOpen) return
    searchOpen = true
    searchRoot = defaultLookIn(path, drives)
  }

  /** Back (or Search again): closes the Search Companion and its results; the folder list comes back. */
  function closeSearch(): void {
    searchRun++
    searchOpen = false
    searching = false
    searchResult = null
    searchError = null
    searchView = null
    reportSearch()
  }

  const toggleSearch = (): void => (searchOpen ? closeSearch() : openSearch())

  // The agent searched (fs_find): the Search Companion opens with its criteria and lists the results.
  $effect(() => {
    const search = win.view.search ?? null
    if (!searchSync.isExternal(search)) return
    untrack(() => (search ? void runSearch(search) : searchOpen && closeSearch()))
  })

  const showingResults = $derived(searchOpen && (searchResult !== null || searching || searchError !== null))
  const resultRows = $derived(searchResult ? searchRows(searchResult.entries) : [])
  const resultEntry = (id: string): VfsEntryDto | undefined => searchResult?.entries.find((e) => e.path === id)

  /** A result: a file opens in its app; a folder closes the search and opens in Explorer. */
  function activateResult(row: ListRow): void {
    const entry = resultEntry(row.id)
    if (!entry) return
    if (entry.kind === 'directory') {
      closeSearch()
      go(entry.path)
    } else openEntry(entry)
  }

  // The drive we are on was ejected: back to Computer.
  $effect(() => {
    const here = path
    const letters = drives.map((d) => d.letter)
    if (here !== '' && !letters.includes(here[0].toUpperCase())) untrack(() => go('', false))
  })

  const hasDrive = (p: VPath | ''): boolean => p === '' || drives.some((d) => d.letter === p[0].toUpperCase())

  // The details list: one directory level.
  $effect(() => {
    const dir = path
    let stale = false
    loadError = null
    if (dir === '') {
      entries = []
      return
    }
    host.api.vfs.readDir(desktopId, dir).then(
      (list) => {
        if (stale) return
        entries = list
        listings.set(dir, list)
      },
      (error: unknown) => {
        if (stale) return
        entries = []
        loadError = errorText(error)
      }
    )
    return () => {
      stale = true
    }
  })

  // The nav pane: load the listing of every expanded directory once.
  $effect(() => {
    void drives
    for (const id of expanded) {
      if (!id.startsWith(DIR)) continue
      const dir = id.slice(DIR.length) as VPath
      if (requested.has(dir)) continue
      requested.add(dir)
      untrack(() => {
        host.api.vfs.readDir(desktopId, dir).then(
          (list) => listings.set(dir, list),
          () => listings.set(dir, [])
        )
      })
    }
  })

  const dirNodes = (dir: VPath): TreeNodeData[] | undefined =>
    listings
      .get(dir)
      ?.filter((e) => e.kind === 'directory')
      .map((e) => ({ id: treeIdOf(e.path), testid: 'explorer-tree-folder', text: e.name, icon: 'folder' as const, hasChildren: true, children: dirNodes(e.path) }))

  const nodes = $derived<TreeNodeData[]>([
    { id: 'grp:fav', testid: 'explorer-tree-favorites', text: 'Favorites', icon: 'star', children: favs.map((p) => ({ id: `fav:${p.id}`, testid: 'explorer-tree-favorite', text: p.label, icon: 'folder' as const })) },
    { id: 'grp:lib', text: 'Libraries', icon: 'library', children: libs.map((p) => ({ id: `lib:${p.id}`, testid: 'explorer-tree-library', text: p.label, icon: 'library' as const })) },
    {
      id: 'root:computer',
      testid: 'explorer-tree-computer',
      text: 'Computer',
      icon: 'computer',
      children: [...driveGroups(drives).hardDisks, ...driveGroups(drives).removable].map((d) => {
        const root = driveRoot(d.letter)
        return { id: treeIdOf(root), testid: `explorer-tree-drive-${d.letter.toLowerCase()}`, text: driveTitle(d), icon: d.kind === 'removable' ? ('usb' as const) : ('drive' as const), hasChildren: true, children: dirNodes(root) }
      })
    }
  ])

  const treeSelected = $derived.by<string | null>(() => {
    if (path === '') return 'root:computer'
    const fav = favs.find((p) => p.path === path)
    if (fav) return `fav:${fav.id}`
    const lib = libs.find((p) => p.path === path)
    return lib ? `lib:${lib.id}` : treeIdOf(path)
  })

  function onTreeSelect(node: TreeNodeData): void {
    if (node.id === 'root:computer') go('')
    else if (node.id.startsWith(DIR)) go(node.id.slice(DIR.length) as VPath)
    else if (node.id.startsWith('fav:')) go(favs.find((p) => `fav:${p.id}` === node.id)?.path ?? path)
    else if (node.id.startsWith('lib:')) go(libs.find((p) => `lib:${p.id}` === node.id)?.path ?? path)
  }

  // svelte-ignore state_referenced_locally
  const desktop = useDesktopStores(host)
  const stores = $derived(desktop.list)
  const statuses = $derived(
    deriveAgentStatus({
      changes: stores.flatMap((s) => s.state.changes),
      toolCalls: stores.flatMap((s) => Object.values(s.state.toolCalls))
    })
  )

  const columns: ListColumn[] = [
    { key: 'name', header: 'Name', width: 190 },
    { key: 'type', header: 'Type', width: 180 },
    { key: 'status', header: 'Agent status' }
  ]
  const rows = $derived<ListRow[]>(
    entries.map((e) => ({
      id: e.path,
      icon: e.kind === 'directory' ? 'folder' : e.name.match(/\.(ts|js|svelte|json|css|html|mjs)$/i) ? 'file-code' : 'file-text',
      name: e.name,
      type: typeName(e.path, e.kind === 'directory'),
      status: statusLabelFor(statuses, e.path, e.kind === 'directory')
    }))
  )
  const selectedEntry = $derived(entries.find((e) => e.path === selected[0]) ?? null)
  // The chat pane knows the folder and what is selected in it.
  // svelte-ignore state_referenced_locally
  useAppContext(host, () => win.id, () => ({
    folder: path === '' ? 'Computer' : path,
    selectedItems: selected.slice(0, 20),
    items: entries.slice(0, 40).map((e) => e.name)
  }))

  const selectedDrive = $derived<DriveDto | null>(path === '' && selected[0] ? (drives.find((d) => driveRoot(d.letter) === selected[0]) ?? null) : null)

  function activate(row: ListRow): void {
    const entry = entries.find((e) => e.path === row.id)
    if (!entry) return
    if (entry.kind === 'directory') go(entry.path)
    else void host.openApp({ app: opensInNotepad(entry.path) ? 'notepad' : 'code', path: entry.path })
  }

  async function cannotFind(text: string): Promise<void> {
    await showMessageBox({ text: `Windows cannot find '${text}'. Check the spelling and try again.`, caption: 'Explorer', buttons: 'OK', icon: 'error' })
  }

  async function submitAddress(text: string): Promise<void> {
    const target = parseAddress(text, drives)
    if (target === null || !hasDrive(target)) return void (await cannotFind(text))
    try {
      if (target !== '') await host.api.vfs.readDir(desktopId, target)
      go(target)
    } catch {
      await cannotFind(text)
    }
  }

  function back(): void {
    const previous = history.at(-1)
    if (previous === undefined) return
    history = history.slice(0, -1)
    go(previous, false)
  }

  function refresh(): void {
    requested.clear()
    listings.clear()
    const dir = path
    if (dir !== '') {
      void host.api.vfs.readDir(desktopId, dir).then((list) => {
        entries = list
        listings.set(dir, list)
      })
    }
    expanded = new Set(expanded)
  }

  /** A recently removed project the user selected in Computer (the toolbar's Plug in again acts on it). */
  let removedSelected = $state<Id | null>(null)
  /** Why Open and Eject are off (tooltip, description and one line next to the buttons). */
  const openReason = $derived(selectedDrive ? null : 'Select a drive first')
  const ejectReason = $derived(firstReason([!selectedDrive && 'Select a project drive first', selectedDrive && selectedDrive.kind !== 'removable' && 'Only a project drive can be ejected']))
  const commandsNote = $derived(ejectReason)
  /** The reason as the accessible description of a button that is off (spread: the kit button forwards it). */
  const described = (reason: string | null): Record<string, string | undefined> => ({ 'aria-description': reason ?? undefined })

  /** Computer with the project's drive selected, after it was plugged in (or found plugged in already). */
  function showDrive(drive: DriveDto | null): void {
    if (!drive) return
    removedSelected = null
    go('')
    onSelectDrive(driveRoot(drive.letter))
  }

  const plugIn = async (): Promise<void> => showDrive(await host.plugInProject())

  // Computer selects the newest removed project, so that Plug in again is ready to use.
  $effect(() => {
    if (path === '' && removedSelected === null && !selectedDrive && host.recentlyRemoved.length > 0) removedSelected = host.recentlyRemoved[0].folderId
  })

  async function plugInAgain(folderId: Id | null = removedSelected): Promise<void> {
    if (folderId === null) return
    showDrive(await host.plugInAgain(folderId))
  }

  // svelte-ignore state_referenced_locally
  const help = new AppHelp(host, 'explorer')
  const ctx = new ContextMenu()

  const askAbout = (target: VPath): void => void host.askChat({ app: 'explorer', windowId: win.id, kind: 'ask', path: target })

  async function showProperties(entry: VfsEntryDto): Promise<void> {
    await showMessageBox({ text: propertiesText(entry, typeName(entry.path, entry.kind === 'directory')), caption: `${entry.name} Properties`, buttons: 'OK', icon: 'information' })
  }

  const openEntry = (entry: VfsEntryDto): void => {
    if (entry.kind === 'directory') go(entry.path)
    else void host.openApp({ app: defaultOpener(entry.path), path: entry.path })
  }

  /** A file or folder: Open, Open with, Copy path, Start chat here, Ask the agent about this, Properties. */
  const entryMenu = (entry: VfsEntryDto): MenuItemDef[] =>
    entryItems(entry, {
      open: () => openEntry(entry),
      openWith: (app) => void host.openApp({ app, path: entry.path }),
      copyPath: () => copyText(entry.path),
      properties: () => void showProperties(entry),
      startChat: () => void host.startChat(entry.kind === 'directory' ? entry.path : (vpathParent(entry.path) ?? entry.path)),
      askChat: () => askAbout(entry.path)
    })

  const backgroundMenu = (): MenuItemDef[] =>
    backgroundItems({ refresh, up: () => go(upPath(path)), inFolder: path !== '', startChat: () => path !== '' && void host.startChat(path), askChat: () => path !== '' && askAbout(path) })

  const driveMenuItems = (drive: DriveDto): MenuItemDef[] =>
    driveItems(drive, {
      open: () => go(driveRoot(drive.letter)),
      startChat: () => void host.startChat(driveRoot(drive.letter)),
      askChat: () => askAbout(driveRoot(drive.letter)),
      copyPath: () => copyText(driveRoot(drive.letter)),
      eject: () => void host.ejectDrive(drive.letter),
      properties: () => void showMessageBox({ text: driveProperties(drive), caption: `${driveTitle(drive)} Properties`, buttons: 'OK', icon: 'information' })
    })

  const removedMenuItems = (folderId: Id): MenuItemDef[] => [{ id: 'explorer-removed-plug-in-again', testid: 'explorer-ctx-plug-in-again', label: 'Plug in &again', icon: 'usb', action: () => void plugInAgain(folderId) }]

  function removedMenu(project: { folderId: Id }, event: MouseEvent): void {
    ctx.show(event, removedMenuItems(project.folderId))
  }

  /** Right-click on a drive of the navigation pane. */
  function navMenu(node: TreeNodeData, event: MouseEvent): void {
    const drive = node.id.startsWith(DIR) ? drives.find((d) => treeIdOf(driveRoot(d.letter)) === node.id) : undefined
    if (drive) ctx.show(event, driveMenuItems(drive))
  }

  function folderMenu(row: ListRow, event: MouseEvent): void {
    const entry = entries.find((e) => e.path === row.id)
    ctx.show(event, entry ? entryMenu(entry) : backgroundMenu())
  }

  function driveMenu(drive: DriveDto, event: MouseEvent): void {
    ctx.show(event, driveMenuItems(drive))
  }

  /** What the Menu key opens: the menu of the selected file, folder or drive, else the background menu. */
  function keyMenu(): MenuItemDef[] {
    if (path === '' && removedSelected !== null) return removedMenuItems(removedSelected)
    if (selectedDrive) return driveMenuItems(selectedDrive)
    return selectedEntry ? entryMenu(selectedEntry) : backgroundMenu()
  }

  const menus = $derived<MenuDef[]>(
    menuBar([
      {
        label: '&File',
        items: [
          newChatItem('explorer', () => void host.startDefaultChat()),
          { separator: true },
          { id: 'open', testid: 'explorer-menu-open', label: '&Open', disabled: !selectedEntry && !selectedDrive, action: () => (selectedEntry ? openEntry(selectedEntry) : selectedDrive && go(driveRoot(selectedDrive.letter))) },
          { id: 'plug', testid: 'explorer-menu-plug-in', label: '&Plug in a project...', action: () => void plugIn() },
          { id: 'plug-again', testid: 'explorer-menu-plug-in-again', label: 'Plug in a&gain', disabled: path !== '' || removedSelected === null, action: () => void plugInAgain() },
          { id: 'eject', testid: 'explorer-menu-eject', label: '&Eject (remove from this desktop)', disabled: selectedDrive?.kind !== 'removable', action: () => selectedDrive && void host.ejectDrive(selectedDrive.letter) },
          { id: 'props', testid: 'explorer-menu-properties', label: 'P&roperties', disabled: !selectedEntry, action: () => selectedEntry && void showProperties(selectedEntry) },
          ...closeItems('explorer', () => void host.closeWindow(win.id))
        ]
      },
      {
        label: '&Edit',
        items: [
          { id: 'copy-path', testid: 'explorer-menu-copy-path', label: 'Copy as &path', disabled: !selectedEntry && !selectedDrive, action: () => copyText(selectedEntry?.path ?? (selectedDrive ? driveRoot(selectedDrive.letter) : '')) },
          { separator: true },
          { id: 'select-all', testid: 'explorer-menu-select-all', label: 'Select &All', shortcut: 'Ctrl+A', disabled: path === '', action: () => (selected = rows.map((r) => r.id)) }
        ]
      },
      {
        label: '&View',
        items: [
          { id: 'up', testid: 'explorer-menu-up', label: '&Up one level', shortcut: 'Alt+Up', disabled: path === '', action: () => go(upPath(path)) },
          { id: 'refresh', testid: 'explorer-menu-refresh', label: '&Refresh', shortcut: 'F5', action: refresh },
          { id: 'search', testid: 'explorer-menu-search', label: '&Search', icon: 'search', shortcut: 'F3', checked: searchOpen, action: toggleSearch },
          { separator: true },
          help.paneItem(win.id)
        ]
      },
      help.menu()
    ])
  )

  function onkeydown(event: KeyboardEvent): void {
    if (event.key === 'F5') {
      event.preventDefault()
      refresh()
    } else if (event.key === 'F3' || (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'f')) {
      event.preventDefault()
      toggleSearch()
    } else if (event.altKey && event.key === 'ArrowUp' && path !== '') {
      event.preventDefault()
      go(upPath(path))
    } else ctx.key(event, keyMenu)
  }

  function onSelectDrive(root: VPath): void {
    removedSelected = null
    selected = [root]
    report()
  }

  function onSelectRemoved(folderId: Id): void {
    removedSelected = folderId
    selected = []
    report()
  }

  const itemsText = $derived(showingResults ? searchStatus(searchResult, searching, searchError) : path === '' ? projectCountText(drives.filter((d) => d.kind === 'removable').length) : `${entries.length} item${entries.length === 1 ? '' : 's'}`)
  const selectionText = $derived(
    selectedDrive
      ? `${driveTitle(selectedDrive)}  -  ${selectedDrive.kind === 'removable' ? 'USB drive' : 'Local Disk'}`
      : selected.length === 1 && selectedEntry
        ? `${selectedEntry.name}  -  ${typeName(selectedEntry.path, selectedEntry.kind === 'directory')}`
        : `${selected.length} items selected`
  )
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="explorer" data-testid="explorer-app" data-path={path} {onkeydown} oncontextmenu={(e) => ctx.show(e, backgroundMenu())}>
  <MenuStrip {menus} aria-label="Explorer menu" />
  <div class="nav">
    <ToolStripButton data-testid="explorer-back" icon="chevron-left" title="Back" aria-label="Back" disabled={history.length === 0} onclick={back} />
    <ToolStripButton data-testid="explorer-up" icon="chevron-up" title="Up one level" aria-label="Up" disabled={path === ''} onclick={() => go(upPath(path))} />
    <AddressBar {path} {drives} onnavigate={(p) => go(p)} onsubmit={(text) => void submitAddress(text)} />
    <ToolStripButton data-testid="explorer-refresh" icon="refresh" title="Refresh" aria-label="Refresh" onclick={refresh} />
    <ToolStripButton data-testid="explorer-search" icon="search" text="Search" title="Search for files and folders (F3)" checked={searchOpen} onclick={toggleSearch} />
  </div>
  {#if path === ''}
    <div class="commands" role="toolbar" aria-label="Commands">
      <ToolTip text="Plug in a project folder as a drive so that the agent can see its files. Press F1 for more.">
        <ToolStripButton data-testid="explorer-plug-in" icon="plus" text="Plug in a project..." onclick={() => void plugIn()} />
      </ToolTip>
      <ToolTip text={host.recentlyRemoved.length === 0 ? NOTHING_REMOVED_TIP : 'Plug the selected removed project in again, without choosing its folder.'}>
        <ToolStripButton data-testid="explorer-plug-in-again" icon="usb" text="Plug in again" disabled={removedSelected === null} onclick={() => void plugInAgain()} />
      </ToolTip>
      <ToolTip text={openReason ?? 'Open the selected drive.'}>
        <ToolStripButton data-testid="explorer-open" icon="open-folder" text="Open" disabled={!selectedDrive} {...described(openReason)} onclick={() => selectedDrive && go(driveRoot(selectedDrive.letter))} />
      </ToolTip>
      <ToolTip text={ejectReason ?? 'Remove the selected project from this desktop. The folder stays on your disk.'}>
        <ToolStripButton data-testid="explorer-eject" icon="usb" text="Eject (remove from this desktop)" disabled={selectedDrive?.kind !== 'removable'} {...described(ejectReason)} onclick={() => selectedDrive && void host.ejectDrive(selectedDrive.letter)} />
      </ToolTip>
      <span class="reason" data-testid="explorer-commands-reason" role="status">{commandsNote ?? ''}</span>
    </div>
  {/if}
  <div class="split">
    <SplitContainer splitterDistance={190} panel1MinSize={110} panel2MinSize={200} fixedPanel="panel1">
      {#snippet panel1()}
        {#if searchOpen}
          <ExplorerSearchPane
            bind:name={searchName}
            bind:containing={searchContaining}
            bind:root={searchRoot}
            lookIn={searchLookIn(path, drives)}
            status={searchStatus(searchResult, searching, searchError)}
            {searching}
            byAgent={searchByAgent && searchResult !== null}
            onsearch={searchFromForm}
            onback={closeSearch}
          />
        {:else}
          <TreeView testid="explorer-nav" class="folders" aria-label="Navigation pane" {nodes} selected={treeSelected} bind:expanded onselect={onTreeSelect} oncontextmenu={navMenu} />
        {/if}
      {/snippet}
      {#snippet panel2()}
        <div class="list">
          {#if showingResults}
            <ListView
              testid="explorer-search-results"
              rowTestid="explorer-search-result"
              columns={SEARCH_COLUMNS}
              rows={resultRows}
              bind:selected={resultSelected}
              multiSelect
              aria-label="Search Results"
              emptyText={searching ? 'Searching...' : (searchError ?? 'There are no results to display.')}
              onactivate={activateResult}
              oncontextmenu={(row, e) => {
                const entry = resultEntry(row.id)
                ctx.show(e, entry ? entryMenu(entry) : backgroundMenu())
              }}
            />
          {:else if path === ''}
            <ComputerView {drives} selected={selected[0] ?? null} onselect={onSelectDrive} onactivate={(d) => go(driveRoot(d.letter))} oncontextmenu={driveMenu} removed={host.recentlyRemoved} {removedSelected} onselectremoved={onSelectRemoved} onplugagain={(id) => void plugInAgain(id)} onremovedcontextmenu={removedMenu} />
          {:else}
            <ListView testid="explorer-list" rowTestid="explorer-item" {columns} {rows} bind:selected multiSelect aria-label="Files" emptyText={loadError ?? 'This folder is empty.'} onselect={() => report()} onactivate={activate} oncontextmenu={folderMenu} />
          {/if}
        </div>
      {/snippet}
    </SplitContainer>
  </div>
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel testid="explorer-item-count" text={itemsText} spring />
    {#if selected.length > 0}
      <StatusStripLabel testid="explorer-selection" text={selectionText} borders={['left']} />
    {/if}
  </StatusStrip>
  <ContextMenuStrip items={ctx.items} bind:open={ctx.open} x={ctx.x} y={ctx.y} label="Explorer" />
  <AppAbout {help} />
</div>

<style>
  .explorer {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--xp-face);
  }
  .nav {
    flex: none;
    display: flex;
    align-items: center;
    gap: 2px;
    height: 34px;
    padding: 0 6px;
    background: linear-gradient(#fff, #d6dff7);
    border-bottom: 1px solid #aab7cb;
  }
  /* Wraps in a narrow window instead of pushing Eject and the reason past the frame. */
  .commands {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
    min-height: 28px;
    min-width: 0;
    padding: 0 6px;
    background: linear-gradient(#fff, #eef3fa 50%, #e4ecf7 51%, #eaf1fa);
    border-bottom: 1px solid #c5d0e0;
  }
  .split {
    flex: 1;
    min-height: 0;
    display: flex;
    padding: 4px;
  }
  .split :global(.xp-split) {
    flex: 1;
  }
  .list {
    flex: 1;
    min-height: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .list :global(.xp-listview) {
    flex: 1;
    min-height: 0;
  }
  :global(.xp-tree.folders) {
    height: 100%;
  }
  .reason {
    flex: 0 1 auto;
    min-width: 0;
    align-self: center;
    margin-left: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--xp-text-muted);
    white-space: nowrap;
  }
</style>

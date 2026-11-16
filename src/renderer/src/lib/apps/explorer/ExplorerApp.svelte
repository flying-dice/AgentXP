<script lang="ts">
  import { untrack } from 'svelte'
  import { SvelteMap } from 'svelte/reactivity'
  import { normaliseVPath, type DriveDto, type VfsEntryDto, type VPath } from '@shared/vfs'
  import type { AppProps } from '../types'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import ListView from '../../kit/organisms/ListView.svelte'
  import type { ListColumn, ListRow } from '../../kit/organisms/ListView'
  import SplitContainer from '../../kit/organisms/SplitContainer.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import TreeView from '../../kit/organisms/TreeView.svelte'
  import type { TreeNodeData } from '../../kit/organisms/TreeView'
  import type { MenuItemDef } from '../../kit/molecules/MenuItem'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { useDesktopStores } from '../sessionStores.svelte'
  import { errorText } from '../shared/listing'
  import { opensInNotepad, typeName } from '../paths'
  import { ViewSync } from '../viewSync'
  import { deriveAgentStatus, statusLabelFor } from './agentStatus'
  import AddressBar from './AddressBar.svelte'
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

  function report(): void {
    const view = { path, selected: $state.snapshot(selected) }
    if (sync.mark(view)) host.updateView(win.id, { app: 'explorer', ...view })
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
    { key: 'type', header: 'Type', width: 130 },
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

  async function plugIn(): Promise<void> {
    try {
      await host.api.drives.plugIn(desktopId)
    } catch (error) {
      await showMessageBox({ text: errorText(error), caption: 'Explorer', buttons: 'OK', icon: 'error' })
    }
  }

  // Context menu of a drive: Open, Eject.
  let menuOpen = $state(false)
  let menuX = $state(0)
  let menuY = $state(0)
  let menuDrive = $state.raw<DriveDto | null>(null)
  let menuFolder = $state<VPath | null>(null)
  const menuItems = $derived<MenuItemDef[]>(
    menuFolder
      ? [
          { id: 'explorer-folder-open', label: '&Open', action: () => menuFolder && go(menuFolder) },
          { id: 'explorer-folder-chat', label: 'Start a &chat here', icon: 'session', action: () => menuFolder && void host.startChat(menuFolder) }
        ]
      : [
          { id: 'explorer-drive-open', label: '&Open', action: () => menuDrive && go(driveRoot(menuDrive.letter)) },
          { id: 'explorer-drive-chat', label: 'Start a &chat here', icon: 'session', action: () => menuDrive && void host.startChat(driveRoot(menuDrive.letter)) },
          { separator: true },
          { id: 'explorer-drive-eject', label: 'E&ject', icon: 'usb', disabled: menuDrive?.kind !== 'removable', action: () => menuDrive && void host.ejectDrive(menuDrive.letter) }
        ]
  )

  function folderMenu(row: ListRow, event: MouseEvent): void {
    const entry = entries.find((e) => e.path === row.id)
    if (entry?.kind !== 'directory') return
    menuDrive = null
    menuFolder = entry.path
    menuX = event.clientX
    menuY = event.clientY
    menuOpen = true
  }

  function driveMenu(drive: DriveDto, event: MouseEvent): void {
    menuDrive = drive
    menuFolder = null
    menuX = event.clientX
    menuY = event.clientY
    menuOpen = true
  }

  function onSelectDrive(root: VPath): void {
    selected = [root]
    report()
  }

  const itemsText = $derived(path === '' ? `${drives.length} item${drives.length === 1 ? '' : 's'}` : `${entries.length} item${entries.length === 1 ? '' : 's'}`)
  const selectionText = $derived(
    selectedDrive
      ? `${driveTitle(selectedDrive)}  -  ${selectedDrive.kind === 'removable' ? 'USB drive' : 'Local Disk'}`
      : selected.length === 1 && selectedEntry
        ? `${selectedEntry.name}  -  ${typeName(selectedEntry.path, selectedEntry.kind === 'directory')}`
        : `${selected.length} items selected`
  )
</script>

<div class="explorer" data-testid="explorer-app" data-path={path}>
  <div class="nav">
    <ToolStripButton data-testid="explorer-back" icon="chevron-left" title="Back" aria-label="Back" disabled={history.length === 0} onclick={back} />
    <ToolStripButton data-testid="explorer-up" icon="chevron-up" title="Up one level" aria-label="Up" disabled={path === ''} onclick={() => go(upPath(path))} />
    <AddressBar {path} {drives} onnavigate={(p) => go(p)} onsubmit={(text) => void submitAddress(text)} />
    <ToolStripButton data-testid="explorer-refresh" icon="refresh" title="Refresh" aria-label="Refresh" onclick={refresh} />
  </div>
  {#if path === ''}
    <div class="commands" role="toolbar" aria-label="Commands">
      <ToolStripButton data-testid="explorer-plug-in" icon="plus" text="Plug in a project..." title="Plug in a project as a USB drive" onclick={() => void plugIn()} />
      <ToolStripButton data-testid="explorer-open" icon="open-folder" text="Open" disabled={!selectedDrive} onclick={() => selectedDrive && go(driveRoot(selectedDrive.letter))} />
      <ToolStripButton data-testid="explorer-eject" icon="usb" text="Eject" title="Safely Remove Hardware" disabled={selectedDrive?.kind !== 'removable'} onclick={() => selectedDrive && void host.ejectDrive(selectedDrive.letter)} />
    </div>
  {/if}
  <div class="split">
    <SplitContainer splitterDistance={190} panel1MinSize={110} panel2MinSize={200} fixedPanel="panel1">
      {#snippet panel1()}
        <TreeView testid="explorer-nav" class="folders" aria-label="Navigation pane" {nodes} selected={treeSelected} bind:expanded onselect={onTreeSelect} />
      {/snippet}
      {#snippet panel2()}
        <div class="list">
          {#if path === ''}
            <ComputerView {drives} selected={selected[0] ?? null} onselect={onSelectDrive} onactivate={(d) => go(driveRoot(d.letter))} oncontextmenu={driveMenu} />
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
  <ContextMenuStrip items={menuItems} bind:open={menuOpen} x={menuX} y={menuY} label={menuFolder ? 'Folder' : 'Drive'} />
</div>

<style>
  .explorer {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
  }
  .nav {
    flex: none;
    display: flex;
    align-items: center;
    gap: 2px;
    height: 34px;
    padding: 0 6px;
    background: linear-gradient(#fafcfe, #dce6f4);
    border-bottom: 1px solid #aab7cb;
  }
  .commands {
    flex: none;
    display: flex;
    align-items: center;
    gap: 2px;
    height: 28px;
    padding: 0 6px;
    background: linear-gradient(#fdfeff, #eef3fa 50%, #e4ecf7 51%, #eaf1fa);
    border-bottom: 1px solid #c5d0e0;
  }
  .split {
    flex: 1;
    min-height: 0;
    display: flex;
    padding: 4px;
  }
  .split :global(.w7-split) {
    flex: 1;
  }
  .list {
    flex: 1;
    min-height: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .list :global(.w7-listview) {
    flex: 1;
    min-height: 0;
  }
  :global(.w7-tree.folders) {
    height: 100%;
  }
</style>

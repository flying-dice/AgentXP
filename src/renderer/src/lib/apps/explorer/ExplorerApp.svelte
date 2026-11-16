<script lang="ts">
  import { untrack } from 'svelte'
  import { SvelteMap } from 'svelte/reactivity'
  import type { FileNodeDto } from '@shared/models'
  import type { AppProps } from '../types'
  import Icon from '../../kit/atoms/Icon.svelte'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import ListView from '../../kit/organisms/ListView.svelte'
  import type { ListColumn, ListRow } from '../../kit/organisms/ListView'
  import SplitContainer from '../../kit/organisms/SplitContainer.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import TreeView from '../../kit/organisms/TreeView.svelte'
  import type { TreeNodeData } from '../../kit/organisms/TreeView'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { useDesktopStores } from '../sessionStores.svelte'
  import { normalizePath, opensInNotepad, parentOf, parseAddress, toWindowsPath, typeName } from '../paths'
  import { ViewSync } from '../viewSync'
  import { deriveAgentStatus, statusLabelFor } from './agentStatus'

  let { window: win, host }: AppProps<'explorer'> = $props()

  const folder = $derived(host.state.folder)
  const rootText = $derived(`${folder.name} (W:)`)
  const treeId = (path: string): string => `d:${path}`

  let path = $state('')
  let selected = $state<string[]>([])
  let address = $state('W:\\')
  let entries = $state.raw<FileNodeDto[]>([])
  let loadError = $state<string | null>(null)
  let history = $state.raw<string[]>([])
  let expanded = $state(new Set<string>([treeId('')]))
  const listings = new SvelteMap<string, FileNodeDto[]>()
  const requested = new Set<string>()

  const sync = new ViewSync<{ path: string; selected: string[] }>((v) => JSON.stringify([v.path, v.selected]))

  function report(): void {
    const view = { path, selected: $state.snapshot(selected) }
    if (sync.mark(view)) host.updateView(win.id, { app: 'explorer', ...view })
  }

  /** Shows a directory; `remember` pushes the old one on the Back stack. */
  function go(target: string, remember = true): void {
    const next = normalizePath(target)
    if (next === path && entries.length > 0) return
    if (remember && next !== path) history = [...history, path]
    path = next
    address = toWindowsPath(next)
    selected = []
    const open = new Set(expanded)
    for (let p = next; ; p = parentOf(p)) {
      open.add(treeId(p))
      if (p === '') break
    }
    expanded = open
    report()
  }

  // Follow the view from outside (the agent opens another folder or selects files).
  $effect(() => {
    const view = win.view
    if (!sync.isExternal({ path: view.path, selected: view.selected })) return
    untrack(() => {
      const next = normalizePath(view.path)
      if (next !== path) {
        history = [...history, path]
        path = next
        address = toWindowsPath(next)
        const open = new Set(expanded)
        for (let p = next; ; p = parentOf(p)) {
          open.add(treeId(p))
          if (p === '') break
        }
        expanded = open
      }
      selected = [...view.selected]
    })
  })

  // The details list: one directory level.
  $effect(() => {
    const dir = path
    let stale = false
    loadError = null
    host.api.folders.readDir(folder.id, dir).then(
      (list) => {
        if (stale) return
        entries = list
        listings.set(dir, list)
      },
      (error: unknown) => {
        if (stale) return
        entries = []
        loadError = error instanceof Error ? error.message : String(error)
      }
    )
    return () => {
      stale = true
    }
  })

  // The folder tree: load the listing of every expanded directory once.
  $effect(() => {
    for (const id of expanded) {
      const dir = id.slice(2)
      if (requested.has(dir)) continue
      requested.add(dir)
      untrack(() => {
        host.api.folders.readDir(folder.id, dir).then(
          (list) => listings.set(dir, list),
          () => listings.set(dir, [])
        )
      })
    }
  })

  const nodesOf = (dir: string): TreeNodeData[] | undefined =>
    listings
      .get(dir)
      ?.filter((e) => e.isDirectory)
      .map((e) => ({ id: treeId(e.path), text: e.name, icon: 'folder' as const, hasChildren: true, children: nodesOf(e.path) }))
  const nodes = $derived<TreeNodeData[]>([{ id: treeId(''), text: rootText, icon: 'folder', hasChildren: true, children: nodesOf('') }])

  // svelte-ignore state_referenced_locally
  const desktop = useDesktopStores(host)
  const stores = $derived(desktop.list)
  const statuses = $derived(
    deriveAgentStatus({
      folderPath: folder.path,
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
      icon: e.isDirectory ? 'folder' : e.name.match(/\.(ts|js|svelte|json|css|html|mjs)$/i) ? 'file-code' : 'file-text',
      name: e.name,
      type: typeName(e.path, e.isDirectory),
      status: statusLabelFor(statuses, e.path, e.isDirectory)
    }))
  )
  const selectedEntry = $derived(entries.find((e) => e.path === selected[0]) ?? null)

  function activate(row: ListRow): void {
    const entry = entries.find((e) => e.path === row.id)
    if (!entry) return
    if (entry.isDirectory) go(entry.path)
    else void host.openApp({ app: opensInNotepad(entry.path) ? 'notepad' : 'code', path: entry.path })
  }

  async function submitAddress(): Promise<void> {
    const target = parseAddress(address)
    if (target === null) {
      await showMessageBox({ text: `Windows cannot find '${address}'. Check the spelling and try again.`, caption: 'Explorer', buttons: 'OK', icon: 'error' })
      address = toWindowsPath(path)
      return
    }
    try {
      await host.api.folders.readDir(folder.id, target)
      go(target)
    } catch {
      await showMessageBox({ text: `Windows cannot find '${address}'. Check the spelling and try again.`, caption: 'Explorer', buttons: 'OK', icon: 'error' })
      address = toWindowsPath(path)
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
    void host.api.folders.readDir(folder.id, dir).then((list) => {
      entries = list
      listings.set(dir, list)
    })
    expanded = new Set(expanded)
  }

  let treeSelected = $derived<string | null>(treeId(path))
  const itemsText = $derived(`${entries.length} item${entries.length === 1 ? '' : 's'}`)
</script>

<div class="explorer">
  <div class="nav">
    <ToolStripButton icon="chevron-left" title="Back" aria-label="Back" disabled={history.length === 0} onclick={back} />
    <ToolStripButton icon="chevron-up" title="Up one level" aria-label="Up" disabled={path === ''} onclick={() => go(parentOf(path))} />
    <form
      class="address"
      onsubmit={(event) => {
        event.preventDefault()
        void submitAddress()
      }}
    >
      <Icon name="folder" />
      <input class="field" bind:value={address} aria-label="Address" spellcheck="false" />
    </form>
    <ToolStripButton icon="refresh" title="Refresh" aria-label="Refresh" onclick={refresh} />
  </div>
  <div class="split">
    <SplitContainer splitterDistance={190} panel1MinSize={110} panel2MinSize={200} fixedPanel="panel1">
      {#snippet panel1()}
        <TreeView
          class="folders"
          aria-label="Folders"
          {nodes}
          selected={treeSelected}
          bind:expanded
          onselect={(node) => go(node.id.slice(2))}
        />
      {/snippet}
      {#snippet panel2()}
        <div class="list">
          <ListView
            {columns}
            {rows}
            bind:selected
            multiSelect
            aria-label="Files"
            emptyText={loadError ?? 'This folder is empty.'}
            onselect={() => report()}
            onactivate={activate}
          />
        </div>
      {/snippet}
    </SplitContainer>
  </div>
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text={itemsText} spring />
    {#if selected.length > 0}
      <StatusStripLabel
        text={selected.length === 1 && selectedEntry ? `${selectedEntry.name}  -  ${typeName(selectedEntry.path, selectedEntry.isDirectory)}` : `${selected.length} items selected`}
        borders={['left']}
      />
    {/if}
  </StatusStrip>
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
  .address {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    height: 22px;
    margin: 0 4px;
    padding: 0 4px;
    background: var(--w7-window);
    border: 1px solid var(--w7-input-border);
    border-top-color: var(--w7-input-border-top);
  }
  .address:focus-within {
    border-color: #3399ff;
  }
  .field {
    flex: 1;
    min-width: 0;
    height: 18px;
    border: 0;
    outline: 0;
    background: transparent;
    font: inherit;
    user-select: text;
    cursor: text;
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

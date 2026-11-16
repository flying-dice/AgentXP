<script lang="ts">
  /** A simple "Open" dialog over the workspace folder (folders.readDir), shown inside the app window. */
  import type { Agent7Api } from '@shared/ipc'
  import type { FileNodeDto, Id } from '@shared/models'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import type { DialogResult } from '../../kit/molecules/DialogButtons'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import ListView from '../../kit/organisms/ListView.svelte'
  import type { ListColumn, ListRow } from '../../kit/organisms/ListView'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import { extensionOf, parentOf, toWindowsPath, typeName } from '../paths'

  interface Props {
    api: Agent7Api
    folderId: Id
    /** Directory shown first (workspace-relative). */
    startPath?: string
    title?: string
    /** Only files with these extensions (lower case, no dot) are listed; folders always are. */
    extensions?: string[]
    onopen: (path: string) => void
    onclose: () => void
  }

  let { api, folderId, startPath = '', title = 'Open', extensions, onopen, onclose }: Props = $props()

  // svelte-ignore state_referenced_locally
  let dir = $state(startPath)
  let entries = $state.raw<FileNodeDto[]>([])
  let selected = $state<string[]>([])
  let error = $state<string | null>(null)

  $effect(() => {
    const target = dir
    let stale = false
    error = null
    selected = []
    api.folders.readDir(folderId, target).then(
      (list) => !stale && (entries = extensions ? list.filter((e) => e.isDirectory || extensions.includes(extensionOf(e.path))) : list),
      (e: unknown) => {
        if (stale) return
        entries = []
        error = e instanceof Error ? e.message : String(e)
      }
    )
    return () => {
      stale = true
    }
  })

  const columns: ListColumn[] = [
    { key: 'name', header: 'Name', width: 230 },
    { key: 'type', header: 'Type' }
  ]
  const rows = $derived<ListRow[]>(
    entries.map((e) => ({ id: e.path, icon: e.isDirectory ? 'folder' : 'file-text', name: e.name, type: typeName(e.path, e.isDirectory) }))
  )
  const picked = $derived(entries.find((e) => e.path === selected[0]) ?? null)

  function activate(row: ListRow): void {
    const entry = entries.find((e) => e.path === row.id)
    if (!entry) return
    if (entry.isDirectory) dir = entry.path
    else onopen(entry.path)
  }

  function result(r: DialogResult): void {
    if (r === 'ok' && picked) {
      if (picked.isDirectory) dir = picked.path
      else onopen(picked.path)
    } else if (r === 'cancel') onclose()
  }
</script>

<Dialog {title} iconName="open-folder" width="420px" contained {onclose}>
  <div class="open">
    <div class="where">
      <ToolStripButton icon="chevron-up" title="Up one level" aria-label="Up" disabled={dir === ''} onclick={() => (dir = parentOf(dir))} />
      <span class="path">Look in: {toWindowsPath(dir)}</span>
    </div>
    <div class="list">
      <ListView {columns} {rows} bind:selected aria-label="Files" emptyText={error ?? 'This folder is empty.'} onactivate={activate} />
    </div>
  </div>
  {#snippet buttons()}
    <DialogButtons buttons={['ok', 'cancel']} onresult={result} />
  {/snippet}
</Dialog>

<style>
  .open {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px 0;
  }
  .where {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .path {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .list {
    height: 200px;
    display: flex;
    flex-direction: column;
  }
  .list :global(.w7-listview) {
    flex: 1;
    min-height: 0;
  }
</style>

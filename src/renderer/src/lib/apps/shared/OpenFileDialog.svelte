<script lang="ts">
  /** A simple "Open" dialog over the desktop's drives (vfs.readDir), shown inside the app window. */
  import type { AgentXPApi } from '@shared/ipc'
  import type { Id } from '@shared/models'
  import type { VfsEntryDto, VPath } from '@shared/vfs'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import type { DialogResult } from '../../kit/molecules/DialogButtons'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import ListView from '../../kit/organisms/ListView.svelte'
  import type { ListColumn, ListRow } from '../../kit/organisms/ListView'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import { upPath } from '../explorer/explorerModel'
  import { extensionOf, typeName } from '../paths'
  import { errorText, listLocation } from './listing'

  interface Props {
    api: AgentXPApi
    desktopId: Id
    /** Directory shown first ('' is Computer, the list of drives). */
    startPath?: VPath | ''
    title?: string
    /** Only files with these extensions (lower case, no dot) are listed; folders always are. */
    extensions?: string[]
    onopen: (path: string) => void
    onclose: () => void
  }

  let { api, desktopId, startPath = '', title = 'Open', extensions, onopen, onclose }: Props = $props()

  // svelte-ignore state_referenced_locally
  let dir = $state(startPath)
  let entries = $state.raw<VfsEntryDto[]>([])
  let selected = $state<string[]>([])
  let error = $state<string | null>(null)

  $effect(() => {
    const target = dir
    let stale = false
    error = null
    selected = []
    listLocation(api, desktopId, target).then(
      (list) => !stale && (entries = extensions ? list.filter((e) => e.kind === 'directory' || extensions.includes(extensionOf(e.path))) : list),
      (e: unknown) => {
        if (stale) return
        entries = []
        error = errorText(e)
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
    entries.map((e) => ({ id: e.path, icon: e.kind === 'directory' ? 'folder' : 'file-text', name: e.name, type: dir === '' ? 'Drive' : typeName(e.path, e.kind === 'directory') }))
  )
  const picked = $derived(entries.find((e) => e.path === selected[0]) ?? null)

  function activate(row: ListRow): void {
    const entry = entries.find((e) => e.path === row.id)
    if (!entry) return
    if (entry.kind === 'directory') dir = entry.path
    else onopen(entry.path)
  }

  function result(r: DialogResult): void {
    if (r === 'ok' && picked) {
      if (picked.kind === 'directory') dir = picked.path
      else onopen(picked.path)
    } else if (r === 'cancel') onclose()
  }
</script>

<Dialog testid="open-file-dialog" {title} iconName="open-folder" width="420px" contained {onclose}>
  <div class="open">
    <div class="where">
      <ToolStripButton icon="chevron-up" title="Up one level" aria-label="Up" disabled={dir === ''} onclick={() => (dir = upPath(dir))} />
      <span class="path">Look in: {dir === '' ? 'Computer' : dir}</span>
    </div>
    <div class="list">
      <ListView {columns} {rows} bind:selected rowTestid="open-file-item" aria-label="Files" emptyText={error ?? 'This folder is empty.'} onactivate={activate} />
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
  .list :global(.xp-listview) {
    flex: 1;
    min-height: 0;
  }
</style>

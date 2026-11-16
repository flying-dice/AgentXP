<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import type { RecycledChangeDto } from '@shared/desktop'
  import type { SessionDto } from '@shared/models'
  import type { AppProps } from '../types'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import DiffViewer from '../../kit/organisms/DiffViewer.svelte'
  import ListView from '../../kit/organisms/ListView.svelte'
  import type { ListColumn } from '../../kit/organisms/ListView'
  import SplitContainer from '../../kit/organisms/SplitContainer.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import ToolStrip from '../../kit/organisms/ToolStrip.svelte'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { ViewSync } from '../viewSync'
  import { recycleRows, restoreSummary } from './recycleModel'

  let { window: win, host }: AppProps<'recycle-bin'> = $props()

  let items = $state.raw<RecycledChangeDto[]>([])
  let sessions = $state.raw<SessionDto[]>([])
  // svelte-ignore state_referenced_locally
  let selected = $state<string[]>(win.view.selectedId !== null ? [String(win.view.selectedId)] : [])
  let error = $state<string | null>(null)

  const desktopId = $derived(host.state.desktopId)
  const current = $derived(items.find((i) => String(i.id) === selected[0]) ?? null)
  const rows = $derived(recycleRows(items, sessions))

  const sync = new ViewSync<{ selectedId: number | null }>((v) => String(v.selectedId))

  async function refresh(): Promise<void> {
    try {
      const [list, sess] = await Promise.all([host.api.recycle.list(desktopId), host.api.sessions.list(host.state.folder.id)])
      items = list
      sessions = sess
      error = null
      if (selected.length > 0 && !list.some((i) => String(i.id) === selected[0])) selected = []
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }

  onMount(() => {
    void refresh()
    return host.api.on('recycle.changed', (e) => e.desktopId === desktopId && void refresh())
  })

  $effect(() => {
    const id = current?.id ?? null
    if (sync.mark({ selectedId: id })) untrack(() => host.updateView(win.id, { app: 'recycle-bin', selectedId: id }))
  })

  // The agent selects an item.
  $effect(() => {
    const id = win.view.selectedId
    if (!sync.isExternal({ selectedId: id })) return
    untrack(() => (selected = id === null ? [] : [String(id)]))
  })

  const fail = (e: unknown): Promise<unknown> => showMessageBox({ text: e instanceof Error ? e.message : String(e), caption: 'Recycle Bin', buttons: 'OK', icon: 'error' })

  async function restore(item: RecycledChangeDto): Promise<void> {
    try {
      await host.api.recycle.restore(item.id)
    } catch (e) {
      await fail(e)
    }
    await refresh()
  }

  async function restoreAll(): Promise<void> {
    try {
      for (const item of items) await host.api.recycle.restore(item.id)
    } catch (e) {
      await fail(e)
    }
    await refresh()
  }

  async function empty(): Promise<void> {
    const answer = await showMessageBox({
      text: `Are you sure you want to permanently delete these ${items.length} item${items.length === 1 ? '' : 's'}?`,
      caption: 'Delete Multiple Items',
      buttons: 'YesNo',
      icon: 'warning'
    })
    if (answer !== 'yes') return
    try {
      await host.api.recycle.empty(desktopId)
    } catch (e) {
      await fail(e)
    }
    await refresh()
  }

  const columns: ListColumn[] = [
    { key: 'name', header: 'Name', width: 150 },
    { key: 'location', header: 'Original location', width: 150 },
    { key: 'when', header: 'Date deleted', width: 140 },
    { key: 'chat', header: 'Chat' }
  ]
</script>

<div class="rb">
  <ToolStrip aria-label="Recycle Bin">
    <ToolStripButton icon="undo" text="Restore this item" disabled={!current} onclick={() => current && void restore(current)} />
    <ToolStripButton icon="redo" text="Restore all items" disabled={items.length === 0} onclick={() => void restoreAll()} />
    <ToolStripButton icon="delete" text="Empty the Recycle Bin" disabled={items.length === 0} onclick={() => void empty()} />
  </ToolStrip>
  <div class="body">
    <SplitContainer orientation="horizontal" splitterDistance={170} panel1MinSize={80} panel2MinSize={90} fixedPanel="panel2">
      {#snippet panel1()}
        <div class="list">
          <ListView {columns} {rows} bind:selected aria-label="Reverted changes" emptyText={error ?? 'The Recycle Bin is empty.'} />
        </div>
      {/snippet}
      {#snippet panel2()}
        <div class="preview">
          {#if current}
            <div class="note">{restoreSummary(current)}</div>
            <div class="diff w7-scroll">
              <DiffViewer oldText={current.restoredText ?? ''} newText={current.revertedText ?? ''} fileName={current.path} label="Restoring changes" />
            </div>
          {:else}
            <p class="none">Select an item to preview what Restore brings back.</p>
          {/if}
        </div>
      {/snippet}
    </SplitContainer>
  </div>
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text="{items.length} item{items.length === 1 ? '' : 's'}" spring />
  </StatusStrip>
</div>

<style>
  .rb {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
  }
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 4px;
  }
  .list {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .list :global(.w7-listview) {
    flex: 1;
    min-height: 0;
  }
  .preview {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-window);
    border: 1px solid var(--w7-list-border);
  }
  .note {
    flex: none;
    padding: 4px 8px;
    background: #eef3fb;
    border-bottom: 1px solid var(--w7-list-border);
    color: #1e3287;
  }
  .diff {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .none {
    margin: 0;
    padding: 8px;
    color: var(--w7-text-muted);
  }
</style>

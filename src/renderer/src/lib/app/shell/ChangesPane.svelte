<script lang="ts">
  import type { FileChangeDto } from '@shared/models'
  import Button from '../../kit/atoms/Button.svelte'
  import DiffViewer from '../../kit/organisms/DiffViewer.svelte'
  import ListView from '../../kit/organisms/ListView.svelte'
  import type { ListColumn, ListRow } from '../../kit/organisms/ListView'
  import { changeKindLabel, linesLabel } from '../changes/changeFormat'

  interface Props {
    changes: FileChangeDto[]
    /** Id of the selected change. */
    selectedId?: number | null
    onrevert?: (change: FileChangeDto) => void
    onopeneditor?: (change: FileChangeDto) => void
  }

  let { changes, selectedId = $bindable(null), onrevert, onopeneditor }: Props = $props()

  const columns: ListColumn[] = [
    { key: 'file', header: 'File' },
    { key: 'kind', header: 'Change', width: 68 },
    { key: 'lines', header: 'Lines', width: 62 }
  ]

  const rows = $derived<ListRow[]>(
    changes.map((c) => ({ id: String(c.id), icon: 'file-code', file: c.path, kind: changeKindLabel(c.kind), lines: linesLabel(c) }))
  )
  const selected = $derived(changes.find((c) => c.id === selectedId) ?? null)
</script>

<div class="changes">
  <div class="list">
    <ListView
      {columns}
      {rows}
      selected={selected ? [String(selected.id)] : []}
      emptyText="No pending changes in this session."
      aria-label="Changed files"
      onselect={(ids) => (selectedId = ids[0] ? Number(ids[0]) : null)}
    />
  </div>
  <div class="diff">
    {#if selected}
      {#key selected.id}
        <DiffViewer oldText={selected.originalText ?? ''} newText={selected.currentText ?? ''} fileName={selected.path} toolbar={false} label="Diff of {selected.path}" />
      {/key}
    {:else}
      <div class="hint">Select a changed file to view its diff.</div>
    {/if}
  </div>
  <div class="buttons">
    <Button disabled={!selected} onclick={() => selected && onrevert?.(selected)}>Revert</Button>
    <Button disabled={!selected || selected.kind === 'deleted'} onclick={() => selected && onopeneditor?.(selected)}>Open in editor</Button>
  </div>
</div>

<style>
  .changes {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
  }
  .list {
    flex: none;
    height: 124px;
    display: flex;
    flex-direction: column;
  }
  .list :global(.w7-listview) {
    flex: 1;
    min-height: 0;
  }
  .diff {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: auto;
    background: var(--w7-window);
    border: 1px solid var(--w7-list-border);
  }
  .hint {
    padding: 8px;
    color: var(--w7-text-muted);
  }
  .buttons {
    flex: none;
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }
</style>

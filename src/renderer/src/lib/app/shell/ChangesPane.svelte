<script lang="ts">
  /**
   * The Changes pane: the files an agent changed, with a preview of the selected change and Revert. It is the one
   * place to review changes: the chat window and the Code window show this same pane (UX-40).
   */
  import type { FileChangeDto } from '@shared/models'
  import Button from '../../kit/atoms/Button.svelte'
  import DiffViewer from '../../kit/organisms/DiffViewer.svelte'
  import ListView from '../../kit/organisms/ListView.svelte'
  import type { ListColumn, ListRow } from '../../kit/organisms/ListView'
  import { REVERTED_LABEL, changeKindLabel, changesSummary, linesLabel, splitChangePath } from '../changes/changeFormat'

  interface Props {
    changes: FileChangeDto[]
    /** Id of the selected change. */
    selectedId?: number | null
    /** Asks the user and reverts (the caller owns the question and the write). Resolves when it is done or declined. */
    onrevert?: (change: FileChangeDto) => void | Promise<void>
    onopeneditor?: (change: FileChangeDto) => void
    /** The link under a reverted row; without it the link is not shown. */
    onopenrecyclebin?: () => void
  }

  let { changes, selectedId = $bindable(null), onrevert, onopeneditor, onopenrecyclebin }: Props = $props()

  // Wide by default: the file column takes what the others leave, the others are wide enough for their words.
  const columns: ListColumn[] = [
    { key: 'file', header: 'File' },
    { key: 'kind', header: 'Change', width: 120 },
    { key: 'lines', header: '+ added / - removed', width: 132, align: 'right' }
  ]

  /** Reverted changes stay in the list, grey, so nobody wonders where the file went. */
  let reverted = $state.raw<FileChangeDto[]>([])
  let pending = $state.raw<FileChangeDto[]>([])

  $effect(() => {
    const gone = pending.filter((p) => !changes.some((c) => c.id === p.id))
    if (gone.length === 0) return
    pending = pending.filter((p) => !gone.includes(p))
    reverted = [...reverted, ...gone]
  })

  const rows = $derived<ListRow[]>([
    ...changes.map((c) => ({
      id: String(c.id),
      testid: 'changes-item',
      icon: 'file-code' as const,
      file: c.path,
      kind: changeKindLabel(c.kind),
      // A number, so that sorting by this column sorts by size.
      lines: c.additions + c.deletions,
      label: linesLabel(c),
      reverted: false
    })),
    ...reverted.map((c) => ({
      id: `reverted-${c.id}`,
      testid: 'changes-reverted',
      icon: 'file-code' as const,
      file: c.path,
      kind: REVERTED_LABEL,
      lines: -1,
      label: '',
      reverted: true
    }))
  ])
  const selected = $derived(changes.find((c) => c.id === selectedId) ?? null)

  async function revert(): Promise<void> {
    const change = selected
    if (!change) return
    pending = [...pending, change]
    try {
      await onrevert?.(change)
    } finally {
      // Declined or failed: the change is still there, so it is not "reverted".
      pending = pending.filter((p) => p.id !== change.id || !changes.some((c) => c.id === change.id))
    }
  }
</script>

<div class="changes">
  <div class="summary" data-testid="changes-summary">{changesSummary(changes)}</div>
  <div class="list">
    <ListView
      {columns}
      {rows}
      testid="changes-list"
      selected={selected ? [String(selected.id)] : []}
      emptyText="No pending changes in this session."
      aria-label="Changed files"
      onselect={(ids) => (selectedId = ids[0] && !ids[0].startsWith('reverted-') ? Number(ids[0]) : null)}
    >
      {#snippet cell(row, col)}
        {#if col.key === 'file'}
          {@const parts = splitChangePath(String(row.file))}
          <span class="file" class:reverted={row.reverted} title={String(row.file)} data-testid="changes-file">
            <b class="name">{parts.name}</b>{#if parts.dir}<span class="dir">{parts.dir}</span>{/if}
          </span>
        {:else if col.key === 'kind'}
          <span class="t" class:reverted={row.reverted}>{row.kind}</span>
        {:else}
          <span class="t" class:reverted={row.reverted}>{row.label}</span>
        {/if}
      {/snippet}
    </ListView>
  </div>
  {#if reverted.length > 0 && onopenrecyclebin}
    <div class="note" data-testid="changes-reverted-note">
      {REVERTED_LABEL}.
      <button type="button" class="link" data-testid="changes-open-recycle-bin" onclick={onopenrecyclebin}>Open the Recycle Bin</button>
    </div>
  {/if}
  <div class="diff" data-testid="changes-diff">
    {#if selected}
      {#key selected.id}
        <DiffViewer oldText={selected.originalText ?? ''} newText={selected.currentText ?? ''} fileName={selected.path} toolbar={false} wrap label="Diff of {selected.path}" />
      {/key}
    {:else}
      <div class="hint">Select a changed file to view its diff.</div>
    {/if}
  </div>
  <div class="buttons">
    <span title={selected ? undefined : 'Select a change to revert.'}>
      <Button data-testid="changes-revert" disabled={!selected} onclick={() => void revert()}>Revert</Button>
    </span>
    <span title={selected ? undefined : 'Select a change to open it.'}>
      <Button data-testid="changes-open-editor" disabled={!selected || selected.kind === 'deleted'} onclick={() => selected && onopeneditor?.(selected)}>Open in editor</Button>
    </span>
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
  .summary {
    flex: none;
    color: var(--w7-text-muted);
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
  .file {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
  }
  .name {
    flex: none;
  }
  .dir {
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--w7-text-muted);
  }
  .reverted,
  .reverted .name {
    color: var(--w7-text-muted);
    font-weight: normal;
  }
  .note {
    flex: none;
    color: var(--w7-text-muted);
  }
  .link {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--w7-link);
    font: inherit;
    text-decoration: underline;
    cursor: default;
  }
  /* Room for at least eight lines of the diff (17 px each) before the bar of the preview. */
  .diff {
    flex: 1;
    min-height: 150px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--w7-window);
    border: 1px solid var(--w7-list-border);
  }
  .diff :global(.w7-diffviewer) {
    flex: 1;
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

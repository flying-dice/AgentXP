<script lang="ts">
  /** The outline view (WinDiff): one row per changed file with its status, line counts and open comments. */
  import type { ReviewChangeDto } from '@shared/review'
  import { STATUS_LABEL, changeTotals } from './reviewModel'

  interface Props {
    changes: readonly ReviewChangeDto[]
    selectedPath: string | null
    openComments: ReadonlyMap<string, number>
    loading?: boolean
    onselect: (path: string) => void
    /** Double click or Enter: show the file expanded. */
    onopen: (path: string) => void
  }

  let { changes, selectedPath, openComments, loading = false, onselect, onopen }: Props = $props()

  function onkeydown(event: KeyboardEvent, path: string): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      onopen(path)
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const i = changes.findIndex((c) => c.path === path)
      const next = changes[i + (event.key === 'ArrowDown' ? 1 : -1)]
      if (next) {
        onselect(next.path)
        ;(event.currentTarget as HTMLElement).parentElement?.querySelector<HTMLElement>(`[data-path="${CSS.escape(next.path)}"]`)?.focus()
      }
    }
  }
</script>

<div class="outline" data-testid="review-outline">
  <div class="head" aria-hidden="true">
    <span class="st">Status</span><span class="file">File</span><span class="num">Added</span><span class="num">Removed</span><span class="cm">Comments</span>
  </div>
  {#if changes.length > 0}
  <div class="list xp-scroll" role="listbox" aria-label="Changed files">
    {#each changes as change (change.path)}
      {@const open = openComments.get(change.path) ?? 0}
      <div
        class="item"
        class:selected={change.path === selectedPath}
        role="option"
        aria-selected={change.path === selectedPath}
        tabindex={change.path === selectedPath ? 0 : -1}
        data-testid="review-file"
        data-path={change.path}
        data-status={change.status}
        onclick={() => onselect(change.path)}
        ondblclick={() => onopen(change.path)}
        onkeydown={(event) => onkeydown(event, change.path)}
      >
        <span class="st {change.status}">{STATUS_LABEL[change.status]}</span>
        <span class="file" title={change.oldPath ? `${change.oldPath} -> ${change.path}` : change.path}>{change.path}{change.oldPath ? ` (was ${change.oldPath})` : ''}</span>
        <span class="num add" data-testid="review-file-added">{change.binary ? '' : `+${change.additions}`}</span>
        <span class="num del" data-testid="review-file-removed">{change.binary ? 'binary' : `-${change.deletions}`}</span>
        <span class="cm" data-testid="review-file-comments">{open > 0 ? open : ''}</span>
      </div>
    {/each}
  </div>
    <div class="totals" data-testid="review-totals">{changeTotals(changes)}</div>
  {:else}
    <div class="empty" data-testid="review-outline-empty">{loading ? 'Looking for changes...' : 'No changes against the base. Nothing to review.'}</div>
  {/if}
</div>

<style>
  .outline {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--xp-window);
    border: 1px solid var(--xp-panel-border);
  }
  .head,
  .item {
    display: grid;
    grid-template-columns: 84px 1fr 64px 64px 72px;
    align-items: center;
    gap: 6px;
    padding: 0 8px;
    height: 21px;
  }
  .head {
    flex: none;
    background: linear-gradient(#fff, #e8eef6);
    border-bottom: 1px solid var(--xp-panel-border);
    color: var(--xp-text-muted);
  }
  .list {
    flex: 1;
    overflow: auto;
  }
  .item {
    border: 1px solid transparent;
    cursor: default;
  }
  .item:hover {
    background: var(--xp-hot-face);
  }
  .item.selected {
    background: var(--xp-select-face, #d6dff7);
    border-color: var(--xp-select-border, #316ac5);
  }
  .file {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .num,
  .cm {
    text-align: right;
  }
  .add {
    color: #8a6d00;
  }
  .del {
    color: #b3261e;
  }
  .st {
    font-weight: bold;
    white-space: nowrap;
  }
  .st.added,
  .st.untracked {
    color: #8a6d00;
  }
  .st.deleted {
    color: #b3261e;
  }
  .st.modified,
  .st.renamed {
    color: #1e4f9c;
  }
  .totals {
    flex: none;
    padding: 2px 8px;
    border-top: 1px solid var(--xp-panel-border);
    background: linear-gradient(#fff, #e8eef6);
    color: var(--xp-text-muted);
  }
  .empty {
    padding: 12px;
    color: var(--xp-text-muted);
  }
</style>

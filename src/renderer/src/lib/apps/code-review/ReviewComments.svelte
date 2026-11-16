<script lang="ts">
  /** The comments list panel: every thread of the review with where it is, its severity and state, and "Send all open comments". */
  import { SEVERITY_LABELS, commentLocation, sortComments, type ReviewCommentDto } from '@shared/review'
  import Button from '../../kit/atoms/Button.svelte'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import { commentCounts } from './reviewModel'

  interface Props {
    comments: readonly ReviewCommentDto[]
    selectedId?: number | null
    onselect: (comment: ReviewCommentDto) => void
    onsendall: () => void
  }

  let { comments, selectedId = null, onselect, onsendall }: Props = $props()

  let onlyOpen = $state(false)
  const counts = $derived(commentCounts(comments))
  const roots = $derived(sortComments(comments.filter((c) => c.parentId === null && (!onlyOpen || c.state === 'open'))))
  const replies = (root: ReviewCommentDto): number => comments.filter((c) => c.parentId === root.id).length
</script>

<section class="panel" data-testid="review-comments" aria-label="Review comments">
  <div class="title">
    <b>Comments</b>
    <span class="counts" data-testid="review-comment-count" data-open={counts.open} data-total={counts.total}>{counts.open} open of {counts.total}</span>
  </div>
  <div class="filter"><CheckBox label="Open only" bind:checked={onlyOpen} testid="review-filter-open" /></div>
  <div class="list w7-scroll" role="list">
    {#each roots as c (c.id)}
      <button type="button" class="row" class:selected={c.id === selectedId} data-testid="review-comment-row" data-comment-id={c.id} data-state={c.state} data-severity={c.severity} onclick={() => onselect(c)}>
        <span class="head">
          <span class="dot {c.severity}" title={SEVERITY_LABELS[c.severity]}></span>
          <span class="loc">{commentLocation(c)}</span>
          {#if c.state !== 'open'}<span class="state">{c.state === 'sent' ? 'sent' : 'resolved'}</span>{/if}
        </span>
        <span class="text">{c.body}</span>
        {#if replies(c) > 0}<span class="rep">{replies(c)} {replies(c) === 1 ? 'reply' : 'replies'}</span>{/if}
      </button>
    {:else}
      <div class="empty" data-testid="review-comments-empty">{comments.length === 0 ? 'No comments yet. Click a line number in the diff to add one.' : 'No open comments.'}</div>
    {/each}
  </div>
  <div class="foot">
    <Button data-testid="review-send-all" disabled={counts.open === 0} onclick={onsendall}>Send all open comments...</Button>
  </div>
</section>

<style>
  .panel {
    flex: none;
    width: 250px;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-window);
    border: 1px solid var(--w7-panel-border);
  }
  .title {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 3px 8px;
    background: linear-gradient(#fff, #e8eef6);
    border-bottom: 1px solid var(--w7-panel-border);
  }
  .counts {
    color: var(--w7-text-muted);
  }
  .filter {
    flex: none;
    padding: 3px 8px;
  }
  .list {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .row {
    display: flex;
    flex-direction: column;
    gap: 1px;
    width: 100%;
    padding: 3px 8px;
    border: 0;
    border-bottom: 1px solid #edf0f5;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: default;
  }
  .row:hover {
    background: var(--w7-hot-face);
  }
  .row.selected {
    background: var(--w7-select-face, #dcebfc);
  }
  .row[data-state='resolved'] .text,
  .row[data-state='sent'] .text {
    text-decoration: line-through;
    opacity: 0.6;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .loc {
    font-family: var(--w7-font-mono);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }
  .dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #7a8aa0;
  }
  .dot.blocker {
    background: #c42b1c;
  }
  .dot.major {
    background: #e07b00;
  }
  .dot.minor {
    background: #b08a00;
  }
  .state,
  .rep {
    color: var(--w7-text-muted);
    font-size: 11px;
  }
  .text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .empty {
    padding: 10px 8px;
    color: var(--w7-text-muted);
  }
  .foot {
    flex: none;
    padding: 6px;
    border-top: 1px solid var(--w7-panel-border);
    display: flex;
    justify-content: center;
  }
  .foot :global(.w7-btn) {
    min-width: 0;
  }
</style>

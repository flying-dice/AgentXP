<script lang="ts">
  /** The comments list panel: every thread of the review with where it is, its severity and state, and "Send comments to chat". */
  import { SEVERITY_LABELS, commentLocation, sortComments, type ReviewCommentDto } from '@shared/review'
  import Button from '../../kit/atoms/Button.svelte'
  import Icon from '../../kit/atoms/Icon.svelte'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import { commentCounts } from './reviewModel'

  interface Props {
    comments: readonly ReviewCommentDto[]
    selectedId?: number | null
    onselect: (comment: ReviewCommentDto) => void
    onsendall: () => void
    /** Comments an agent just added or changed: their rows flash. */
    flash?: ReadonlySet<number>
  }

  let { comments, selectedId = null, onselect, onsendall, flash = new Set() }: Props = $props()

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
  <div class="filter">
    <CheckBox label="Open only" bind:checked={onlyOpen} testid="review-filter-open" />
    <span class="sentcol" aria-hidden="true">Sent</span>
  </div>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="list xp-scroll" role="group" tabindex="0" aria-label="Comments">
    {#each roots as c (c.id)}
      <button type="button" class="row" class:selected={c.id === selectedId} data-testid="review-comment-row" data-comment-id={c.id} data-selected={c.id === selectedId ? 'true' : undefined} data-flash={flash.has(c.id) ? 'true' : undefined} class:flash={flash.has(c.id)} data-state={c.state} data-severity={c.severity} onclick={() => onselect(c)}>
        <span class="head">
          <span class="dot {c.severity}" aria-hidden="true"></span>
          <span class="level" data-testid="review-comment-level">{SEVERITY_LABELS[c.severity]}</span>
          <span class="loc">{commentLocation(c)}</span>
          {#if c.state === 'resolved'}<span class="state">Resolved</span>{/if}
          <span class="sent" data-testid="review-comment-sent" data-sent={c.state === 'sent' ? 'yes' : 'no'}>
            {#if c.state === 'sent'}<Icon name="check" size={12} title="Sent to chat" />{/if}
          </span>
        </span>
        <span class="text" title={c.body}>{c.body}</span>
        {#if replies(c) > 0}<span class="rep">{replies(c)} {replies(c) === 1 ? 'reply' : 'replies'}</span>{/if}
      </button>
    {:else}
      <div class="empty" data-testid="review-comments-empty">{comments.length === 0 ? 'No comments yet. Click a line number in the diff to add one.' : 'No open comments.'}</div>
    {/each}
  </div>
  <div class="foot">
    <Button data-testid="review-send-all" disabled={counts.open === 0} onclick={onsendall}>Send comments to chat...</Button>
  </div>
</section>

<style>
  .panel {
    flex: none;
    width: 250px;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--xp-window);
    border: 1px solid var(--xp-panel-border);
  }
  .title {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 3px 8px;
    background: linear-gradient(#fff, #e8eef6);
    border-bottom: 1px solid var(--xp-panel-border);
  }
  .counts {
    color: var(--xp-text-muted);
  }
  .filter {
    flex: none;
    padding: 3px 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
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
    background: var(--xp-hot-face);
  }
  .row.selected {
    background: var(--xp-select-face, #d6dff7);
  }
  .row.flash {
    outline: 2px solid var(--xp-change-cue);
    outline-offset: -2px;
    background: var(--xp-change-cue-face);
  }
  .row[data-state='resolved'] .text {
    color: var(--xp-text-muted);
  }
  .sent {
    flex: none;
    width: 34px;
    display: inline-flex;
    justify-content: center;
    color: #237a23;
  }
  .sentcol {
    float: right;
    width: 34px;
    text-align: center;
    color: var(--xp-text-muted);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .level {
    flex: none;
    font-weight: bold;
  }
  .loc {
    font-family: var(--xp-font-mono);
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
    color: var(--xp-text-muted);
    font-size: 11px;
  }
  /* The words of a comment wrap: a short remark is read whole (UX-167). */
  .text {
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .empty {
    padding: 10px 8px;
    color: var(--xp-text-muted);
  }
  .foot {
    flex: none;
    padding: 6px;
    border-top: 1px solid var(--xp-panel-border);
    display: flex;
    justify-content: center;
  }
  .foot :global(.xp-btn) {
    min-width: 0;
  }
</style>

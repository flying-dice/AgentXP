<script lang="ts">
  /** One comment thread, MR style: the comments (author, severity badge, body) and Resolve, Reply, Delete, Send actions. */
  import { SEVERITY_LABELS, type ReviewCommentDto, type ReviewSeverity } from '@shared/review'
  import Button from '../../kit/atoms/Button.svelte'
  import type { IconName } from '../../kit/atoms/icons'
  import ReviewComposer from './ReviewComposer.svelte'
  import type { ReviewThread } from './reviewModel'

  interface Props {
    thread: ReviewThread
    /** The reviewer's name (the agent) shown as the author of agent comments. */
    reviewer?: string
    onresolve: (comment: ReviewCommentDto, resolved: boolean) => void
    onreply: (root: ReviewCommentDto, body: string) => void
    ondelete: (comment: ReviewCommentDto) => void
    onsend: (comment: ReviewCommentDto) => void
  }

  let { thread, reviewer = 'Reviewer', onresolve, onreply, ondelete, onsend }: Props = $props()

  let replying = $state(false)
  /** Below this width the buttons of a thread are icon buttons with tooltips (UX-41). */
  const COMPACT_BELOW = 420
  let width = $state(0)
  const compact = $derived(width > 0 && width < COMPACT_BELOW)
  const root = $derived(thread.root)
  const resolved = $derived(root.state === 'resolved')
  const author = (c: ReviewCommentDto): string => (c.author === 'agent' ? reviewer : 'You')
  const range = (c: ReviewCommentDto): string => (c.lineEnd > c.lineStart ? `lines ${c.lineStart}-${c.lineEnd}` : `line ${c.lineStart}`)
</script>

{#snippet action(testid: string, label: string, icon: IconName, run: () => void, disabled = false)}
  {#if compact}
    <Button variant="flat" class="icon" {icon} data-testid={testid} aria-label={label.replace('...', '')} title={label.replace('...', '')} {disabled} onclick={run} />
  {:else}
    <Button variant="flat" data-testid={testid} {disabled} onclick={run}>{label}</Button>
  {/if}
{/snippet}

<div class="thread" bind:clientWidth={width} data-testid="review-thread" data-comment-id={root.id} data-state={root.state} data-severity={root.severity} class:resolved>
  {#each [root, ...thread.replies] as c (c.id)}
    <div class="comment" data-testid="review-comment" data-comment-id={c.id} data-author={c.author} data-reply={c.parentId !== null ? '' : undefined}>
      <div class="meta">
        <b class="author" data-testid="review-comment-author">{author(c)}</b>
        {#if c.parentId === null}
          <span class="badge {c.severity}" data-testid="review-comment-severity" data-severity={c.severity}>{SEVERITY_LABELS[c.severity as ReviewSeverity]}</span>
          <span class="range">{range(c)}{c.side === 'old' ? ', before the change' : ''}</span>
          {#if c.state !== 'open'}<span class="state" data-testid="review-comment-state">{c.state === 'sent' ? 'Sent to chat' : 'Resolved'}</span>{/if}
        {/if}
      </div>
      <div class="body" data-testid="review-comment-body">{c.body}</div>
      {#if c.parentId !== null}
        <div class="actions">
          <Button variant="flat" data-testid="review-comment-delete" onclick={() => ondelete(c)}>Delete</Button>
        </div>
      {/if}
    </div>
  {/each}
  <div class="actions">
    {@render action('review-comment-resolve', resolved ? 'Reopen' : 'Resolve', 'check', () => onresolve(root, !resolved))}
    {@render action('review-comment-reply', 'Reply', 'edit', () => (replying = !replying))}
    {@render action('review-comment-send', 'Send to chat...', 'session', () => onsend(root), resolved)}
    {@render action('review-comment-delete', 'Delete', 'delete', () => ondelete(root))}
  </div>
  {#if replying}
    <ReviewComposer
      severity={false}
      submitText="Reply"
      onsubmit={(body) => {
        replying = false
        onreply(root, body)
      }}
      oncancel={() => (replying = false)}
    />
  {/if}
</div>

<style>
  .thread {
    margin: 4px 8px 6px 64px;
    max-width: 640px;
    background: #fffdf3;
    border: 1px solid #d9c98a;
    border-left: 4px solid #d9a400;
    border-radius: 3px;
    font: var(--w7-font);
    white-space: normal;
  }
  .thread[data-severity='blocker'] {
    border-left-color: #c42b1c;
  }
  .thread[data-severity='major'] {
    border-left-color: #e07b00;
  }
  .thread[data-severity='nit'] {
    border-left-color: #7a8aa0;
  }
  .thread.resolved {
    opacity: 0.65;
    background: #f1f5ee;
    border-color: #b9c9ad;
  }
  .comment {
    padding: 4px 8px;
  }
  .comment[data-reply] {
    margin-left: 14px;
    border-top: 1px dotted #d9c98a;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .badge {
    padding: 0 5px;
    border-radius: 8px;
    font-size: 11px;
    color: #fff;
    background: #7a8aa0;
  }
  .badge.blocker {
    background: #c42b1c;
  }
  .badge.major {
    background: #e07b00;
  }
  .badge.minor {
    background: #b08a00;
  }
  .range,
  .state {
    color: var(--w7-text-muted);
    font-size: 11px;
  }
  .state {
    margin-left: auto;
    font-style: italic;
  }
  .body {
    margin-top: 2px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    padding: 2px 6px 4px;
  }
  .actions :global(.w7-btn) {
    min-width: 0;
    height: 20px;
    padding: 0 6px;
  }
  .actions :global(.w7-btn.icon) {
    width: 24px;
    height: 24px;
    padding: 0;
  }
</style>

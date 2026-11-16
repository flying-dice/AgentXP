<script lang="ts">
  /**
   * The expanded (WinDiff-style) view of one file: the whole file as rows, a left margin bar of coloured blocks
   * (red = removed lines, yellow = added lines), unified or side by side, with the comment threads under their lines.
   * Clicking a line number (the gutter) opens the box for a new user comment.
   */
  import type { ReviewCommentDto, ReviewFileDto, ReviewSeverity, ReviewSide } from '@shared/review'
  import ReviewComposer from './ReviewComposer.svelte'
  import ReviewThreadView from './ReviewThread.svelte'
  import { fileThreads, placeThreads, splitAnchor, unifiedAnchor, type FileView, type ReviewLayout } from './reviewModel'

  interface Props {
    file: ReviewFileDto
    view: FileView
    layout: ReviewLayout
    comments: readonly ReviewCommentDto[]
    reviewer?: string
    selectedRow?: number | null
    /** The diff takes the height of its rows instead of scrolling inside (the "All changes" page scrolls as a whole). */
    flow?: boolean
    onselectrow?: (row: number) => void
    oncomment: (input: { path: string; side: ReviewSide; line: number; body: string; severity: ReviewSeverity }) => void
    onresolve: (comment: ReviewCommentDto, resolved: boolean) => void
    onreply: (root: ReviewCommentDto, body: string) => void
    ondelete: (comment: ReviewCommentDto) => void
    onsend: (comment: ReviewCommentDto) => void
  }

  let { file, view, layout, comments, reviewer, selectedRow = null, flow = false, onselectrow, oncomment, onresolve, onreply, ondelete, onsend }: Props = $props()

  let scroller = $state<HTMLElement | null>(null)
  let composing = $state<{ row: number; side: ReviewSide; line: number } | null>(null)
  let scrollTop = $state(0)
  let clientHeight = $state(0)
  let scrollHeight = $state(0)

  const threads = $derived(fileThreads(comments, file.path))
  const placed = $derived(placeThreads(threads, (c) => (layout === 'split' ? splitAnchor(view.split, c) : unifiedAnchor(view.lines, c))))
  const rowCount = $derived(layout === 'split' ? view.split.length : view.lines.length)
  const viewport = $derived({ top: scrollHeight > 0 ? scrollTop / scrollHeight : 0, height: scrollHeight > 0 ? Math.min(1, clientHeight / scrollHeight) : 1 })

  // A file change closes an open box.
  $effect(() => {
    void file.path
    composing = null
  })

  /** Scrolls the row into view (the host calls it for F7). */
  export function scrollToRow(row: number): void {
    scroller?.querySelector(`[data-row="${row}"]`)?.scrollIntoView({ block: 'center' })
  }

  function onscroll(): void {
    if (!scroller) return
    scrollTop = scroller.scrollTop
    clientHeight = scroller.clientHeight
    scrollHeight = scroller.scrollHeight
  }

  $effect(() => {
    void rowCount
    void placed
    if (scroller) queueMicrotask(onscroll)
  })

  function clickMargin(event: MouseEvent): void {
    if (!scroller) return
    const bar = event.currentTarget as HTMLElement
    const at = (event.clientY - bar.getBoundingClientRect().top) / bar.clientHeight
    scroller.scrollTop = at * scroller.scrollHeight - scroller.clientHeight / 2
  }

  const startComment = (row: number, side: ReviewSide, line: number | undefined): void => {
    if (line !== undefined) composing = { row, side, line }
  }

  const label = (side: ReviewSide, line: number): string => `${file.path}:${line}${side === 'old' ? ' (before the change)' : ''}`
</script>

{#snippet composer(row: number)}
  {#if composing?.row === row}
    <div class="inline">
      <ReviewComposer
        label={label(composing.side, composing.line)}
        onsubmit={(body, severity) => {
          if (composing) oncomment({ path: file.path, side: composing.side, line: composing.line, body, severity })
          composing = null
        }}
        oncancel={() => (composing = null)}
      />
    </div>
  {/if}
  {#each placed.byRow.get(row) ?? [] as thread (thread.root.id)}
    <ReviewThreadView {thread} {reviewer} {onresolve} {onreply} {ondelete} {onsend} />
  {/each}
{/snippet}

<div class="diff" class:flow data-testid="review-diff" data-path={file.path} data-layout={layout}>
  <div class="margin" data-testid="review-margin" role="presentation" onclick={clickMargin}>
    {#each view.blocks as block, i (i)}
      <button
        type="button"
        class="block {block.kind}"
        data-testid="review-margin-block"
        data-kind={block.kind}
        data-row={block.row}
        aria-label="{block.kind === 'del' ? 'Removed' : block.kind === 'add' ? 'Added' : 'Changed'} lines, block {i + 1} of {view.blocks.length}"
        style="top:{block.top * 100}%;height:max({block.height * 100}%, 3px)"
        onclick={(event) => {
          event.stopPropagation()
          onselectrow?.(block.row)
          scrollToRow(block.row)
        }}
      ></button>
    {/each}
    <div class="viewport" style="top:{viewport.top * 100}%;height:{viewport.height * 100}%"></div>
  </div>

  <div class="body">
  {#if layout === 'unified' && rowCount > 0}
    <div class="cols" data-testid="review-columns" aria-hidden="true"><span class="no">Old</span><span class="no">New</span><span class="mark"></span><span class="text">Text</span></div>
  {:else if layout === 'split' && rowCount > 0}
    <div class="cols split" data-testid="review-columns" aria-hidden="true"><span class="half"><span class="no">Old</span><span class="text">Before the change</span></span><span class="half"><span class="no">New</span><span class="text">After the change</span></span></div>
  {/if}
  <!-- A scrolling region is reachable by keyboard (tabindex) and has a name. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="rows w7-scroll" bind:this={scroller} {onscroll} role="region" tabindex={flow ? -1 : 0} aria-label="Diff of {file.path}">
    {#if file.binary}
      <div class="note">Binary file: there is no text diff.</div>
    {:else if file.tooLarge}
      <div class="note">This file is too large to show here.</div>
    {:else if rowCount === 0}
      <div class="note">The file is empty.</div>
    {:else if layout === 'unified'}
      {#each view.lines as line, i (i)}
        <div class="row {line.kind}" class:selected={selectedRow === i} data-testid="review-row" data-row={i} data-kind={line.kind}>
          <button type="button" class="no old" data-testid="review-gutter-add" data-side="old" data-line={line.oldNo} disabled={line.oldNo === undefined || line.kind === 'add'} aria-label="Comment on old line {line.oldNo}" onclick={() => startComment(i, 'old', line.oldNo)}>{line.oldNo ?? ''}</button>
          <button type="button" class="no new" data-testid="review-gutter-add" data-side="new" data-line={line.newNo} disabled={line.newNo === undefined} aria-label="Comment on line {line.newNo}" onclick={() => startComment(i, 'new', line.newNo)}>{line.newNo ?? ''}</button>
          <span class="mark">{line.kind === 'add' ? '+' : line.kind === 'del' ? '-' : ' '}</span>
          <span class="text" role="presentation" onclick={() => onselectrow?.(i)} onkeydown={() => {}}>{line.text}</span>
        </div>
        {@render composer(i)}
      {/each}
    {:else}
      {#each view.split as row, i (i)}
        <div class="row split" class:selected={selectedRow === i} data-testid="review-row" data-row={i} data-kind={row.left && row.right ? (row.left.kind === 'context' ? 'context' : 'both') : row.left ? 'del' : 'add'}>
          <div class="half {row.left && row.left.kind !== 'context' ? 'del' : ''} {row.left ? '' : 'blank'}">
            <button type="button" class="no" data-testid="review-gutter-add" data-side="old" data-line={row.left?.oldNo} disabled={!row.left} aria-label="Comment on old line {row.left?.oldNo}" onclick={() => startComment(i, 'old', row.left?.oldNo)}>{row.left?.oldNo ?? ''}</button>
            <span class="text" role="presentation" onclick={() => onselectrow?.(i)} onkeydown={() => {}}>{row.left?.text ?? ''}</span>
          </div>
          <div class="half {row.right && row.right.kind !== 'context' ? 'add' : ''} {row.right ? '' : 'blank'}">
            <button type="button" class="no" data-testid="review-gutter-add" data-side="new" data-line={row.right?.newNo} disabled={!row.right} aria-label="Comment on line {row.right?.newNo}" onclick={() => startComment(i, 'new', row.right?.newNo)}>{row.right?.newNo ?? ''}</button>
            <span class="text" role="presentation" onclick={() => onselectrow?.(i)} onkeydown={() => {}}>{row.right?.text ?? ''}</span>
          </div>
        </div>
        {@render composer(i)}
      {/each}
    {/if}
    {#if placed.orphans.length > 0}
      <div class="orphans" data-testid="review-orphans">
        <div class="note">Comments on lines that are no longer in the diff:</div>
        {#each placed.orphans as thread (thread.root.id)}
          <ReviewThreadView {thread} {reviewer} {onresolve} {onreply} {ondelete} {onsend} />
        {/each}
      </div>
    {/if}
  </div>
  </div>
</div>

<style>
  .diff {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    background: var(--w7-code-bg, #fff);
    border: 1px solid var(--w7-panel-border);
  }
  .margin {
    position: relative;
    flex: none;
    width: 14px;
    background: #eef1f6;
    border-right: 1px solid var(--w7-panel-border);
  }
  .block {
    position: absolute;
    left: 2px;
    right: 2px;
    padding: 0;
    border: 0;
    cursor: default;
  }
  .block.del {
    background: #e0453a;
  }
  .block.add {
    background: #f2c40f;
  }
  .block.both {
    background: linear-gradient(#e0453a 50%, #f2c40f 50%);
  }
  .viewport {
    position: absolute;
    left: 0;
    right: 0;
    pointer-events: none;
    background: rgba(40, 80, 140, 0.12);
    border-top: 1px solid rgba(40, 80, 140, 0.45);
    border-bottom: 1px solid rgba(40, 80, 140, 0.45);
  }
  .body {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .cols {
    flex: none;
    display: flex;
    background: linear-gradient(#fff, #e8eef6);
    border-bottom: 1px solid var(--w7-panel-border);
    color: var(--w7-text-muted);
    line-height: 17px;
  }
  .cols .no {
    background: transparent;
    color: inherit;
    text-align: right;
    padding: 0 6px 0 0;
  }
  .cols.split .half {
    display: flex;
  }
  .cols.split .text {
    padding-left: 8px;
  }
  .rows {
    flex: 1;
    min-width: 0;
    overflow: auto;
    font: var(--w7-font-mono);
  }
  .flow {
    flex: none;
  }
  .flow .rows {
    flex: none;
    overflow: visible;
  }
  .row {
    display: flex;
    min-width: max-content;
    white-space: pre;
    line-height: 17px;
  }
  .row.add {
    background: #fff7c2;
  }
  .row.del {
    background: #fde0dd;
  }
  .row.selected {
    outline: 1px solid var(--w7-select-border, #7da2ce);
    outline-offset: -1px;
  }
  .no {
    flex: none;
    width: 44px;
    padding: 0 6px 0 0;
    border: 0;
    background: var(--w7-code-gutter-bg, #f3f3f3);
    color: var(--w7-code-gutter, #808080);
    font: inherit;
    text-align: right;
    cursor: default;
  }
  .no:not(:disabled):hover {
    background: #cfe1f7;
    color: #0b3b9c;
  }
  .mark {
    flex: none;
    width: 16px;
    text-align: center;
    color: var(--w7-text-muted);
  }
  .text {
    flex: 1;
    padding-right: 12px;
  }
  .row.split {
    min-width: 0;
  }
  .half {
    flex: 1 1 50%;
    min-width: 0;
    display: flex;
    overflow: hidden;
  }
  .half + .half {
    border-left: 1px solid var(--w7-panel-border);
  }
  .half.add {
    background: #fff7c2;
  }
  .half.del {
    background: #fde0dd;
  }
  .half.blank {
    background: #f4f4f4;
  }
  .inline {
    margin: 4px 8px 6px 64px;
    max-width: 640px;
    font: var(--w7-font);
    white-space: normal;
  }
  .note {
    padding: 8px 12px;
    color: var(--w7-text-muted);
    font: var(--w7-font);
  }
  .orphans {
    border-top: 1px dashed var(--w7-panel-border);
  }
</style>

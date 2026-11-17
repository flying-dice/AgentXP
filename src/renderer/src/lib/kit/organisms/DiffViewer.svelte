<script lang="ts">
  import Button from '../atoms/Button.svelte'
  import { computeDiff, diffStats, parseUnifiedDiff, toSplitRows, type DiffFile, type DiffLine } from '@shared/diff'

  interface Props {
    /** `data-testid` of the control (agents and e2e specs find it by this id). */
    testid?: string
    /** Text input pair; ignored when `unified` is given. */
    oldText?: string
    newText?: string
    /** A unified diff (git diff / diff -u output). */
    unified?: string
    /** File name shown in the header for the text-pair input. */
    fileName?: string
    mode?: 'unified' | 'split'
    /** Unchanged lines around each change (text-pair input only). */
    context?: number
    /** Show the header with counts and the view toggle. */
    toolbar?: boolean
    maxHeight?: string
    /** Wrap long lines instead of scrolling sideways (the approval dialogs). */
    wrap?: boolean
    label?: string
    class?: string
  }

  let {
    testid,
    oldText = '',
    newText = '',
    unified,
    fileName,
    mode = $bindable('unified'),
    context = 3,
    toolbar = true,
    maxHeight,
    wrap = false,
    label = 'Changes',
    class: className = ''
  }: Props = $props()

  const files = $derived<DiffFile[]>(
    unified !== undefined
      ? parseUnifiedDiff(unified)
      : [{ newPath: fileName, hunks: computeDiff(oldText, newText, context) }].filter((f) => f.hunks.length > 0 || fileName !== undefined)
  )
  const stats = $derived(diffStats(files.flatMap((f) => f.hunks)))
  const empty = $derived(files.every((f) => f.hunks.length === 0))

  const sign = (line: DiffLine | undefined): string => (line?.kind === 'add' ? '+' : line?.kind === 'del' ? '-' : ' ')
  const title = (file: DiffFile): string => file.newPath ?? file.oldPath ?? ''
</script>

<div data-testid={testid} class="xp-diffviewer {className}" class:wrap style:max-height={maxHeight}>
  {#if toolbar}
    <div class="bar">
      <span class="summary">
        {#if files.length === 1 && title(files[0])}<span class="file">{title(files[0])}</span>{/if}
        <span class="cnt-add">+{stats.added}</span>
        <span class="cnt-del">&minus;{stats.removed}</span>
      </span>
      <span class="toggle" role="group" aria-label="Diff view">
        <Button isDefault={mode === 'unified'} aria-pressed={mode === 'unified'} onclick={() => (mode = 'unified')}>Unified</Button>
        <Button isDefault={mode === 'split'} aria-pressed={mode === 'split'} onclick={() => (mode = 'split')}>Side by side</Button>
      </span>
    </div>
  {/if}
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="scroll xp-scroll" tabindex="0" role="region" aria-label={label}>
    {#if empty}
      <div class="none">No differences.</div>
    {/if}
    {#each files as file, fi (fi)}
      {#if files.length > 1}<div class="filehead">{title(file)}</div>{/if}
      {#if mode === 'unified'}
        <div class="grid unified">
          {#each file.hunks as hunk, hi (hi)}
            <div class="row hunk"><span class="hh">{hunk.header}</span></div>
            {#each hunk.lines as line, li (li)}
              <div class="row {line.kind}">
                <span class="no">{line.oldNo ?? ''}</span>
                <span class="no">{line.newNo ?? ''}</span>
                <span class="sg">{sign(line)}</span>
                <span class="tx">{line.text}</span>
              </div>
            {/each}
          {/each}
        </div>
      {:else}
        <div class="grid split">
          {#each file.hunks as hunk, hi (hi)}
            <div class="row hunk"><span class="hh">{hunk.header}</span></div>
            {#each toSplitRows(hunk) as pair, pi (pi)}
              <div class="row">
                <span class="no {pair.left?.kind ?? 'blank'}">{pair.left?.oldNo ?? ''}</span>
                <span class="tx {pair.left?.kind ?? 'blank'}">{#if pair.left}{sign(pair.left)}{pair.left.text}{/if}</span>
                <span class="no {pair.right?.kind ?? 'blank'}">{pair.right?.newNo ?? ''}</span>
                <span class="tx {pair.right?.kind ?? 'blank'}">{#if pair.right}{sign(pair.right)}{pair.right.text}{/if}</span>
              </div>
            {/each}
          {/each}
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .xp-diffviewer {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    border: 1px solid var(--xp-list-border);
    background: var(--xp-window);
    color: var(--xp-text);
  }
  .bar {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 6px;
    background: var(--xp-face);
    border-bottom: 1px solid var(--xp-border-light);
  }
  .summary {
    display: inline-flex;
    gap: 8px;
    align-items: baseline;
    min-width: 0;
  }
  .file {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cnt-add {
    color: #0b7a0b;
  }
  .cnt-del {
    color: #b00000;
  }
  .toggle {
    display: inline-flex;
    gap: 4px;
  }
  .toggle :global(.xp-btn) {
    min-width: 0;
    height: 21px;
  }
  .scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    background: var(--xp-window);
  }
  .scroll:focus-visible {
    outline: var(--xp-focus-outline);
    outline-offset: -2px;
  }
  .none {
    padding: 8px;
    color: var(--xp-text-muted);
  }
  .filehead {
    padding: 2px 8px;
    background: var(--xp-face);
    border-bottom: 1px solid var(--xp-border-light);
    font-weight: 600;
  }

  .grid {
    display: grid;
    font: var(--xp-font-mono);
    font-size: 12px;
    user-select: text;
  }
  .grid.unified {
    grid-template-columns: auto auto auto 1fr;
    min-width: 100%;
    width: max-content;
  }
  .grid.split {
    grid-template-columns: auto minmax(0, 1fr) auto minmax(0, 1fr);
  }
  .row {
    display: contents;
  }
  .no,
  .sg,
  .tx,
  .hh {
    padding: 0 6px;
    white-space: pre;
    min-height: 17px;
  }
  .hh {
    grid-column: 1 / -1;
    background: var(--xp-diff-hunk-bg);
    color: var(--xp-diff-hunk-fg);
  }
  .no {
    min-width: 36px;
    text-align: right;
    color: #7a7a7a;
    user-select: none;
    border-right: 1px solid rgba(0, 0, 0, 0.08);
  }
  .sg {
    padding: 0 0 0 6px;
    user-select: none;
  }
  .split .tx,
  .wrap .tx {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .wrap .grid.unified {
    grid-template-columns: auto auto auto minmax(0, 1fr);
    width: 100%;
  }
  .split .no + .tx {
    border-right: 1px solid var(--xp-border-light);
  }
  .row.context > span,
  .tx.context {
    color: #222;
  }
  .row.del > span,
  .tx.del,
  .no.del {
    background: var(--xp-diff-del-bg);
    color: var(--xp-diff-del-fg);
  }
  .row.add > span,
  .tx.add,
  .no.add {
    background: var(--xp-diff-add-bg);
    color: var(--xp-diff-add-fg);
  }
  .row.del > .no,
  .row.add > .no,
  .no.del,
  .no.add {
    color: #7a7a7a;
  }
  .blank {
    background: #f4f2e8;
  }
</style>

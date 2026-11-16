<script lang="ts">
  import type { Snippet } from 'svelte'
  import Button from '../atoms/Button.svelte'
  import CheckBox from '../atoms/CheckBox.svelte'
  import { highlighter, plainTokens, type CodeToken } from './highlighter'
  import type { GutterMark } from './CodeViewer'

  interface Props {
    code: string
    /** Shiki language id or alias; unknown ids render as plain text. */
    language?: string
    /** 1-based line numbers (relative to `startLine`) drawn with a highlight band. */
    highlightLines?: number[]
    startLine?: number
    wordWrap?: boolean
    /** Show the Word wrap / Copy bar. */
    toolbar?: boolean
    /** Accessible name of the code region. */
    label?: string
    /** CSS max-height; the viewer scrolls beyond it. */
    maxHeight?: string
    /**
     * Version control marks in a narrow gutter left of the line numbers: a green bar for added lines, a blue bar
     * for modified ones, a red triangle between two lines for a deletion. With marks the overview ruler is shown too.
     */
    gutterMarks?: GutterMark[]
    /** A gutter mark or ruler tick was clicked. */
    onmarkclick?: (mark: GutterMark) => void
    /** Draw the overview ruler (change positions) beside the scrollbar; default: when there are marks. */
    ruler?: boolean
    /** Index (in `gutterMarks`) of the mark whose peek is open. */
    peekMark?: number | null
    /** Inline peek shown under the line of `peekMark` (under its last line; above line 1 for a deletion at the top). */
    peek?: Snippet<[GutterMark]>
    class?: string
  }

  let {
    code,
    language = 'text',
    highlightLines = [],
    startLine = 1,
    wordWrap = $bindable(false),
    toolbar = false,
    label = 'Code',
    maxHeight,
    gutterMarks,
    onmarkclick,
    ruler,
    peekMark = null,
    peek,
    class: className = ''
  }: Props = $props()

  let tokens = $state<CodeToken[][]>([])
  let scroller: HTMLDivElement | undefined = $state()

  const lines = $derived(tokens.length > 0 ? tokens : plainTokens(code))
  const highlighted = $derived(new Set(highlightLines.map((n) => n + startLine - 1)))
  const marks = $derived(gutterMarks ?? [])
  /** Per displayed line number: the bar kind and mark index (added/modified), and the deletions sitting below it. */
  const barAt = $derived.by(() => {
    const map = new Map<number, GutterMark>()
    for (const m of marks) if (m.kind !== 'deleted') for (let n = m.line; n <= m.end; n++) map.set(n, m)
    return map
  })
  const trianglesBelow = $derived.by(() => {
    const map = new Map<number, GutterMark>()
    for (const m of marks) if (m.kind === 'deleted') map.set(m.line, m)
    return map
  })
  const peeked = $derived(peekMark === null ? null : (marks[peekMark] ?? null))
  const peekAfter = $derived(peeked ? (peeked.kind === 'deleted' ? peeked.line : peeked.end) : null)
  const showRuler = $derived((ruler ?? marks.length > 0) && marks.length > 0)
  const total = $derived(Math.max(1, lines.length))
  const digits = $derived(String(startLine + lines.length - 1).length)

  $effect(() => {
    const source = code
    const lang = language
    tokens = plainTokens(source)
    let stale = false
    void highlighter.tokenize(source, lang).then((result) => {
      if (!stale) tokens = result
    })
    return () => {
      stale = true
    }
  })

  const copy = async (): Promise<void> => {
    const selection = window.getSelection()
    const selected = selection && scroller && selection.anchorNode && scroller.contains(selection.anchorNode) ? selection.toString() : ''
    try {
      await navigator.clipboard.writeText(selected || code)
    } catch {
      /* clipboard unavailable (insecure context): the user can still select and press Ctrl+C */
    }
  }
</script>

<div class="w7-codeviewer {className}" style:max-height={maxHeight}>
  {#if toolbar}
    <div class="bar">
      <CheckBox label="Word wrap" bind:checked={wordWrap} />
      <Button onclick={copy} icon="copy">Copy</Button>
    </div>
  {/if}
  <div class="body">
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="scroll w7-scroll" bind:this={scroller} tabindex="0" role="region" aria-label={label}>
    <div class="lines" class:wrap={wordWrap} style:--digits="{digits}ch">
      {#if peeked && peek && peekAfter === 0}
        <div class="peek" data-testid="code-hunk-peek" role="group" aria-label="Change">{@render peek(peeked)}</div>
      {/if}
      {#each lines as line, i (i)}
        {@const no = startLine + i}
        {@const bar = barAt.get(no)}
        {@const tri = trianglesBelow.get(no)}
        {@const topTri = i === 0 ? trianglesBelow.get(0) : undefined}
        <div class="row" class:hl={highlighted.has(no)} data-testid="code-line" data-line={no}>
          {#if gutterMarks}
            <span class="gutter">
              {#if bar}
                <button class="bar {bar.kind}" data-testid="code-gutter-mark" data-kind={bar.kind} data-line={no} data-index={bar.index} tabindex="-1" aria-label="{bar.kind} lines {bar.line}-{bar.end}" onclick={() => onmarkclick?.(bar)}></button>
              {/if}
              {#if topTri}
                <button class="tri top" data-testid="code-gutter-mark" data-kind="deleted" data-line={1} data-index={topTri.index} tabindex="-1" aria-label="Lines deleted above line 1" onclick={() => onmarkclick?.(topTri)}></button>
              {/if}
              {#if tri}
                <button class="tri" data-testid="code-gutter-mark" data-kind="deleted" data-line={no} data-index={tri.index} tabindex="-1" aria-label="Lines deleted below line {no}" onclick={() => onmarkclick?.(tri)}></button>
              {/if}
            </span>
          {/if}
          <span class="no" class:marked={gutterMarks !== undefined} aria-hidden="true">{no}</span>
          <code class="code"
            >{#each line as t, j (j)}<span
                style:color={t.color}
                style:font-weight={t.bold ? 'bold' : undefined}
                style:font-style={t.italic ? 'italic' : undefined}>{t.content}</span
              >{/each}</code
          >
        </div>
        {#if peeked && peek && peekAfter === no}
          <div class="peek" data-testid="code-hunk-peek" role="group" aria-label="Change">{@render peek(peeked)}</div>
        {/if}
      {/each}
    </div>
  </div>
  {#if showRuler}
    <div class="ruler" role="presentation" aria-label="Overview ruler">
      {#each marks as m (m.index)}
        <button
          class="tick {m.kind}"
          data-testid="code-ruler-tick"
          data-kind={m.kind}
          data-line={m.line}
          tabindex="-1"
          style:top="{(Math.max(0, (m.kind === 'deleted' ? m.line : m.line - 1)) / total) * 100}%"
          style:height="max(3px, {((m.kind === 'deleted' ? 0 : m.end - m.line + 1) / total) * 100}%)"
          aria-label="{m.kind} at line {Math.max(1, m.line)}"
          title="{m.kind} at line {Math.max(1, m.line)}"
          onclick={() => onmarkclick?.(m)}
        ></button>
      {/each}
    </div>
  {/if}
  </div>
</div>

<style>
  .w7-codeviewer {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    border: 1px solid var(--w7-list-border);
    background: var(--w7-code-bg);
    color: #000;
  }
  .bar {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 6px;
    background: var(--w7-face);
    border-bottom: 1px solid var(--w7-border-light);
  }
  .scroll {
    flex: 1 1 0;
    min-height: 0;
    overflow: auto;
    background: var(--w7-code-bg);
  }
  .scroll:focus-visible {
    outline: var(--w7-focus-outline);
    outline-offset: -2px;
  }
  .lines {
    min-width: 100%;
    width: max-content;
    padding: 3px 0;
    font: var(--w7-font-mono);
    font-size: 12px;
  }
  .lines.wrap {
    width: auto;
  }
  .row {
    display: flex;
    min-height: 17px;
  }
  .row.hl {
    background: var(--w7-code-highlight);
  }
  .gutter {
    position: sticky;
    left: 0;
    z-index: 1;
    flex: none;
    width: 8px;
    background: var(--w7-code-gutter-bg);
  }
  .gutter .bar,
  .gutter .tri {
    position: absolute;
    padding: 0;
    border: 0;
    cursor: pointer;
  }
  .gutter .bar {
    left: 2px;
    top: 0;
    bottom: 0;
    width: 4px;
  }
  .bar.added {
    background: var(--w7-git-gutter-added);
  }
  .bar.modified {
    background: var(--w7-git-gutter-modified);
  }
  .tri {
    left: 0;
    bottom: -4px;
    z-index: 2;
    width: 8px;
    height: 8px;
    background: var(--w7-git-gutter-deleted);
    clip-path: polygon(0 0, 100% 50%, 0 100%);
  }
  .tri.top {
    top: -4px;
    bottom: auto;
  }
  .no.marked {
    left: 8px;
  }
  .no {
    position: sticky;
    left: 0;
    flex: none;
    box-sizing: content-box;
    width: var(--digits);
    padding: 0 10px 0 8px;
    text-align: right;
    color: var(--w7-code-gutter);
    background: var(--w7-code-gutter-bg);
    border-right: 1px solid #e0e0e0;
    user-select: none;
  }
  .row.hl .no {
    background: var(--w7-code-highlight);
  }
  .code {
    flex: 1;
    min-width: 0;
    padding: 0 8px 0 8px;
    font: inherit;
    white-space: pre;
    user-select: text;
    cursor: text;
  }
  .peek {
    position: sticky;
    left: 0;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    margin: 1px 0;
    border-top: 1px solid #8ea6c5;
    border-bottom: 1px solid #8ea6c5;
    background: var(--w7-face);
    font: var(--w7-font);
    white-space: normal;
  }
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
  }
  .ruler {
    position: relative;
    flex: none;
    width: 10px;
    background: linear-gradient(90deg, #f4f4f4, #eaeaea);
    border-left: 1px solid #d4d4d4;
  }
  .tick {
    position: absolute;
    left: 1px;
    right: 1px;
    padding: 0;
    border: 0;
    cursor: pointer;
    opacity: 0.9;
  }
  .tick.added {
    background: var(--w7-git-gutter-added);
  }
  .tick.modified {
    background: var(--w7-git-gutter-modified);
  }
  .tick.deleted {
    background: var(--w7-git-gutter-deleted);
  }
  .wrap .code {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>

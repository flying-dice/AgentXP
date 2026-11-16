<script lang="ts">
  import Button from '../atoms/Button.svelte'
  import CheckBox from '../atoms/CheckBox.svelte'
  import { highlighter, plainTokens, type CodeToken } from './highlighter'

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
    class: className = ''
  }: Props = $props()

  let tokens = $state<CodeToken[][]>([])
  let scroller: HTMLDivElement | undefined = $state()

  const lines = $derived(tokens.length > 0 ? tokens : plainTokens(code))
  const highlighted = $derived(new Set(highlightLines.map((n) => n + startLine - 1)))
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

<div class="xp-codeviewer {className}" style:max-height={maxHeight}>
  {#if toolbar}
    <div class="bar">
      <CheckBox label="Word wrap" bind:checked={wordWrap} />
      <Button onclick={copy} icon="copy">Copy</Button>
    </div>
  {/if}
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="scroll w7-scroll" bind:this={scroller} tabindex="0" role="region" aria-label={label}>
    <div class="lines" class:wrap={wordWrap} style:--digits="{digits}ch">
      {#each lines as line, i (i)}
        {@const no = startLine + i}
        <div class="row" class:hl={highlighted.has(no)}>
          <span class="no" aria-hidden="true">{no}</span>
          <code class="code"
            >{#each line as t, j (j)}<span
                style:color={t.color}
                style:font-weight={t.bold ? 'bold' : undefined}
                style:font-style={t.italic ? 'italic' : undefined}>{t.content}</span
              >{/each}</code
          >
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .xp-codeviewer {
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
    flex: 1;
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
  .wrap .code {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>

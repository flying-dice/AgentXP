<script lang="ts">
  import { tick } from 'svelte'
  import { parseAnsi } from './ansi'

  interface Props {
    /** Raw console output, ANSI SGR escapes allowed. */
    text: string
    /** Shows a blinking cursor and marks the log busy. */
    running?: boolean
    /** Follow new output unless the user scrolled up. */
    autoScroll?: boolean
    maxHeight?: string
    /** A hollow block cursor that is always there: the console cannot be typed into (a steady block: it never blinks, because a blinking cursor says "type here"). */
    lockedCursor?: boolean
    label?: string
    class?: string
  }

  let { text, running = false, autoScroll = true, maxHeight, lockedCursor = false, label = 'Console output', class: className = '' }: Props = $props()

  let scroller: HTMLDivElement | undefined = $state()
  let pinned = true

  const spans = $derived(parseAnsi(text))

  const onScroll = (): void => {
    if (!scroller) return
    pinned = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= 4
  }

  $effect(() => {
    void text
    if (!autoScroll || !pinned) return
    void tick().then(() => {
      if (scroller) scroller.scrollTop = scroller.scrollHeight
    })
  })
</script>

<div class="w7-console {className}" style:max-height={maxHeight}>
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="scroll w7-scroll"
    bind:this={scroller}
    onscroll={onScroll}
    role="log"
    aria-label={label}
    aria-busy={running}
    tabindex="0"
  >
    <pre class="out">{#each spans as s, i (i)}<span
          style:color={s.fg}
          style:background={s.bg}
          style:font-weight={s.bold ? 'bold' : undefined}
          style:opacity={s.dim ? 0.6 : undefined}
          style:text-decoration={s.underline ? 'underline' : undefined}>{s.text}</span
        >{/each}{#if lockedCursor}<span class="cursor locked" aria-hidden="true" data-testid="console-cursor-locked"></span>{:else if running}<span class="cursor blink" aria-hidden="true"></span>{/if}</pre>
  </div>
</div>

<style>
  .w7-console {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    background: var(--w7-console-bg);
    border: 1px solid #000;
  }
  .scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    background: var(--w7-console-bg);
    color-scheme: light;
  }
  .scroll:focus-visible {
    outline: 1px dotted #ccc;
    outline-offset: -3px;
  }
  .out {
    margin: 0;
    padding: 6px 8px;
    min-height: 100%;
    background: var(--w7-console-bg);
    color: var(--w7-console-fg);
    font: var(--w7-font-mono);
    line-height: 1.4;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    user-select: text;
    cursor: text;
  }
  .cursor {
    display: inline-block;
    width: 0.6em;
    height: 1.1em;
    margin-left: 1px;
    vertical-align: text-bottom;
    background: var(--w7-console-fg);
  }
  .cursor.blink {
    animation: blink 1s steps(1) infinite;
  }
  /* Hollow block: the lock-style outline that says "look, do not type". */
  .cursor.locked {
    box-sizing: border-box;
    background: transparent;
    border: 1px solid var(--w7-console-fg);
  }
  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
</style>

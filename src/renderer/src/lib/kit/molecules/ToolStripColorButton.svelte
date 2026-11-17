<script lang="ts">
  /**
   * An Office XP colour button for a tool strip: the glyph with a bar of the current colour under it applies that
   * colour; the narrow arrow beside it opens a colour palette.
   */
  import type { Snippet } from 'svelte'
  import { clickOutside } from '../actions/clickOutside'
  import { tooltip } from '../actions/tooltip'
  import ColorPalette from '../atoms/ColorPalette.svelte'

  interface Props {
    /** The colour of the bar (hex) or `none`. */
    value: string
    /** A 16 × 12 glyph drawn above the colour bar. */
    glyph: Snippet
    title: string
    allowNone?: boolean
    noneLabel?: string
    recent?: string[]
    disabled?: boolean
    /** `data-testid` of the main button; the arrow is `<testid>-arrow` and the palette `<testid>-palette`. */
    testid?: string
    /** The main button, or a colour picked from the palette. */
    onpick: (color: string) => void
  }

  let { value, glyph, title, allowNone = false, noneLabel, recent = [], disabled = false, testid, onpick }: Props = $props()

  let open = $state(false)
  let arrow = $state<HTMLButtonElement | null>(null)
  let pos = $state({ left: 0, top: 0 })

  function show(): void {
    if (!arrow || disabled) return
    const r = arrow.parentElement!.getBoundingClientRect()
    pos = { left: r.left, top: r.bottom - 1 }
    open = true
  }

  function pick(color: string): void {
    open = false
    onpick(color)
    arrow?.focus()
  }
</script>

<span class="xp-colorbtn" class:open use:clickOutside={{ handler: () => (open = false) }}>
  <button type="button" class="main" {disabled} aria-label={title} use:tooltip={title} data-testid={testid} onclick={() => onpick(value)}>
    <span class="glyph">{@render glyph()}</span>
    <span class="bar" class:none={value === 'none'} style:background={value === 'none' ? undefined : value}></span>
  </button>
  <button
    type="button"
    class="arrow"
    bind:this={arrow}
    {disabled}
    aria-label="{title} options"
    aria-haspopup="true"
    aria-expanded={open}
    data-testid={testid ? `${testid}-arrow` : undefined}
    onclick={() => (open ? (open = false) : show())}
    onkeydown={(e) => {
      if (e.key === 'ArrowDown' && !open) {
        e.preventDefault()
        show()
      } else if (e.key === 'Escape' && open) {
        e.stopPropagation()
        open = false
      }
    }}
  >
    <svg width="5" height="3" viewBox="0 0 5 3" aria-hidden="true"><path d="M0 0h5L2.5 3z" fill="currentColor" /></svg>
  </button>
  {#if open}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="popup" style:left="{pos.left}px" style:top="{pos.top}px" onkeydown={(e) => e.key === 'Escape' && ((open = false), arrow?.focus())}>
      <ColorPalette {value} {allowNone} {noneLabel} {recent} label={title} testid={testid ? `${testid}-palette` : 'color-palette'} onpick={pick} />
    </div>
  {/if}
</span>

<style>
  .xp-colorbtn {
    position: relative;
    display: inline-flex;
    align-items: stretch;
    height: 24px;
    border: 1px solid transparent;
    border-radius: 2px;
  }
  .xp-colorbtn:hover:not(:has(:disabled)),
  .xp-colorbtn.open {
    border-color: var(--xp-toolbar-hover-border);
    background: var(--xp-toolbar-hover-face);
  }
  button {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--xp-text);
    cursor: default;
  }
  button:focus-visible {
    outline: var(--xp-focus-outline);
    outline-offset: -2px;
  }
  .main {
    width: 23px;
    gap: 0;
  }
  .main:active:not(:disabled),
  .arrow:active:not(:disabled) {
    background: linear-gradient(#d4e2f4, #c1d5ee);
  }
  .glyph {
    display: inline-flex;
    width: 16px;
    height: 13px;
    overflow: hidden;
  }
  .bar {
    width: 16px;
    height: 4px;
    margin-top: 1px;
  }
  .bar.none {
    box-sizing: border-box;
    border: 1px solid #808080;
    background: #fff;
  }
  .arrow {
    width: 11px;
  }
  .xp-colorbtn:hover .arrow:not(:disabled),
  .xp-colorbtn.open .arrow {
    border-left: 1px solid var(--xp-toolbar-hover-border);
  }
  button:disabled {
    opacity: 0.45;
  }
  .popup {
    position: fixed;
    z-index: 1000;
    border: 1px solid var(--xp-menu-border);
    background: var(--xp-menu-face);
    box-shadow: var(--xp-shadow-popup);
  }
</style>

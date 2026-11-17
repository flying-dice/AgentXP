<script lang="ts" module>
  /** The 40 standard colours of an Office XP colour drop-down, in its 8 × 5 order. */
  export const STANDARD_COLORS = [
    '#000000', '#993300', '#333300', '#003300', '#003366', '#000080', '#333399', '#333333',
    '#800000', '#ff6600', '#808000', '#008000', '#008080', '#0000ff', '#666699', '#808080',
    '#ff0000', '#ff9900', '#99cc00', '#339966', '#33cccc', '#3366ff', '#800080', '#969696',
    '#ff00ff', '#ffcc00', '#ffff00', '#00ff00', '#00ffff', '#00ccff', '#993366', '#c0c0c0',
    '#ff99cc', '#ffcc99', '#ffff99', '#ccffcc', '#ccffff', '#99ccff', '#cc99ff', '#ffffff'
  ]
</script>

<script lang="ts">
  /**
   * A grid of colour swatches, like the drop-down of an Office XP colour button: an optional "No color" row, the
   * standard colours, the colours already used, and "More Colors..." for any other colour.
   */
  interface Props {
    /** The colour shown as chosen (a hex colour, or `none`). */
    value?: string | null
    colors?: string[]
    /** Extra colours shown under the grid (for example the colours used in the document). */
    recent?: string[]
    /** Shows a "No color" row that picks `none`. */
    allowNone?: boolean
    noneLabel?: string
    /** Shows "More Colors..." that opens the system colour picker. */
    allowCustom?: boolean
    columns?: number
    label?: string
    /** `data-testid` of the palette; each swatch is `<testid>-swatch` with `data-color`. */
    testid?: string
    onpick: (color: string) => void
  }

  let { value = null, colors = STANDARD_COLORS, recent = [], allowNone = false, noneLabel = 'No Color', allowCustom = true, columns = 8, label = 'Colors', testid = 'color-palette', onpick }: Props = $props()

  let custom = $state<HTMLInputElement | null>(null)
  const current = $derived((value ?? '').toLowerCase())
  const extra = $derived(recent.map((c) => c.toLowerCase()).filter((c, i, all) => /^#[0-9a-f]{6}$/.test(c) && all.indexOf(c) === i && !colors.includes(c)).slice(0, columns))

  function keynav(event: KeyboardEvent): void {
    const buttons = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('button.sw')]
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (at < 0) return
    const move: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }
    const d = move[event.key]
    if (d === undefined) return
    event.preventDefault()
    buttons[Math.max(0, Math.min(buttons.length - 1, at + d))]?.focus()
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="xp-palette" role="group" aria-label={label} data-testid={testid} onkeydown={keynav}>
  {#if allowNone}
    <button type="button" class="none" class:on={current === 'none'} data-testid="{testid}-none" onclick={() => onpick('none')}>
      <span class="box"></span>{noneLabel}
    </button>
  {/if}
  <div class="grid" style:grid-template-columns="repeat({columns}, 18px)">
    {#each colors as c (c)}
      <button type="button" class="sw" class:on={current === c} style:--c={c} title={c} aria-label={c} aria-pressed={current === c} data-testid="{testid}-swatch" data-color={c} onclick={() => onpick(c)}><i></i></button>
    {/each}
  </div>
  {#if extra.length}
    <div class="sep"></div>
    <div class="grid" style:grid-template-columns="repeat({columns}, 18px)">
      {#each extra as c (c)}
        <button type="button" class="sw" class:on={current === c} style:--c={c} title={c} aria-label={c} aria-pressed={current === c} data-testid="{testid}-swatch" data-color={c} onclick={() => onpick(c)}><i></i></button>
      {/each}
    </div>
  {/if}
  {#if allowCustom}
    <div class="sep"></div>
    <button type="button" class="more" data-testid="{testid}-more" onclick={() => custom?.click()}>More Colors...</button>
    <input bind:this={custom} type="color" hidden value={/^#[0-9a-f]{6}$/.test(current) ? current : '#000000'} aria-label="Custom color" onchange={(e) => onpick(e.currentTarget.value)} />
  {/if}
</div>

<style>
  .xp-palette {
    display: inline-flex;
    flex-direction: column;
    gap: 3px;
    padding: 4px;
    color: var(--xp-text);
    font: var(--xp-font);
  }
  .grid {
    display: grid;
    grid-auto-rows: 18px;
    gap: 2px;
  }
  .sw {
    position: relative;
    width: 18px;
    height: 18px;
    padding: 2px;
    border: 1px solid transparent;
    background: transparent;
    cursor: default;
  }
  .sw i {
    display: block;
    width: 12px;
    height: 12px;
    border: 1px solid #808080;
    background: var(--c);
  }
  .sw:hover,
  .sw:focus-visible,
  .sw.on {
    border-color: var(--xp-select-border, #316ac5);
    background: var(--xp-hot-face, #c1d2ee);
    outline: 0;
  }
  .sw.on {
    border-color: #000080;
  }
  .none,
  .more {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 22px;
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: default;
  }
  .none:hover,
  .more:hover,
  .none:focus-visible,
  .more:focus-visible,
  .none.on {
    border-color: var(--xp-select-border, #316ac5);
    background: var(--xp-hot-face, #c1d2ee);
    outline: 0;
  }
  .none .box {
    width: 12px;
    height: 12px;
    border: 1px solid #808080;
    background: linear-gradient(to top right, #fff calc(50% - 1px), #d00 50%, #fff calc(50% + 1px));
  }
  .sep {
    height: 1px;
    margin: 1px 2px;
    background: #a0a0a0;
  }
</style>

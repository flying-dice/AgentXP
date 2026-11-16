<script lang="ts">
  type Props = {
    /** 'vertical' is a vertical bar that resizes horizontally (left/right panes). */
    orientation?: 'vertical' | 'horizontal'
    /** Pixels moved per arrow key press. */
    step?: number
    disabled?: boolean
    /** Reports the size delta in px along the resize axis. */
    onresize?: (delta: number) => void
    /** The size of the pane this bar sizes, in px, and its limits: they are announced as `aria-valuenow/min/max`. */
    value?: number
    min?: number
    max?: number
    /** Accessible name. */
    label?: string
    class?: string
  }
  let {
    orientation = 'vertical',
    step = 10,
    disabled = false,
    onresize,
    value,
    min = 0,
    max,
    label = 'Resize panes',
    class: className = ''
  }: Props = $props()

  let dragging = $state(false)
  let last = 0
  const horizontalAxis = $derived(orientation === 'vertical')

  function pos(e: PointerEvent): number {
    return horizontalAxis ? e.clientX : e.clientY
  }
  function down(e: PointerEvent): void {
    if (disabled) return
    dragging = true
    last = pos(e)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function move(e: PointerEvent): void {
    if (!dragging) return
    const delta = pos(e) - last
    if (delta === 0) return
    last = pos(e)
    onresize?.(delta)
  }
  function up(): void {
    dragging = false
  }
  function key(e: KeyboardEvent): void {
    if (disabled) return
    const dec = horizontalAxis ? 'ArrowLeft' : 'ArrowUp'
    const inc = horizontalAxis ? 'ArrowRight' : 'ArrowDown'
    if (e.key === dec) onresize?.(-step)
    else if (e.key === inc) onresize?.(step)
    else return
    e.preventDefault()
  }
</script>

<!-- A focusable separator is the WAI-ARIA "window splitter" widget; svelte-check only knows it as static. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
  role="separator"
  tabindex={disabled ? -1 : 0}
  aria-orientation={orientation}
  aria-label={label}
  aria-valuenow={value === undefined ? undefined : Math.round(value)}
  aria-valuemin={value === undefined ? undefined : Math.round(min)}
  aria-valuemax={value === undefined ? undefined : Math.round(Math.max(max ?? value, value))}
  aria-disabled={disabled}
  class="w7-splitter {orientation} {className}"
  class:dragging
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={up}
  onkeydown={key}
></div>

<style>
  /*
   * The bar is drawn 4 px wide (`::before`), but the element is 24 px across (WCAG 2.5.8) and reaches over the edges of
   * the panes beside it through a negative margin.
   */
  .w7-splitter {
    flex: none;
    position: relative;
    z-index: 1;
    background: transparent;
    touch-action: none;
  }
  .w7-splitter::before {
    content: '';
    position: absolute;
    background: var(--w7-face);
  }
  .vertical {
    width: 24px;
    margin: 0 -10px;
    cursor: col-resize;
  }
  .vertical::before {
    top: 0;
    bottom: 0;
    left: 10px;
    width: 4px;
  }
  .horizontal {
    height: 24px;
    margin: -10px 0;
    cursor: row-resize;
  }
  .horizontal::before {
    left: 0;
    right: 0;
    top: 10px;
    height: 4px;
  }
  .w7-splitter:hover::before,
  .dragging::before {
    background: #bcc7d8;
  }
  .w7-splitter:focus-visible {
    outline: none;
  }
  .w7-splitter:focus-visible::before {
    outline: var(--w7-focus-outline);
    outline-offset: 0;
  }
  .w7-splitter[aria-disabled='true'] {
    cursor: default;
    pointer-events: none;
  }
</style>

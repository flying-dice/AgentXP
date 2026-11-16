<script lang="ts">
  type Props = {
    /** 'vertical' is a vertical bar that resizes horizontally (left/right panes). */
    orientation?: 'vertical' | 'horizontal'
    /** Pixels moved per arrow key press. */
    step?: number
    disabled?: boolean
    /** Reports the size delta in px along the resize axis. */
    onresize?: (delta: number) => void
    class?: string
  }
  let {
    orientation = 'vertical',
    step = 10,
    disabled = false,
    onresize,
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

<div
  role="separator"
  tabindex={disabled ? -1 : 0}
  aria-orientation={orientation}
  aria-disabled={disabled}
  class="xp-splitter {orientation} {className}"
  class:dragging
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={up}
  onkeydown={key}
></div>

<style>
  .xp-splitter {
    flex: none;
    background: var(--w7-face);
    touch-action: none;
  }
  .vertical {
    width: 4px;
    cursor: col-resize;
  }
  .horizontal {
    height: 4px;
    cursor: row-resize;
  }
  .xp-splitter:hover,
  .dragging {
    background: #bcc7d8;
  }
  .xp-splitter:focus-visible {
    outline: var(--w7-focus-outline);
    outline-offset: -1px;
  }
  .xp-splitter[aria-disabled='true'] {
    cursor: default;
    pointer-events: none;
  }
</style>

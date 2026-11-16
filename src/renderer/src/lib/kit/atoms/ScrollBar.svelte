<script lang="ts">
  type Props = {
    orientation?: 'horizontal' | 'vertical'
    value?: number
    min?: number
    max?: number
    smallChange?: number
    largeChange?: number
    disabled?: boolean
    /** Length along the scroll axis in px. */
    length?: number
    label?: string
    /** Id of the scrolled region this bar controls. */
    controls?: string
    onchange?: (value: number) => void
    class?: string
  }
  let {
    orientation = 'vertical',
    value = $bindable(0),
    min = 0,
    max = 100,
    smallChange = 1,
    largeChange = 10,
    disabled = false,
    length = 160,
    label = 'Scroll',
    controls,
    onchange,
    class: className = ''
  }: Props = $props()

  const MIN_THUMB = 17
  const horizontal = $derived(orientation === 'horizontal')
  const top = $derived(Math.max(min, max - largeChange + 1))
  const trackLen = $derived(Math.max(0, length - 34))
  const thumbLen = $derived(
    Math.min(trackLen, Math.max(MIN_THUMB, (trackLen * largeChange) / (max - min + 1)))
  )
  const travel = $derived(Math.max(0, trackLen - thumbLen))
  const thumbPos = $derived(top > min ? ((value - min) / (top - min)) * travel : 0)
  const inactive = $derived(disabled || trackLen < MIN_THUMB * 1.2)

  let repeat: ReturnType<typeof setTimeout> | undefined
  let dragStart: { pointer: number; value: number } | undefined = $state()

  function set(next: number): void {
    const v = Math.round(Math.min(top, Math.max(min, next)))
    if (v === value) return
    value = v
    onchange?.(v)
  }

  function hold(delta: () => number, e: PointerEvent): void {
    if (inactive) return
    ;(e.currentTarget as HTMLElement).focus?.()
    set(value + delta())
    clearTimeout(repeat)
    const tick = (delay: number): void => {
      repeat = setTimeout(() => {
        set(value + delta())
        tick(50)
      }, delay)
    }
    tick(400)
    window.addEventListener('pointerup', () => clearTimeout(repeat), { once: true })
  }

  function trackDown(e: PointerEvent): void {
    if (e.target !== e.currentTarget) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const at = (horizontal ? e.clientX - rect.left : e.clientY - rect.top) - 0
    const dir = () => (at < thumbPos ? -largeChange : at > thumbPos + thumbLen ? largeChange : 0)
    hold(dir, e)
  }

  function thumbDown(e: PointerEvent): void {
    if (inactive) return
    dragStart = { pointer: horizontal ? e.clientX : e.clientY, value }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function thumbMove(e: PointerEvent): void {
    if (!dragStart || travel === 0) return
    const delta = (horizontal ? e.clientX : e.clientY) - dragStart.pointer
    set(dragStart.value + (delta / travel) * (top - min))
  }

  function onkeydown(e: KeyboardEvent): void {
    if (inactive) return
    const [dec, inc] = horizontal ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown']
    if (e.key === dec) set(value - smallChange)
    else if (e.key === inc) set(value + smallChange)
    else if (e.key === 'PageUp') set(value - largeChange)
    else if (e.key === 'PageDown') set(value + largeChange)
    else if (e.key === 'Home') set(min)
    else if (e.key === 'End') set(top)
    else return
    e.preventDefault()
  }
</script>

<div
  role="scrollbar"
  tabindex={inactive ? -1 : 0}
  aria-orientation={orientation}
  aria-controls={controls}
  aria-label={label}
  aria-valuemin={min}
  aria-valuemax={top}
  aria-valuenow={value}
  aria-disabled={inactive}
  class="w7-sb {orientation} {className}"
  class:inactive
  style="{horizontal ? 'width' : 'height'}:{length}px"
  {onkeydown}
>
  <button
    type="button"
    tabindex="-1"
    aria-label="Scroll {horizontal ? 'left' : 'up'}"
    class="arrow dec"
    disabled={inactive}
    onpointerdown={(e) => hold(() => -smallChange, e)}
  ></button>
  <div class="track" role="presentation" onpointerdown={trackDown}>
    {#if !inactive}
      <div
        class="thumb"
        class:drag={dragStart}
        role="presentation"
        style="{horizontal ? 'left' : 'top'}:{thumbPos}px;{horizontal ? 'width' : 'height'}:{thumbLen}px"
        onpointerdown={thumbDown}
        onpointermove={thumbMove}
        onpointerup={() => (dragStart = undefined)}
        onpointercancel={() => (dragStart = undefined)}
      ></div>
    {/if}
  </div>
  <button
    type="button"
    tabindex="-1"
    aria-label="Scroll {horizontal ? 'right' : 'down'}"
    class="arrow inc"
    disabled={inactive}
    onpointerdown={(e) => hold(() => smallChange, e)}
  ></button>
</div>

<style>
  .w7-sb {
    display: flex;
    flex: none;
    box-sizing: border-box;
    outline: none;
    background: #f0f0f0;
  }
  .vertical {
    width: 17px;
    flex-direction: column;
  }
  .horizontal {
    height: 17px;
    flex-direction: row;
  }
  .w7-sb:focus-visible .thumb {
    border-color: #3399ff;
  }
  .track {
    position: relative;
    flex: 1;
  }
  .vertical .track {
    background: linear-gradient(90deg, #e6e6e6, #f3f3f3 40%, #f7f7f7);
    border-left: 1px solid #e2e2e2;
  }
  .horizontal .track {
    background: linear-gradient(#e6e6e6, #f3f3f3 40%, #f7f7f7);
    border-top: 1px solid #e2e2e2;
  }
  .thumb {
    position: absolute;
    box-sizing: border-box;
    border: 1px solid #979797;
    border-radius: 2px;
  }
  .vertical .thumb {
    left: 0;
    right: 0;
    background: linear-gradient(90deg, #f4f4f4, #dcdcdc 50%, #cfcfcf);
  }
  .horizontal .thumb {
    top: 0;
    bottom: 0;
    background: linear-gradient(#f4f4f4, #dcdcdc 50%, #cfcfcf);
  }
  .thumb::after {
    /* grip */
    content: '';
    position: absolute;
    inset: 0;
    margin: auto;
    width: 7px;
    height: 7px;
  }
  .vertical .thumb::after {
    background: repeating-linear-gradient(#8a8a8a 0 1px, #fff 1px 2px);
    height: 7px;
    width: 7px;
    opacity: 0.8;
  }
  .horizontal .thumb::after {
    background: repeating-linear-gradient(90deg, #8a8a8a 0 1px, #fff 1px 2px);
    opacity: 0.8;
  }
  .thumb:hover,
  .thumb.drag {
    border-color: #3c7fb1;
  }
  .vertical .thumb:hover,
  .vertical .thumb.drag {
    background: linear-gradient(90deg, #eaf6fd, #bee6fd 50%, #a7d9f5);
  }
  .horizontal .thumb:hover,
  .horizontal .thumb.drag {
    background: linear-gradient(#eaf6fd, #bee6fd 50%, #a7d9f5);
  }
  .arrow {
    flex: none;
    width: 17px;
    height: 17px;
    padding: 0;
    border: 1px solid #b5b5b5;
    border-radius: 2px;
    background-color: #e9e9e9;
    background-repeat: no-repeat;
    background-position: center;
  }
  .arrow:hover:not(:disabled) {
    background-color: #cdeafb;
    border-color: #3c7fb1;
  }
  .arrow:active:not(:disabled) {
    background-color: #9fd0ee;
  }
  .arrow:disabled {
    opacity: 0.5;
  }
  .vertical .dec {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='5'%3E%3Cpath d='M0 5 4.5 0 9 5z' fill='%23404040'/%3E%3C/svg%3E");
  }
  .vertical .inc {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='5'%3E%3Cpath d='M0 0 4.5 5 9 0z' fill='%23404040'/%3E%3C/svg%3E");
  }
  .horizontal .dec {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='5' height='9'%3E%3Cpath d='M5 0 0 4.5 5 9z' fill='%23404040'/%3E%3C/svg%3E");
  }
  .horizontal .inc {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='5' height='9'%3E%3Cpath d='M0 0 5 4.5 0 9z' fill='%23404040'/%3E%3C/svg%3E");
  }
</style>

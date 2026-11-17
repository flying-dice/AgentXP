<script lang="ts">
  type Props = {
    value?: number
    min?: number
    max?: number
    /** Keyboard step (SmallChange). */
    step?: number
    tickFrequency?: number
    tickStyle?: 'None' | 'BottomRight' | 'TopLeft' | 'Both'
    orientation?: 'horizontal' | 'vertical'
    disabled?: boolean
    length?: number
    label?: string
    onchange?: (value: number) => void
    class?: string
  }
  let {
    value = $bindable(0),
    min = 0,
    max = 10,
    step = 1,
    tickFrequency = 1,
    tickStyle = 'BottomRight',
    orientation = 'horizontal',
    disabled = false,
    length = 200,
    label = 'Slider',
    onchange,
    class: className = ''
  }: Props = $props()

  const uid = $props.id()
  const horizontal = $derived(orientation === 'horizontal')
  const tickCount = $derived(Math.floor((max - min) / Math.max(tickFrequency, 1e-9)))
  const ticks = $derived(Array.from({ length: tickCount + 1 }, (_, i) => (i * tickFrequency) / (max - min)))
  const tickPos = (t: number) =>
    `${horizontal ? 'left' : 'top'}:calc(5.5px + (100% - 11px) * ${t})`
  const topLeft = $derived(tickStyle === 'TopLeft' || tickStyle === 'Both')
  const bottomRight = $derived(tickStyle === 'BottomRight' || tickStyle === 'Both')

  let root: HTMLDivElement | undefined = $state()
  let dragging = $state(false)
  const frac = $derived(max > min ? (value - min) / (max - min) : 0)

  function snap(v: number): number {
    const stepped = min + Math.round((v - min) / step) * step
    return Math.min(max, Math.max(min, +stepped.toFixed(10)))
  }
  function set(v: number): void {
    const next = snap(v)
    if (next === value) return
    value = next
    onchange?.(next)
  }
  function fromPointer(e: PointerEvent): void {
    if (!root) return
    const r = root.getBoundingClientRect()
    const [pos, len] = horizontal ? [e.clientX - r.left, r.width] : [e.clientY - r.top, r.height]
    set(min + Math.min(1, Math.max(0, (pos - 5.5) / (len - 11))) * (max - min))
  }
  function down(e: PointerEvent): void {
    if (disabled) return
    dragging = true
    root?.setPointerCapture(e.pointerId)
    root?.focus()
    fromPointer(e)
  }
  function key(e: KeyboardEvent): void {
    if (disabled) return
    const big = Math.max(step, (max - min) / 10)
    const actions: Record<string, () => void> = {
      ArrowRight: () => set(value + step),
      ArrowDown: () => set(value + step),
      ArrowLeft: () => set(value - step),
      ArrowUp: () => set(value - step),
      PageUp: () => set(value - big),
      PageDown: () => set(value + big),
      Home: () => set(min),
      End: () => set(max)
    }
    const run = actions[e.key]
    if (!run) return
    e.preventDefault()
    run()
  }

  /** Thumb outline; pointed side faces the ticks, like the WinXP control. */
  const shape = $derived.by(() => {
    const [w, h] = horizontal ? [11, 21] : [21, 11]
    const p = (x: number, y: number) => (horizontal ? `${x},${y}` : `${y},${x}`)
    const pts =
      tickStyle === 'BottomRight'
        ? [p(0.5, 0.5), p(10.5, 0.5), p(10.5, 13), p(5.5, 20.5), p(0.5, 13)]
        : tickStyle === 'TopLeft'
          ? [p(5.5, 0.5), p(10.5, 8), p(10.5, 20.5), p(0.5, 20.5), p(0.5, 8)]
          : [p(0.5, 0.5), p(10.5, 0.5), p(10.5, 20.5), p(0.5, 20.5)]
    return { w, h, points: pts.join(' ') }
  })
</script>

<div
  bind:this={root}
  role="slider"
  tabindex={disabled ? -1 : 0}
  aria-label={label}
  aria-orientation={orientation}
  aria-valuemin={min}
  aria-valuemax={max}
  aria-valuenow={value}
  aria-disabled={disabled}
  class="xp-trackbar {orientation} {className}"
  class:disabled
  class:dragging
  style={horizontal ? `width:${length}px` : `height:${length}px`}
  onpointerdown={down}
  onpointermove={(e) => dragging && fromPointer(e)}
  onpointerup={() => (dragging = false)}
  onpointercancel={() => (dragging = false)}
  onkeydown={key}
>
  <svg width="0" height="0" class="defs" aria-hidden="true">
    <defs>
      {#each [['n', '#f2f2f2', '#d0d0d0'], ['h', '#eaf6fd', '#a7d9f5'], ['p', '#c4e5f6', '#68b3db']] as [k, a, b] (k)}
        <linearGradient id="{uid}-{k}" x1="0" y1="0" x2={horizontal ? 1 : 0} y2={horizontal ? 0 : 1}>
          <stop offset="0" stop-color={a} />
          <stop offset="1" stop-color={b} />
        </linearGradient>
      {/each}
    </defs>
  </svg>
  <span class="track"></span>
  {#if tickStyle !== 'None'}
    {#each ticks as t (t)}
      {#if topLeft}<span class="tick tl" style={tickPos(t)}></span>{/if}
      {#if bottomRight}<span class="tick br" style={tickPos(t)}></span>{/if}
    {/each}
  {/if}
  <span class="thumb" style={tickPos(frac)}>
    <svg width={shape.w} height={shape.h} style="--g:url(#{uid}-n);--gh:url(#{uid}-h);--gp:url(#{uid}-p)">
      <polygon points={shape.points} />
    </svg>
  </span>
</div>

<style>
  .xp-trackbar {
    outline: none;
    position: relative;
    display: block;
    touch-action: none;
    user-select: none;
    box-sizing: border-box;
  }
  .xp-trackbar.horizontal {
    height: 40px;
  }
  .xp-trackbar.vertical {
    width: 40px;
  }
  .defs {
    position: absolute;
  }
  .track {
    position: absolute;
    box-sizing: border-box;
    border: 1px solid #a3a9ad;
    border-radius: 1px;
    background: #e7eaea;
    box-shadow: inset 1px 1px 0 #cfd3d6, 1px 1px 0 #fff;
  }
  .horizontal .track {
    left: 0;
    right: 0;
    top: 18px;
    height: 4px;
  }
  .vertical .track {
    top: 0;
    bottom: 0;
    left: 18px;
    width: 4px;
  }
  .tick {
    position: absolute;
    background: #7c7c7c;
  }
  .horizontal .tick {
    width: 1px;
    height: 4px;
  }
  .horizontal .tick.tl {
    top: 3px;
  }
  .horizontal .tick.br {
    bottom: 3px;
  }
  .vertical .tick {
    height: 1px;
    width: 4px;
  }
  .vertical .tick.tl {
    left: 3px;
  }
  .vertical .tick.br {
    right: 3px;
  }
  .thumb {
    position: absolute;
    line-height: 0;
    pointer-events: none;
  }
  .horizontal .thumb {
    top: 9.5px;
    margin-left: -5.5px;
  }
  .vertical .thumb {
    left: 9.5px;
    margin-top: -5.5px;
  }
  .thumb polygon {
    fill: var(--g);
    stroke: #003c74;
  }
  .xp-trackbar:hover:not(.disabled) polygon {
    fill: var(--gh);
    stroke: #003c74;
  }
  .xp-trackbar.dragging polygon {
    fill: var(--gp);
    stroke: #2c628b;
  }
  .xp-trackbar:focus-visible polygon {
    stroke: #316ac5;
  }
  .xp-trackbar.disabled {
    opacity: 0.6;
  }
  .xp-trackbar.disabled polygon {
    fill: #f4f2e8;
    stroke: var(--xp-border-disabled);
  }
</style>

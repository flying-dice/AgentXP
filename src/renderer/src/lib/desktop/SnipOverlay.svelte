<script lang="ts">
  /**
   * The Snipping Tool's selection layer: dims the whole desktop page. Rectangular mode drags a rectangle,
   * window mode highlights the window under the pointer. Esc cancels. Coordinates are page pixels.
   */
  import type { Bounds } from '@shared/desktop'
  import { clipToArea, isUsable, rectFromDrag, windowAt, type Point } from '../apps/snipping-tool/snipRegion'

  interface Props {
    mode: 'rect' | 'window'
    /** Visible windows, back to front, in page coordinates. */
    windows?: { id: number; bounds: Bounds }[]
    onpick: (region: Bounds) => void
    oncancel: () => void
  }

  let { mode, windows = [], onpick, oncancel }: Props = $props()

  let root: HTMLDivElement | undefined = $state()
  let start = $state<Point | null>(null)
  let here = $state<Point | null>(null)

  const area = (): { width: number; height: number } => {
    const r = root?.getBoundingClientRect()
    return { width: r?.width ?? 1200, height: r?.height ?? 700 }
  }
  const at = (e: PointerEvent): Point => {
    const r = root!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const rect = $derived<Bounds | null>(
    mode === 'rect' ? (start && here ? rectFromDrag(start, here, area()) : null) : here ? ((): Bounds | null => {
        const w = windowAt(windows, here)
        return w ? clipToArea(w.bounds, area()) : null
      })() : null
  )

  function down(e: PointerEvent): void {
    if (e.button !== 0) return
    const p = at(e)
    if (mode === 'window') {
      if (rect) onpick(rect)
      return
    }
    start = p
    here = p
    root?.setPointerCapture(e.pointerId)
  }

  function move(e: PointerEvent): void {
    here = at(e)
  }

  function up(): void {
    if (mode !== 'rect' || !start) return
    const picked = rect
    start = null
    if (picked && isUsable(picked)) onpick(picked)
    else here = null
  }

  function keydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.stopPropagation()
      oncancel()
    }
  }

  $effect(() => root?.focus())
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_noninteractive_tabindex -->
<div
  class="snip"
  bind:this={root}
  role="application"
  aria-label={mode === 'rect' ? 'Drag to select the area to capture. Esc cancels.' : 'Click a window to capture it. Esc cancels.'}
  tabindex="0"
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onkeydown={keydown}
  oncontextmenu={(e) => (e.preventDefault(), oncancel())}
>
  {#if rect && (mode === 'window' || isUsable(rect))}
    <div class="hole" style:left="{rect.x}px" style:top="{rect.y}px" style:width="{rect.width}px" style:height="{rect.height}px"></div>
    <div class="size" style:left="{rect.x}px" style:top="{Math.max(0, rect.y - 20)}px">{rect.width} × {rect.height}</div>
  {:else}
    <div class="dim"></div>
  {/if}
  {#if !start}<div class="hint">{mode === 'rect' ? 'Drag to select an area  ·  Esc to cancel' : 'Click a window to capture it  ·  Esc to cancel'}</div>{/if}
</div>

<style>
  .snip {
    position: absolute;
    inset: 0;
    z-index: 100005;
    cursor: crosshair;
    outline: 0;
    touch-action: none;
    user-select: none;
  }
  .dim {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.45);
  }
  .hole {
    position: absolute;
    box-sizing: border-box;
    border: 2px solid #c8312b;
    box-shadow: 0 0 0 9999px rgba(255, 255, 255, 0.45);
    pointer-events: none;
  }
  .size {
    position: absolute;
    padding: 1px 6px;
    background: #fff9c4;
    border: 1px solid #6b6b6b;
    font: var(--w7-font);
    pointer-events: none;
  }
  .hint {
    position: absolute;
    left: 50%;
    top: 46px;
    transform: translateX(-50%);
    padding: 4px 14px;
    border: 1px solid #6b6b6b;
    background: #fffbd9;
    box-shadow: 1px 2px 4px rgba(0, 0, 0, 0.35);
    font: var(--w7-font);
    pointer-events: none;
  }
</style>

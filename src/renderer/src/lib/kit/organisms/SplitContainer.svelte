<script lang="ts">
  import type { Snippet } from 'svelte'
  import Splitter from '../atoms/Splitter.svelte'

  interface Props {
    /** `vertical`: splitter is a vertical bar, panels side by side. `horizontal`: stacked. */
    orientation?: 'vertical' | 'horizontal'
    /** Size of panel 1 in px. */
    splitterDistance?: number
    panel1MinSize?: number
    panel2MinSize?: number
    /** Panel that keeps its size when the container is resized; `none` scales proportionally. */
    fixedPanel?: 'none' | 'panel1' | 'panel2'
    panel1: Snippet
    panel2: Snippet
    class?: string
    onchange?: (distance: number) => void
  }

  let {
    orientation = 'vertical',
    splitterDistance = $bindable(200),
    panel1MinSize = 25,
    panel2MinSize = 25,
    fixedPanel = 'none',
    panel1,
    panel2,
    class: className = '',
    onchange
  }: Props = $props()

  /** Width of the Splitter atom. */
  const SPLITTER = 4

  let width = $state(0)
  let height = $state(0)
  let lastSize = 0

  const size = $derived(orientation === 'vertical' ? width : height)

  function clamp(distance: number, total: number): number {
    const max = total - SPLITTER - panel2MinSize
    return Math.max(panel1MinSize, Math.min(distance, Math.max(panel1MinSize, max)))
  }

  function set(distance: number): void {
    const next = clamp(distance, size)
    if (next === splitterDistance) return
    splitterDistance = next
    onchange?.(next)
  }

  $effect(() => {
    const total = size
    if (total <= 0) return
    if (lastSize > 0 && total !== lastSize) {
      const delta = total - lastSize
      if (fixedPanel === 'panel2') set(splitterDistance + delta)
      else if (fixedPanel === 'none') set((splitterDistance / lastSize) * total)
      else set(splitterDistance)
    } else set(splitterDistance)
    lastSize = total
  })
</script>

<div class="xp-split {orientation} {className}" bind:clientWidth={width} bind:clientHeight={height}>
  <div class="p1" style={orientation === 'vertical' ? `width:${splitterDistance}px` : `height:${splitterDistance}px`}>
    {@render panel1()}
  </div>
  <Splitter {orientation} onresize={(d) => set(splitterDistance + d)} />
  <div class="p2">{@render panel2()}</div>
</div>

<style>
  .xp-split {
    display: flex;
    min-width: 0;
    min-height: 0;
    width: 100%;
    height: 100%;
  }
  .xp-split.horizontal {
    flex-direction: column;
  }
  .p1 {
    flex: none;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .p2 {
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
</style>

<script lang="ts" generics="T">
  // A windowed list: renders only the rows in view plus an overscan, so a 2,000-row chat keeps a few dozen DOM nodes.
  // Rows have variable heights: each rendered row is measured (ResizeObserver) and the height cached by key; rows not seen
  // yet count `estimate`. The scroll container is part of this component (it needs the scroll position); the rows above and
  // below the window are two spacers, so scrolling, keyboard scrolling (PageUp/PageDown/Home/End) and stick-to-bottom are
  // the browser's own. The caller owns the stick-to-bottom logic and watches `scroller.firstElementChild` for growth.
  import { flushSync, onMount, type Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { buildOffsets, visibleRange } from './virtualWindow'

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onscroll'> & {
    items: readonly T[]
    itemKey: (item: T) => string
    /** Height assumed for a row that has not been rendered yet. */
    estimate?: number
    /** Pixels rendered above and below the viewport. */
    overscan?: number
    /** The scroll container. */
    scroller?: HTMLDivElement | undefined
    onscroll?: () => void
    /** One row; the list wraps it in a measured, labelled element. */
    row: Snippet<[T, number]>
    /** Shown instead of the rows when there are none. */
    empty?: Snippet
    /** After the last row, outside the window (always rendered). */
    tail?: Snippet
  }

  let { items, itemKey, estimate = 72, overscan = 600, scroller = $bindable(), onscroll, row, empty, tail, ...rest }: Props = $props()

  const heights = new Map<string, number>()
  /** Bumped when a measured height changes; the offsets depend on it. */
  let version = $state(0)
  // Before the first scroll event the list shows its end (a chat opens at the latest message).
  let scrollTop = $state(Number.MAX_SAFE_INTEGER)
  let viewport = $state(800)

  const keys = $derived(items.map(itemKey))
  const offsets = $derived.by(() => {
    void version
    return buildOffsets(keys, heights, estimate)
  })
  const range = $derived(visibleRange(offsets, scrollTop, viewport, overscan))
  const shown = $derived(items.slice(range.start, range.end))
  const before = $derived(offsets[range.start])
  const after = $derived(offsets[offsets.length - 1] - offsets[range.end])

  const atBottom = (el: HTMLElement): boolean => el.scrollHeight - el.scrollTop - el.clientHeight <= 24

  function sync(): void {
    if (!scroller) return
    scrollTop = scroller.scrollTop
    viewport = scroller.clientHeight
  }

  let quiet: ReturnType<typeof setTimeout> | undefined
  let rowsEl: HTMLDivElement | undefined = $state()
  function handleScroll(): void {
    // Rows that appear because the user scrolled are not news: keep the live region quiet while it happens.
    if (rowsEl) {
      rowsEl.setAttribute('aria-live', 'off')
      clearTimeout(quiet)
      quiet = setTimeout(() => rowsEl?.removeAttribute('aria-live'), 250)
    }
    sync()
    // Our own anchoring (see the row observer) is not the user scrolling.
    if (anchored !== undefined && Math.abs(scroller!.scrollTop - anchored) < 1) {
      anchored = undefined
      return
    }
    onscroll?.()
  }
  let anchored: number | undefined

  // One observer for all rendered rows.
  const rowObserver =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver((entries) => {
          const el = scroller
          const top = el?.scrollTop ?? 0
          let above = 0
          let changed = false
          for (const entry of entries) {
            const node = entry.target as HTMLElement
            const key = node.dataset.key
            if (key === undefined) continue
            const h = entry.borderBoxSize?.[0]?.blockSize ?? node.offsetHeight
            const old = heights.get(key)
            if (old !== undefined && Math.abs(old - h) < 0.01) continue
            const index = Number(node.dataset.index)
            // A row entirely above the viewport changed height: keep what the user reads where it is.
            if (offsets[index] + (old ?? estimate) <= top) above += h - (old ?? estimate)
            heights.set(key, h)
            changed = true
          }
          if (!changed) return
          version++
          if (el && above !== 0 && !atBottom(el)) {
            flushSync()
            el.scrollTop = top + above
            anchored = el.scrollTop
          }
          sync()
        })

  function measure(node: HTMLElement): { destroy(): void } {
    rowObserver?.observe(node)
    return { destroy: () => rowObserver?.unobserve(node) }
  }

  onMount(() => {
    const observer = new ResizeObserver(sync)
    if (scroller) observer.observe(scroller)
    sync()
    return () => {
      observer.disconnect()
      rowObserver?.disconnect()
      clearTimeout(quiet)
    }
  })
</script>

<div bind:this={scroller} onscroll={handleScroll} style:overflow-anchor="none" {...rest}>
  <div class="rows" bind:this={rowsEl}>
    {#if items.length === 0}
      {@render empty?.()}
    {:else}
      <div class="spacer" style:height="{before}px" aria-hidden="true"></div>
      {#each shown as item, i (keys[range.start + i])}
        {@const index = range.start + i}
        <div
          class="item"
          data-key={keys[index]}
          data-index={index}
          role="article"
          aria-posinset={index + 1}
          aria-setsize={items.length}
          use:measure
        >
          {@render row(item, index)}
        </div>
      {/each}
      <div class="spacer" style:height="{after}px" aria-hidden="true"></div>
    {/if}
    {@render tail?.()}
  </div>
</div>

<style>
  .rows {
    min-height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }
  .spacer {
    flex: none;
  }
  .item {
    flex: none;
  }
</style>

<script lang="ts">
  /** A drawing-page ruler in page units, with a marker that follows the pointer. */
  interface Props {
    orientation: 'horizontal' | 'vertical'
    /** The page coordinate at scroll position 0. */
    origin: number
    /** The scroll position of the drawing in screen pixels. */
    offset: number
    /** How many screen pixels of ruler show. */
    length: number
    zoom: number
    /** The pointer position in page units, or null. */
    mark: number | null
    size: number
  }

  let { orientation, origin, offset, length, zoom, mark, size }: Props = $props()

  const horizontal = $derived(orientation === 'horizontal')

  /** A label step that keeps labels about 60 px apart. */
  const step = $derived.by(() => {
    const want = 60 / zoom
    for (const s of [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000]) if (s >= want) return s
    return 5000
  })

  const ticks = $derived.by(() => {
    const out: { at: number; kind: 'major' | 'mid' | 'minor'; label: string | null }[] = []
    const start = origin + offset / zoom
    const end = start + length / zoom
    const minor = step / 10
    const first = Math.floor(start / minor) * minor
    for (let v = first, i = 0; v <= end && i < 2000; v += minor, i++) {
      const k = Math.round(v / minor)
      const kind = k % 10 === 0 ? 'major' : k % 5 === 0 ? 'mid' : 'minor'
      if (kind === 'minor' && minor * zoom < 4) continue
      out.push({ at: (v - start) * zoom, kind, label: kind === 'major' ? String(Math.round(v)) : null })
    }
    return out
  })

  const markAt = $derived(mark === null ? null : (mark - origin) * zoom - offset)
</script>

<svg
  class="ruler"
  class:horizontal
  width={horizontal ? length : size}
  height={horizontal ? size : length}
  aria-hidden="true"
  data-testid="diagrams-ruler-{orientation}"
>
  <rect width="100%" height="100%" fill="#fbfbf8" />
  {#each ticks as t, i (i)}
    {@const len = t.kind === 'major' ? size : t.kind === 'mid' ? size * 0.45 : size * 0.25}
    {#if horizontal}
      <line x1={t.at + 0.5} y1={size} x2={t.at + 0.5} y2={size - len} stroke="#6b6b6b" />
      {#if t.label !== null}<text x={t.at + 3} y="9" font-size="9">{t.label}</text>{/if}
    {:else}
      <line x1={size} y1={t.at + 0.5} x2={size - len} y2={t.at + 0.5} stroke="#6b6b6b" />
      {#if t.label !== null}<text x="9" y={t.at + 3} font-size="9" transform="rotate(-90 9 {t.at + 3})" text-anchor="end">{t.label}</text>{/if}
    {/if}
  {/each}
  {#if markAt !== null}
    {#if horizontal}
      <line x1={markAt} y1="0" x2={markAt} y2={size} stroke="#d02020" stroke-dasharray="2 1" />
    {:else}
      <line x1="0" y1={markAt} x2={size} y2={markAt} stroke="#d02020" stroke-dasharray="2 1" />
    {/if}
  {/if}
  {#if horizontal}
    <line x1="0" y1={size - 0.5} x2={length} y2={size - 0.5} stroke="#a0a0a0" />
  {:else}
    <line x1={size - 0.5} y1="0" x2={size - 0.5} y2={length} stroke="#a0a0a0" />
  {/if}
</svg>

<style>
  .ruler {
    display: block;
    font-family: Tahoma, 'Segoe UI', sans-serif;
    fill: #333;
    overflow: hidden;
  }
  .ruler.horizontal {
    grid-column: 2;
    grid-row: 1;
  }
  .ruler:not(.horizontal) {
    grid-column: 1;
    grid-row: 2;
  }
  text {
    fill: #333;
  }
</style>

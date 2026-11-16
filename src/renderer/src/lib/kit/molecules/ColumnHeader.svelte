<script lang="ts">
  import type { SortDirection } from './ColumnHeader'

  interface Props {
    text: string
    /** Width in px; omitted = flexible (fills the row). */
    width?: number
    minWidth?: number
    align?: 'left' | 'right' | 'center'
    sortable?: boolean
    sortDirection?: SortDirection
    resizable?: boolean
    /** Draw the right-hand separator. */
    divider?: boolean
    onsort?: () => void
    onresize?: (width: number) => void
    class?: string
  }

  let {
    text,
    width,
    minWidth = 24,
    align = 'left',
    sortable = false,
    sortDirection = 'none',
    resizable = false,
    divider = true,
    onsort,
    onresize,
    class: className = ''
  }: Props = $props()

  let root = $state<HTMLElement | null>(null)
  let dragging = $state(false)
  let startX = 0
  let startWidth = 0

  const currentWidth = (): number => width ?? root?.getBoundingClientRect().width ?? minWidth
  const resize = (w: number): void => onresize?.(Math.max(minWidth, Math.round(w)))

  function down(event: PointerEvent): void {
    dragging = true
    startX = event.clientX
    startWidth = currentWidth()
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    event.stopPropagation()
  }
  function move(event: PointerEvent): void {
    if (dragging) resize(startWidth + event.clientX - startX)
  }
  function onkeydown(event: KeyboardEvent): void {
    if (resizable && event.ctrlKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      resize(currentWidth() + (event.key === 'ArrowRight' ? 10 : -10))
      event.preventDefault()
    }
  }
</script>

<div
  bind:this={root}
  class="lvh {className}"
  class:divider
  class:flex={width === undefined}
  style:width={width !== undefined ? `${width}px` : undefined}
  style:min-width={`${minWidth}px`}
  role="columnheader"
  aria-sort={sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : sortable ? 'none' : undefined}
>
  <button
    type="button"
    class="face"
    class:sortable
    style:text-align={align}
    disabled={!sortable && !resizable}
    onclick={() => sortable && onsort?.()}
    {onkeydown}
  >
    {#if sortDirection !== 'none'}
      <svg class="sort" width="9" height="5" viewBox="0 0 9 5" aria-hidden="true">
        <path d={sortDirection === 'asc' ? 'M0 5L4.5 0L9 5z' : 'M0 0L4.5 5L9 0z'} fill="#8a8a8a" />
      </svg>
    {/if}
    <span class="label">{text}</span>
  </button>
  {#if resizable}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="grip"
      role="separator"
      aria-orientation="vertical"
      onpointerdown={down}
      onpointermove={move}
      onpointerup={() => (dragging = false)}
      onpointercancel={() => (dragging = false)}
    ></div>
  {/if}
</div>

<style>
  .lvh {
    position: relative;
    flex: none;
    height: 20px;
    background: linear-gradient(#fff, #f1f1f1 90%, #e6e6e6);
    color: var(--w7-text);
    overflow: hidden;
  }
  .lvh.flex {
    flex: 1 1 0;
  }
  .lvh.divider {
    border-right: 1px solid var(--w7-border-light);
  }
  .face {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    padding: 0 6px;
    border: 0;
    background: transparent;
    font: inherit;
    color: inherit;
    cursor: default;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    outline: none;
  }
  .face:focus-visible {
    outline: var(--w7-focus-outline);
    outline-offset: -3px;
  }
  .face.sortable:hover {
    background: linear-gradient(#eaf6fd, #d9f0fc 49%, #bee6fd 50%, #a7d9f5);
  }
  .sort {
    position: absolute;
    top: 0;
    left: calc(50% - 4px);
  }
  .grip {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 5px;
    cursor: col-resize;
    touch-action: none;
  }
</style>

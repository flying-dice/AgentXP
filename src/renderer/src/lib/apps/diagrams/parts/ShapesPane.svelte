<script lang="ts">
  /**
   * The Shapes window: "Search for Shapes", then one collapsible panel per stencil category. A shape is dragged onto
   * the page, or double-clicked (Enter) to drop it in the middle of the view.
   */
  import TaskPanel from '../../../kit/molecules/TaskPanel.svelte'
  import { searchStencils, STENCIL_CATEGORIES, stencilById } from '../model/stencils'
  import StencilIcon from './StencilIcon.svelte'

  interface Props {
    /** A shape was double-clicked or activated with the keyboard. */
    onadd: (stencil: string) => void
    /** A shape was dragged and let go at a screen point. */
    ondrop: (stencil: string, clientX: number, clientY: number) => void
    onclose: () => void
  }

  let { onadd, ondrop, onclose }: Props = $props()

  let query = $state('')
  let open = $state<Record<string, boolean>>({ basic: true, flowchart: true })
  let ghost = $state<{ stencil: string; x: number; y: number } | null>(null)

  const results = $derived(query.trim() ? searchStencils(query).slice(0, 40) : null)

  let drag: { stencil: string; x: number; y: number; moved: boolean } | null = null

  function down(event: PointerEvent, stencil: string): void {
    if (event.button !== 0) return
    drag = { stencil, x: event.clientX, y: event.clientY, moved: false }
    ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
  }

  function move(event: PointerEvent): void {
    if (!drag) return
    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4) return
    drag.moved = true
    ghost = { stencil: drag.stencil, x: event.clientX, y: event.clientY }
  }

  function up(event: PointerEvent): void {
    const d = drag
    drag = null
    ghost = null
    if (d?.moved) ondrop(d.stencil, event.clientX, event.clientY)
  }
</script>

{#snippet tile(id: string)}
  {@const st = stencilById(id)}
  {#if st}
    <button
      type="button"
      class="tile"
      title="{st.name}. Drag it onto the page, or double-click it."
      data-testid="diagrams-stencil-{id}"
      data-stencil={id}
      onpointerdown={(e) => down(e, id)}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={() => ((drag = null), (ghost = null))}
      ondblclick={() => onadd(id)}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onadd(id)
        }
      }}
    >
      <StencilIcon stencil={id} size={34} />
      <span class="name" lang="en">{st.name}</span>
    </button>
  {/if}
{/snippet}

<aside class="shapes" data-testid="diagrams-shapes" aria-label="Shapes">
  <header class="caption">
    <span>Shapes</span>
    <button type="button" class="x" aria-label="Close the Shapes window" title="Close" data-testid="diagrams-shapes-close" onclick={onclose}>
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M1 1l6 6M7 1L1 7" stroke="currentColor" stroke-width="1.6" /></svg>
    </button>
  </header>
  <div class="search">
    <label for="diagrams-shape-search">Search for Shapes:</label>
    <div class="row">
      <input id="diagrams-shape-search" type="search" placeholder="Type your search here" bind:value={query} data-testid="diagrams-shape-search" autocomplete="off" />
    </div>
  </div>
  <div class="panels xp-scroll">
    {#if results}
      <TaskPanel title="Search Results ({results.length})" special testid="diagrams-search-results">
        {#if results.length}
          <div class="grid">
            {#each results as st (st.id)}{@render tile(st.id)}{/each}
          </div>
        {:else}
          <p class="empty">No shapes match "{query.trim()}".</p>
        {/if}
      </TaskPanel>
    {/if}
    {#each STENCIL_CATEGORIES as cat (cat.id)}
      <TaskPanel title={cat.name} open={open[cat.id] ?? false} ontoggle={(o) => (open[cat.id] = o)} testid="diagrams-category-{cat.id}">
        {#snippet icon()}<StencilIcon stencil={cat.stencils[0]} size={16} />{/snippet}
        <div class="grid">
          {#each cat.stencils as id (id)}{@render tile(id)}{/each}
        </div>
      </TaskPanel>
    {/each}
  </div>
</aside>

{#if ghost}
  <div class="ghost" style:left="{ghost.x}px" style:top="{ghost.y}px" aria-hidden="true">
    <StencilIcon stencil={ghost.stencil} size={44} />
  </div>
{/if}

<style>
  .shapes {
    flex: none;
    width: 226px;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #7a96c8;
    background: linear-gradient(#7ba2e7, #6375d6);
  }
  .caption {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 20px;
    padding: 0 3px 0 6px;
    background: linear-gradient(#f4f7fc, #d5dfef);
    border-bottom: 1px solid #8ea6c6;
    color: #1c2f4a;
    font-weight: 700;
  }
  .x {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    border: 1px solid transparent;
    background: transparent;
    color: #1c2f4a;
  }
  .x:hover {
    border-color: var(--xp-toolbar-hover-border);
    background: var(--xp-toolbar-hover-face);
  }
  .search {
    flex: none;
    padding: 6px 8px 8px;
    color: #fff;
  }
  .search label {
    display: block;
    margin-bottom: 3px;
    font-weight: 700;
  }
  .row {
    display: flex;
  }
  input {
    flex: 1;
    min-width: 0;
    height: 21px;
    padding: 1px 4px;
    border: 1px solid #7f9db9;
    font: var(--xp-font);
  }
  .panels {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 2px 10px 0;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
    gap: 2px;
    margin: -4px -6px;
  }
  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    min-width: 0;
    padding: 3px 1px 2px;
    border: 1px solid transparent;
    border-radius: 2px;
    background: transparent;
    color: #000;
    font: 11px/1.15 var(--xp-font-family, Tahoma, 'Segoe UI', sans-serif);
    cursor: default;
    touch-action: none;
  }
  .tile:hover {
    border-color: #316ac5;
    background: #c1d2ee;
  }
  .tile:focus-visible {
    outline: var(--xp-focus-outline);
    outline-offset: -2px;
  }
  .name {
    max-width: 100%;
    overflow: hidden;
    text-align: center;
    hyphens: auto;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .empty {
    margin: 0;
  }
  .ghost {
    position: fixed;
    z-index: 10000;
    transform: translate(-50%, -50%);
    opacity: 0.7;
    pointer-events: none;
  }
</style>

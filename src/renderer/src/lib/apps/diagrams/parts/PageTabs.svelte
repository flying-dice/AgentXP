<script lang="ts">
  /** The page tabs under the drawing (like a workbook's sheet tabs): pick, rename by double-click, insert, and a menu. */
  import { tick } from 'svelte'

  interface Props {
    pages: string[]
    current: number
    onselect: (index: number) => void
    onrename: (index: number, name: string) => void
    oninsert: () => void
    oncontextmenu: (event: MouseEvent, index: number) => void
  }

  let { pages, current, onselect, onrename, oninsert, oncontextmenu }: Props = $props()

  let renaming = $state<{ index: number; value: string } | null>(null)
  let input = $state<HTMLInputElement | null>(null)
  let strip = $state<HTMLDivElement | null>(null)

  /** Starts renaming a tab in place (double-click, or Rename Page in a menu). */
  export async function rename(index: number): Promise<void> {
    renaming = { index, value: pages[index] }
    await tick()
    input?.focus()
    input?.select()
  }

  function finish(save: boolean): void {
    const r = renaming
    renaming = null
    if (save && r && r.value.trim()) onrename(r.index, r.value.trim())
  }

  function scrollBy(d: number): void {
    strip?.scrollBy({ left: d * 80 })
  }

  $effect(() => {
    void current
    void tick().then(() => strip?.querySelector<HTMLElement>('.tab.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }))
  })
</script>

<div class="tabs" role="tablist" aria-label="Pages" data-testid="diagrams-page-tabs">
  <div class="nav">
    <button type="button" aria-label="First page" title="First page" disabled={current === 0} onclick={() => onselect(0)}><svg width="9" height="8" viewBox="0 0 9 8" aria-hidden="true"><path d="M1 0v8M8 0L3 4l5 4z" stroke="currentColor" fill="currentColor" /></svg></button>
    <button type="button" aria-label="Previous page" title="Previous page" disabled={current === 0} onclick={() => onselect(current - 1)}><svg width="6" height="8" viewBox="0 0 6 8" aria-hidden="true"><path d="M5 0L0 4l5 4z" fill="currentColor" /></svg></button>
    <button type="button" aria-label="Next page" title="Next page" disabled={current >= pages.length - 1} onclick={() => onselect(current + 1)}><svg width="6" height="8" viewBox="0 0 6 8" aria-hidden="true"><path d="M1 0l5 4-5 4z" fill="currentColor" /></svg></button>
    <button type="button" aria-label="Last page" title="Last page" disabled={current >= pages.length - 1} onclick={() => onselect(pages.length - 1)}><svg width="9" height="8" viewBox="0 0 9 8" aria-hidden="true"><path d="M8 0v8M1 0l5 4-5 4z" stroke="currentColor" fill="currentColor" /></svg></button>
  </div>
  <div class="strip" bind:this={strip} onwheel={(e) => (e.preventDefault(), scrollBy(Math.sign(e.deltaY || e.deltaX)))}>
    {#each pages as name, i (i)}
      {#if renaming?.index === i}
        <input
          class="tab on rename"
          bind:this={input}
          bind:value={renaming.value}
          aria-label="Page name"
          data-testid="diagrams-page-rename"
          onkeydown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter') finish(true)
            else if (e.key === 'Escape') finish(false)
          }}
          onblur={() => finish(true)}
        />
      {:else}
        <button
          type="button"
          role="tab"
          class="tab"
          class:on={i === current}
          aria-selected={i === current}
          data-testid="diagrams-page-tab"
          data-page={i}
          title="Double-click to rename"
          onclick={() => onselect(i)}
          ondblclick={() => void rename(i)}
          oncontextmenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onselect(i)
            oncontextmenu(e, i)
          }}>{name}</button
        >
      {/if}
    {/each}
    <button type="button" class="tab add" title="Insert a page" aria-label="Insert a page" data-testid="diagrams-page-add" onclick={oninsert}>
      <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true"><path d="M4.5 0v9M0 4.5h9" stroke="currentColor" stroke-width="1.6" /></svg>
    </button>
  </div>
</div>

<style>
  .tabs {
    flex: none;
    display: flex;
    align-items: stretch;
    height: 21px;
    border-top: 1px solid #808080;
    background: var(--xp-face);
  }
  .nav {
    flex: none;
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 2px;
    border-right: 1px solid #a0a0a0;
  }
  .nav button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 17px;
    height: 17px;
    padding: 0;
    border: 1px solid transparent;
    background: transparent;
    color: #1c2f4a;
  }
  .nav button:hover:not(:disabled) {
    border-color: var(--xp-toolbar-hover-border);
    background: var(--xp-toolbar-hover-face);
  }
  .nav button:disabled {
    color: #a0a0a0;
  }
  .strip {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: flex-start;
    overflow: hidden;
    padding-left: 4px;
  }
  /* Sheet tabs hang from the edge of the drawing: trapezoid sides, the current one white and on top. */
  .tab {
    position: relative;
    flex: none;
    height: 18px;
    margin-left: -4px;
    padding: 0 14px;
    border: 1px solid #808080;
    border-top: 0;
    background: linear-gradient(#e6e6e6, #d4d0c8);
    color: #000;
    font: var(--xp-font);
    clip-path: polygon(0 0, 100% 0, calc(100% - 6px) 100%, 6px 100%);
    cursor: default;
  }
  .tab:hover:not(.on) {
    background: linear-gradient(#f2f2f2, #e2e0da);
  }
  .tab.on {
    z-index: 1;
    height: 19px;
    margin-top: -1px;
    background: #fff;
    font-weight: 700;
  }
  .tab:focus-visible {
    outline: var(--xp-focus-outline);
    outline-offset: -3px;
  }
  .rename {
    width: 110px;
    font-weight: 400;
    clip-path: none;
    padding: 0 4px;
  }
  .add {
    display: inline-flex;
    align-items: center;
    padding: 0 12px;
    color: #2e7a2e;
  }
</style>

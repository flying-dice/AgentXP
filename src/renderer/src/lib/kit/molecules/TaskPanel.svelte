<script lang="ts">
  /**
   * A collapsible group of a task pane (the blue panels of a Windows XP folder's side bar): a title bar with a
   * round chevron button, and its content under it.
   */
  import type { Snippet } from 'svelte'

  interface Props {
    title: string
    /** Shown open; bindable. */
    open?: boolean
    /** The emphasised (dark blue) title bar of the first panel. */
    special?: boolean
    /** A 16px glyph before the title. */
    icon?: Snippet
    /** Controls at the right of the title bar, before the chevron. */
    actions?: Snippet
    children: Snippet
    /** `data-testid` of the panel; the title button is `<testid>-toggle`. */
    testid?: string
    ontoggle?: (open: boolean) => void
  }

  let { title, open = $bindable(true), special = false, icon, actions, children, testid, ontoggle }: Props = $props()

  const id = `taskpanel-${Math.random().toString(36).slice(2, 9)}`

  function toggle(): void {
    open = !open
    ontoggle?.(open)
  }
</script>

<section class="xp-taskpanel" class:special class:closed={!open} data-testid={testid}>
  <header>
    <button type="button" class="title" aria-expanded={open} aria-controls={id} data-testid={testid ? `${testid}-toggle` : undefined} onclick={toggle}>
      {#if icon}<span class="icon">{@render icon()}</span>{/if}
      <span class="text">{title}</span>
    </button>
    {#if actions}<span class="actions">{@render actions()}</span>{/if}
    <button type="button" class="chev" tabindex="-1" aria-hidden="true" onclick={toggle}>
      <svg width="17" height="17" viewBox="0 0 17 17">
        <circle cx="8.5" cy="8.5" r="7.5" />
        <path d={open ? 'M5.5 8.5l3-3 3 3M5.5 12l3-3 3 3' : 'M5.5 5l3 3 3-3M5.5 8.5l3 3 3-3'} />
      </svg>
    </button>
  </header>
  {#if open}
    <div class="body" {id}>{@render children()}</div>
  {/if}
</section>

<style>
  .xp-taskpanel {
    margin: 0 0 10px;
    border-radius: 3px 3px 0 0;
    font: var(--xp-font);
  }
  header {
    display: flex;
    align-items: center;
    height: 24px;
    padding: 0 3px 0 10px;
    border-radius: 3px 3px 0 0;
    background: linear-gradient(90deg, #fff 0, #c6d3f7 100%);
  }
  .special header {
    background: linear-gradient(90deg, #0c32a8 0, #2b6ae0 100%);
  }
  .title {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 5px;
    height: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: #215dc6;
    font: inherit;
    font-weight: 700;
    text-align: left;
    cursor: pointer;
  }
  .special .title {
    color: #fff;
  }
  .title:hover {
    color: #428eff;
  }
  .special .title:hover {
    color: #c6d3f7;
  }
  .title:focus-visible {
    outline: var(--xp-focus-outline);
  }
  .text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .icon {
    display: inline-flex;
    width: 16px;
    height: 16px;
  }
  .actions {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    margin-right: 3px;
  }
  .chev {
    display: inline-flex;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
  }
  .chev circle {
    fill: #fff;
    stroke: #b0bfe8;
  }
  .chev path {
    fill: none;
    stroke: #215dc6;
    stroke-width: 1.4;
  }
  .special .chev circle {
    fill: #3d70e3;
    stroke: #c6d3f7;
  }
  .special .chev path {
    stroke: #fff;
  }
  .chev:hover path {
    stroke: #428eff;
  }
  .body {
    padding: 8px 10px;
    border: 1px solid #fff;
    border-top: 0;
    background: #d6dff7;
    color: #000;
  }
  .special .body {
    background: #eff3ff;
  }
</style>

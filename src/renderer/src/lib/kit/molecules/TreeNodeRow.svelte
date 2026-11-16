<script lang="ts">
  import Icon from '../atoms/Icon.svelte'
  import type { IconName } from '../atoms/icons'

  const INDENT = 14

  interface Props {
    text: string
    icon?: IconName
    /** Zero-based depth. */
    level?: number
    hasChildren?: boolean
    expanded?: boolean
    selected?: boolean
    /** Keyboard focus rectangle (the tree has focus and this is its active node). */
    focused?: boolean
    disabled?: boolean
    /** Children are being loaded. */
    loading?: boolean
    bold?: boolean
    /** Suffix after the label. */
    badge?: string
    /** Dotted connector lines (ShowLines): per-ancestor "line continues" flags and last-sibling flag. */
    lines?: { ancestors: boolean[]; last: boolean }
    id?: string
    testid?: string
    ariaSetSize?: number
    ariaPosInSet?: number
    ontoggle?: () => void
    onclick?: (event: MouseEvent) => void
    ondblclick?: (event: MouseEvent) => void
    oncontextmenu?: (event: MouseEvent) => void
  }

  let {
    text,
    icon,
    level = 0,
    hasChildren = false,
    expanded = false,
    selected = false,
    focused = false,
    disabled = false,
    loading = false,
    bold = false,
    badge,
    lines,
    id,
    testid,
    ariaSetSize,
    ariaPosInSet,
    ontoggle,
    onclick,
    ondblclick,
    oncontextmenu
  }: Props = $props()
</script>

<div
  {id}
  data-testid={testid}
  class="trow"
  role="treeitem"
  tabindex="-1"
  aria-level={level + 1}
  aria-setsize={ariaSetSize}
  aria-posinset={ariaPosInSet}
  aria-expanded={hasChildren ? expanded : undefined}
  aria-selected={selected}
  aria-disabled={disabled || undefined}
  aria-busy={loading || undefined}
>
  {#if lines}
    {#each { length: level } as _, k (k)}
      <span class="guide" class:vline={k < level - 1 ? lines.ancestors[k] : true} class:half={k === level - 1 && lines.last} class:elbow={k === level - 1}></span>
    {/each}
  {:else}
    <span class="pad" style="width:{level * INDENT}px"></span>
  {/if}
  {#if hasChildren}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <span class="tarrow" onclick={ontoggle} onpointerdown={(e) => e.preventDefault()}>
      {#if expanded}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M8.5 2L8.5 8.5L2 8.5z" fill="#404040" stroke="#404040" /></svg>
      {:else}
        <svg class="closed" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 1.5L7 5L3 8.5z" fill="#fff" stroke="#6e6e6e" /></svg>
      {/if}
    </span>
  {:else}
    <span class="tarrow none"></span>
  {/if}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <span class="tlabel" class:selected class:focused class:disabled class:bold {onclick} {ondblclick} {oncontextmenu}>
    {#if icon}<Icon name={icon} />{/if}
    <span class="text">{text}</span>
    {#if badge}<span class="badge">{badge}</span>{/if}
  </span>
</div>

<style>
  .trow {
    display: flex;
    align-items: center;
    height: 22px;
    outline: none;
  }
  .pad {
    flex: none;
    height: 1px;
  }
  .guide {
    position: relative;
    flex: none;
    width: 14px;
    align-self: stretch;
  }
  .guide.vline::before {
    content: '';
    position: absolute;
    left: 7px;
    top: 0;
    bottom: 0;
    border-left: 1px dotted #808080;
  }
  .guide.half::before {
    bottom: 50%;
  }
  .guide.elbow::after {
    content: '';
    position: absolute;
    left: 7px;
    right: -8px;
    top: 50%;
    border-top: 1px dotted #808080;
  }
  .tarrow {
    flex: none;
    width: 16px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .tarrow svg.closed:hover path {
    stroke: #1c9bd8;
    fill: #e5f5fd;
  }
  .tlabel {
    height: 20px;
    padding: 0 4px;
    border: 1px solid transparent;
    border-radius: 2px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--w7-text);
    white-space: nowrap;
    cursor: default;
  }
  .tlabel:hover:not(.disabled) {
    border-color: var(--w7-hot-border);
    background: var(--w7-hot-face);
  }
  .tlabel.selected {
    border-color: var(--w7-select-border);
    background: var(--w7-select-face);
  }
  .tlabel.focused {
    outline: var(--w7-focus-outline);
    outline-offset: -3px;
  }
  .tlabel.bold {
    font-weight: 700;
  }
  .tlabel.disabled {
    color: var(--w7-text-disabled);
  }
  .badge {
    margin-left: 4px;
    color: #8a4b00;
    font-weight: 700;
  }
</style>

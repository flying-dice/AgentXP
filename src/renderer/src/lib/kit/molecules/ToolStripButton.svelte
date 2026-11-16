<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'
  import Icon from '../atoms/Icon.svelte'
  import type { IconName } from '../atoms/icons'

  interface Props extends Omit<HTMLButtonAttributes, 'children'> {
    icon?: IconName
    /** Custom 16px glyph instead of a named icon. */
    glyph?: Snippet
    text?: string
    /** Pressed state. When defined the button is a toggle (aria-pressed). */
    checked?: boolean
    /** Toggle `checked` on click (CheckOnClick). */
    checkOnClick?: boolean
    /** Open drop-down state, used by ToolStripDropDownButton. */
    expanded?: boolean
    ref?: HTMLButtonElement | null
  }

  let {
    icon,
    glyph,
    text,
    checked = $bindable(undefined),
    checkOnClick = false,
    expanded,
    disabled = false,
    type = 'button',
    ref = $bindable(null),
    class: className = '',
    onclick,
    ...rest
  }: Props = $props()

  function click(event: MouseEvent & { currentTarget: HTMLButtonElement }): void {
    if (checkOnClick) checked = !checked
    ;(onclick as ((e: MouseEvent) => void) | null | undefined)?.(event)
  }
</script>

<button
  bind:this={ref}
  class="tb {className}"
  class:checked
  class:expanded
  {type}
  {disabled}
  aria-pressed={checked === undefined ? undefined : checked}
  aria-label={text ? undefined : rest['aria-label'] ?? rest.title}
  onclick={click}
  {...rest}
>
  {#if glyph}<span class="glyph">{@render glyph()}</span>{:else if icon}<Icon name={icon} />{/if}
  {#if text}<span class="label">{text}</span>{/if}
</button>

<style>
  .tb {
    height: 28px;
    padding: 0 7px;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--w7-text);
    cursor: default;
    white-space: nowrap;
    outline: none;
  }
  .tb:hover:not(:disabled),
  .tb.checked:not(:disabled),
  .tb.expanded {
    border-color: var(--w7-toolbar-hover-border);
    background: var(--w7-toolbar-hover-face);
  }
  .tb.checked:not(:disabled):not(:hover),
  .tb.expanded {
    border-color: #6d94c9;
    background: linear-gradient(#d4e2f4, #c1d5ee);
  }
  .tb:active:not(:disabled) {
    border-color: #6d94c9;
    background: linear-gradient(#d4e2f4, #c1d5ee);
  }
  .tb:focus-visible {
    outline: var(--w7-focus-outline);
    outline-offset: -3px;
  }
  .tb:disabled {
    color: var(--w7-text-disabled);
  }
  .tb:disabled :global(.w7-icon),
  .tb:disabled .glyph {
    opacity: 0.45;
  }
  .glyph {
    display: inline-flex;
    width: 16px;
    height: 16px;
  }
</style>

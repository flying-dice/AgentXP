<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'
  import Icon from './Icon.svelte'
  import type { IconName } from './icons'

  interface Props extends Omit<HTMLButtonAttributes, 'children'> {
    /** `flat` is FlatStyle.Flat; `default` is FlatStyle.Standard. */
    variant?: 'default' | 'flat'
    /** The form's AcceptButton: blue glow. */
    isDefault?: boolean
    icon?: IconName
    children?: Snippet
  }

  let {
    variant = 'default',
    isDefault = false,
    icon,
    type = 'button',
    disabled = false,
    class: className = '',
    children,
    ...rest
  }: Props = $props()
</script>

<button
  class="xp-btn {variant} {className}"
  class:def={isDefault}
  {type}
  {disabled}
  {...rest}
>
  {#if icon}<Icon name={icon} />{/if}
  {#if children}<span class="text">{@render children()}</span>{/if}
</button>

<style>
  .xp-btn {
    min-width: 75px;
    height: 23px;
    padding: 0 10px;
    border: 1px solid var(--w7-border);
    border-radius: 3px;
    background: var(--w7-btn-face);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8);
    color: var(--w7-text);
    font: inherit;
    cursor: default;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    white-space: nowrap;
  }
  .xp-btn:hover:not(:disabled) {
    border-color: var(--w7-btn-hover-border);
    background: var(--w7-btn-hover-face);
  }
  .xp-btn:active:not(:disabled) {
    border-color: var(--w7-btn-active-border);
    background: var(--w7-btn-active-face);
  }
  .xp-btn.def {
    border-color: var(--w7-btn-default-border);
    box-shadow:
      inset 0 0 0 1px #bfe3ff,
      0 0 3px rgba(51, 153, 255, 0.7);
  }
  .xp-btn.def:hover:not(:disabled) {
    border-color: var(--w7-btn-hover-border);
  }
  .xp-btn:focus-visible {
    outline: var(--w7-focus-outline);
    outline-offset: -4px;
  }
  .xp-btn:disabled {
    border-color: var(--w7-border-disabled);
    background: #f4f4f4;
    box-shadow: none;
    color: var(--w7-text-disabled);
  }
  .xp-btn:disabled :global(.xp-icon) {
    opacity: 0.45;
  }

  /* FlatStyle.Flat */
  .xp-btn.flat {
    border-radius: 0;
    border-color: var(--w7-border);
    background: var(--w7-face);
    box-shadow: none;
  }
  .xp-btn.flat:hover:not(:disabled) {
    border-color: var(--w7-border);
    background: #e5e5e5;
  }
  .xp-btn.flat:active:not(:disabled) {
    border-color: var(--w7-border);
    background: #cdcdcd;
  }
  .xp-btn.flat.def {
    border-color: #000;
    box-shadow: inset 0 0 0 1px #000;
  }
  .xp-btn.flat:disabled {
    background: var(--w7-face);
    border-color: var(--w7-border-disabled);
  }
</style>

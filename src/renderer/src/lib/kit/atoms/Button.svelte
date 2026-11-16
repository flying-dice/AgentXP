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
  class="w7-btn {variant} {className}"
  class:def={isDefault}
  {type}
  {disabled}
  {...rest}
>
  {#if icon}<Icon name={icon} />{/if}
  {#if children}<span class="text">{@render children()}</span>{/if}
</button>

<style>
  .w7-btn {
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
  .w7-btn:hover:not(:disabled) {
    border-color: var(--w7-btn-hover-border);
    background: var(--w7-btn-hover-face);
  }
  .w7-btn:active:not(:disabled) {
    border-color: var(--w7-btn-active-border);
    background: var(--w7-btn-active-face);
  }
  .w7-btn.def {
    border-color: var(--w7-btn-default-border);
    box-shadow:
      inset 0 0 0 1px #bfe3ff,
      0 0 3px rgba(51, 153, 255, 0.7);
  }
  .w7-btn.def:hover:not(:disabled) {
    border-color: var(--w7-btn-hover-border);
  }
  .w7-btn:focus-visible {
    outline: var(--w7-focus-outline);
    outline-offset: -4px;
  }
  .w7-btn:disabled {
    border-color: var(--w7-border-disabled);
    background: #f4f4f4;
    box-shadow: none;
    color: var(--w7-text-disabled);
  }
  .w7-btn:disabled :global(.w7-icon) {
    opacity: 0.45;
  }

  /* FlatStyle.Flat */
  .w7-btn.flat {
    border-radius: 0;
    border-color: var(--w7-border);
    background: var(--w7-face);
    box-shadow: none;
  }
  .w7-btn.flat:hover:not(:disabled) {
    border-color: var(--w7-border);
    background: #e5e5e5;
  }
  .w7-btn.flat:active:not(:disabled) {
    border-color: var(--w7-border);
    background: #cdcdcd;
  }
  .w7-btn.flat.def {
    border-color: #000;
    box-shadow: inset 0 0 0 1px #000;
  }
  .w7-btn.flat:disabled {
    background: var(--w7-face);
    border-color: var(--w7-border-disabled);
  }
</style>

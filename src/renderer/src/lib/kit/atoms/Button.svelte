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
    border: 1px solid var(--xp-border);
    border-radius: 3px;
    background: var(--xp-btn-face);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8);
    color: var(--xp-text);
    font: inherit;
    cursor: default;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    white-space: nowrap;
  }
  .xp-btn:hover:not(:disabled) {
    border-color: var(--xp-btn-hover-border);
    background: var(--xp-btn-hover-face);
  }
  .xp-btn:active:not(:disabled) {
    border-color: var(--xp-btn-active-border);
    background: var(--xp-btn-active-face);
  }
  .xp-btn.def {
    border-color: var(--xp-btn-default-border);
    box-shadow:
      inset 0 0 0 1px #bfe3ff,
      0 0 3px rgba(51, 153, 255, 0.7);
  }
  .xp-btn.def:hover:not(:disabled) {
    border-color: var(--xp-btn-hover-border);
  }
  .xp-btn:focus-visible {
    outline: var(--xp-focus-outline);
    outline-offset: -4px;
  }
  .xp-btn:disabled {
    border-color: var(--xp-border-disabled);
    background: #f4f4f4;
    box-shadow: none;
    color: var(--xp-text-disabled);
  }
  .xp-btn:disabled :global(.xp-icon) {
    opacity: 0.45;
  }

  /* FlatStyle.Flat */
  .xp-btn.flat {
    border-radius: 0;
    border-color: var(--xp-border);
    background: var(--xp-face);
    box-shadow: none;
  }
  .xp-btn.flat:hover:not(:disabled) {
    border-color: var(--xp-border);
    background: #e5e5e5;
  }
  .xp-btn.flat:active:not(:disabled) {
    border-color: var(--xp-border);
    background: #cdcdcd;
  }
  .xp-btn.flat.def {
    border-color: #000;
    box-shadow: inset 0 0 0 1px #000;
  }
  .xp-btn.flat:disabled {
    background: var(--xp-face);
    border-color: var(--xp-border-disabled);
  }
</style>

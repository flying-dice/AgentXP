<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    text?: string
    /** LinkVisited: turns purple. Set automatically after a click. */
    visited?: boolean
    disabled?: boolean
    href?: string
    class?: string
    onclick?: (event: MouseEvent) => void
    children?: Snippet
  }

  let {
    text,
    visited = $bindable(false),
    disabled = false,
    href = '#',
    class: className = '',
    onclick,
    children
  }: Props = $props()

  function handleClick(event: MouseEvent): void {
    if (href === '#') event.preventDefault()
    if (disabled) {
      event.preventDefault()
      return
    }
    visited = true
    onclick?.(event)
  }
</script>

<a
  class="xp-link {className}"
  class:visited
  class:disabled
  {href}
  aria-disabled={disabled || undefined}
  tabindex={disabled ? -1 : undefined}
  onclick={handleClick}
>
  {#if children}{@render children()}{:else}{text}{/if}
</a>

<style>
  .xp-link {
    color: var(--xp-link);
    text-decoration: underline;
    cursor: pointer;
  }
  .xp-link:hover {
    color: #ff0000;
  }
  .xp-link:active {
    color: #ff0000;
  }
  .xp-link.visited {
    color: #800080;
  }
  .xp-link.disabled {
    color: var(--xp-text-disabled);
    cursor: default;
    text-decoration: none;
  }
  .xp-link:focus-visible {
    outline: var(--xp-focus-outline);
  }
</style>

<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    text?: string
    /** LinkVisited: turns purple. Set automatically after a click. */
    visited?: boolean
    disabled?: boolean
    href?: string
    class?: string
    'data-testid'?: string
    onclick?: (event: MouseEvent) => void
    children?: Snippet
  }

  let {
    text,
    visited = $bindable(false),
    disabled = false,
    href = '#',
    class: className = '',
    'data-testid': testid,
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
  class="w7-link {className}"
  class:visited
  class:disabled
  {href}
  data-testid={testid}
  aria-disabled={disabled || undefined}
  tabindex={disabled ? -1 : undefined}
  onclick={handleClick}
>
  {#if children}{@render children()}{:else}{text}{/if}
</a>

<style>
  .w7-link {
    color: var(--w7-link);
    text-decoration: underline;
    cursor: pointer;
  }
  .w7-link:hover {
    color: #ff0000;
  }
  .w7-link:active {
    color: #ff0000;
  }
  .w7-link.visited {
    color: #800080;
  }
  .w7-link.disabled {
    color: var(--w7-text-disabled);
    cursor: default;
    text-decoration: none;
  }
  .w7-link:focus-visible {
    outline: var(--w7-focus-outline);
  }
</style>

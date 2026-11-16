<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    title?: string
    children?: Snippet
    class?: string
  }

  let { title, children, class: className = '' }: Props = $props()
</script>

<section class="w7-gadget {className}" aria-label={title}>
  {#if title}<h3>{title}</h3>{/if}
  <div class="content">{@render children?.()}</div>
</section>

<style>
  .w7-gadget {
    box-sizing: border-box;
    padding: 8px 10px 9px;
    border: 1px solid var(--w7-gadget-border);
    border-radius: 4px;
    background: var(--w7-gadget-face);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12), 0 2px 8px rgba(0, 0, 0, 0.35);
    color: var(--w7-gadget-text);
    font: var(--w7-font);
    user-select: none;
  }
  h3 {
    margin: 0 0 4px;
    font: inherit;
    font-size: 11px;
    font-weight: 400;
    color: var(--w7-gadget-muted);
  }
  .content {
    min-width: 0;
  }
</style>

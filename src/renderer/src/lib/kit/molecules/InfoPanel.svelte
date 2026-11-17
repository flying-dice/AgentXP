<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    title?: string
    children?: Snippet
    class?: string
  }

  let { title, children, class: className = '' }: Props = $props()
</script>

<section class="xp-infopanel {className}" aria-label={title}>
  {#if title}<h3>{title}</h3>{/if}
  <div class="content">{@render children?.()}</div>
</section>

<style>
  /* An XP task pane: a rounded header with a pale gradient and a bold blue title, over a light blue body. */
  .xp-infopanel {
    box-sizing: border-box;
    border-radius: 6px 6px 0 0;
    background: var(--xp-infopanel-face);
    color: var(--xp-infopanel-text);
    font: var(--xp-font);
    user-select: none;
    overflow: hidden;
    box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);
  }
  h3 {
    margin: 0;
    padding: 5px 10px 5px;
    font: inherit;
    font-weight: bold;
    color: #fff;
    background: linear-gradient(90deg, #0c3fb0 0, #2c6ee0 70%, #4a8af0 100%);
  }
  .content {
    min-width: 0;
    margin: 0 1px 1px;
    padding: 8px 10px 9px;
    border: 1px solid #fff;
    border-top: 0;
    background: var(--xp-infopanel-face);
  }
</style>

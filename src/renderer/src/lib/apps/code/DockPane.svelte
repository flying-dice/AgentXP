<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    title: string
    /** The caption's close button; omitted = no button. */
    onclose?: () => void
    testid?: string
    children: Snippet
  }

  let { title, onclose, testid, children }: Props = $props()
</script>

<section class="dock" data-testid={testid} aria-label={title}>
  <header>
    <span class="title">{title}</span>
    {#if onclose}<button class="x" type="button" aria-label="Close {title}" title="Close" onclick={onclose}>&times;</button>{/if}
  </header>
  <div class="body">{@render children()}</div>
</section>

<style>
  .dock {
    height: 100%;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
    border: 1px solid var(--w7-panel-border);
  }
  header {
    flex: none;
    display: flex;
    align-items: center;
    height: 19px;
    padding: 0 2px 0 6px;
    background: linear-gradient(#f4f7fb, #d5dfee);
    border-bottom: 1px solid #aab7cb;
  }
  .title {
    flex: 1;
    font-weight: 700;
    color: #1e395b;
  }
  .x {
    width: 15px;
    height: 15px;
    padding: 0;
    line-height: 13px;
    border: 1px solid transparent;
    border-radius: 2px;
    background: transparent;
    color: #444;
    font-size: 13px;
    cursor: default;
  }
  .x:hover {
    color: #fff;
    border-color: #8c3a2c;
    background: linear-gradient(#e9907c, #c4503e);
  }
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 2px;
  }
</style>

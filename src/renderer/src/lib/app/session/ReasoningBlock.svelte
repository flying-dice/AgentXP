<script lang="ts">
  interface Props {
    text: string
    open?: boolean
  }

  let { text, open = $bindable(false) }: Props = $props()
</script>

<div class="reasoning">
  <button class="toggle" type="button" aria-expanded={open} onclick={() => (open = !open)}>
    <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
      {#if open}
        <path d="M8.5 2L8.5 8.5L2 8.5z" fill="#404040" stroke="#404040" />
      {:else}
        <path d="M3 1.5L7 5L3 8.5z" fill="#fff" stroke="#6e6e6e" />
      {/if}
    </svg>
    <span>Thinking…</span>
  </button>
  {#if open}<div class="text">{text}</div>{/if}
</div>

<style>
  .reasoning {
    color: var(--w7-text-muted);
    font-style: italic;
  }
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 1px 3px;
    border: 1px solid transparent;
    background: none;
    font: inherit;
    color: inherit;
  }
  .toggle:hover {
    border-color: var(--w7-hot-border);
    background: var(--w7-hot-face);
  }
  .toggle:focus-visible {
    outline: var(--w7-focus-outline);
    outline-offset: -2px;
  }
  .text {
    margin: 2px 0 0 17px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.4;
  }
</style>

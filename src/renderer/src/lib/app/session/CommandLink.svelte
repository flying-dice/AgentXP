<script lang="ts">
  interface Props {
    kind: 'allow' | 'deny'
    title: string
    description: string
    onclick?: () => void
    testid?: string
  }

  let { kind, title, description, onclick, testid }: Props = $props()
</script>

<button class="command-link" type="button" data-testid={testid} data-decision={kind} {onclick}>
  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
    {#if kind === 'allow'}
      <circle cx="10" cy="10" r="9" fill="#3fae3f" stroke="#237a23" />
      <path d="M5 10h8M10 6l4 4-4 4" fill="none" stroke="#fff" stroke-width="2" />
    {:else}
      <circle cx="10" cy="10" r="9" fill="#d9403a" stroke="#8f1d18" />
      <path d="M6.5 6.5l7 7M13.5 6.5l-7 7" stroke="#fff" stroke-width="2" />
    {/if}
  </svg>
  <span class="text">
    <span class="title">{title}</span>
    <span class="description">{description}</span>
  </span>
</button>

<style>
  .command-link {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
    padding: 6px 8px;
    border: 1px solid transparent;
    background: none;
    text-align: left;
    font: inherit;
  }
  .command-link svg {
    flex: none;
    margin-top: 1px;
  }
  .text {
    display: block;
  }
  .title {
    display: block;
    font-size: 14px;
    color: #003399;
  }
  .description {
    display: block;
    color: #333;
  }
  .command-link:hover {
    border-color: var(--w7-hot-border);
    background: var(--w7-hot-face);
  }
  .command-link:active {
    border-color: var(--w7-select-border);
    background: var(--w7-select-face);
  }
  .command-link:focus-visible {
    outline: var(--w7-focus-outline);
    outline-offset: -3px;
  }
</style>

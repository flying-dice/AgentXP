<script lang="ts">
  interface Props {
    kind: 'allow' | 'deny'
    title: string
    description: string
    onclick?: () => void
    testid?: string
    /** The dialog puts the first focus here (`data-autofocus`). */
    autofocus?: boolean
    /** Index of the access key letter in `title` (-1: none); it is underlined while `showKey` is true (Alt is held). */
    keyIndex?: number
    showKey?: boolean
    /** One short button: the description moves into the tooltip, so the two answers fit on a row beside the key hint. */
    compact?: boolean
  }

  let { kind, title, description, onclick, testid, autofocus = false, keyIndex = -1, showKey = false, compact = false }: Props = $props()
</script>

<button class="command-link" class:compact type="button" data-testid={testid} data-decision={kind} data-autofocus={autofocus ? '' : undefined} title={compact ? description : undefined} {onclick}>
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
    <span class="title">{#if keyIndex >= 0}{title.slice(0, keyIndex)}<span class="key" class:shown={showKey}>{title[keyIndex]}</span>{title.slice(keyIndex + 1)}{:else}{title}{/if}</span>
    {#if !compact}<span class="description">{description}</span>{/if}
  </span>
</button>

<style>
  .command-link {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #dfe6ee;
    background: none;
    text-align: left;
    font: inherit;
  }
  .command-link.compact {
    width: auto;
    align-items: center;
    padding: 3px 10px 3px 6px;
  }
  .command-link.compact svg {
    margin-top: 0;
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
  .key.shown {
    text-decoration: underline;
  }
  .description {
    display: block;
    color: #333;
  }
  .command-link:hover {
    border-color: var(--xp-hot-border);
    background: var(--xp-hot-face);
  }
  .command-link:active {
    border-color: var(--xp-select-border);
    background: var(--xp-select-face);
  }
  .command-link:focus-visible {
    outline: var(--xp-focus-outline);
    outline-offset: -3px;
  }
</style>

<script lang="ts">
  import Icon from '../atoms/Icon.svelte'
  import type { IconName } from '../atoms/icons'

  interface Props {
    label: string
    icon?: IconName
    disabled?: boolean
    title?: string
    testid?: string
    onclick?: () => void
  }

  let { label, icon, disabled = false, title, testid, onclick }: Props = $props()
</script>

<button type="button" class="xp-tasklink" {disabled} {title} data-testid={testid} {onclick}>
  {#if icon}<Icon name={icon} />{/if}
  <span>{label}</span>
</button>

<style>
  .xp-tasklink {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 1px 0;
    border: 0;
    background: none;
    font: inherit;
    color: var(--xp-taskpane-link);
    text-align: left;
    cursor: default;
  }
  .xp-tasklink:hover:not(:disabled) {
    color: var(--xp-taskpane-link-hot);
    text-decoration: underline;
  }
  .xp-tasklink:focus-visible {
    outline: 1px dotted #000;
  }
  .xp-tasklink:disabled {
    color: var(--xp-text-disabled);
  }
  .xp-tasklink:disabled :global(svg) {
    opacity: 0.5;
  }
</style>

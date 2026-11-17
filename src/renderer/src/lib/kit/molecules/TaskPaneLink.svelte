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

<button type="button" class="w7-tasklink" {disabled} {title} data-testid={testid} {onclick}>
  {#if icon}<Icon name={icon} />{/if}
  <span>{label}</span>
</button>

<style>
  .w7-tasklink {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 1px 0;
    border: 0;
    background: none;
    font: inherit;
    color: var(--w7-taskpane-link, #215dc6);
    text-align: left;
    cursor: default;
  }
  .w7-tasklink:hover:not(:disabled) {
    color: var(--w7-taskpane-link-hot, #428eff);
    text-decoration: underline;
  }
  .w7-tasklink:focus-visible {
    outline: 1px dotted #000;
  }
  .w7-tasklink:disabled {
    color: var(--w7-text-disabled);
  }
  .w7-tasklink:disabled :global(svg) {
    opacity: 0.5;
  }
</style>

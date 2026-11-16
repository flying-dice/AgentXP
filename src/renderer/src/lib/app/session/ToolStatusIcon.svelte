<script lang="ts">
  import Icon from '../../kit/atoms/Icon.svelte'
  import Spinner from '../../kit/atoms/Spinner.svelte'
  import type { ToolStatusKind } from './toolStatus'

  interface Props {
    kind: ToolStatusKind
    label?: string
  }

  let { kind, label = '' }: Props = $props()
</script>

<span class="status-icon" role="img" aria-label={label}>
  {#if kind === 'running'}
    <Spinner size={14} label="Running" />
  {:else if kind === 'waiting'}
    <Icon name="shield" size={16} />
  {:else if kind === 'done'}
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="#3fae3f" stroke="#237a23" />
      <path d="M4.5 8.2l2.4 2.4 4.6-4.8" fill="none" stroke="#fff" stroke-width="2" />
    </svg>
  {:else if kind === 'denied'}
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="#9a9a9a" stroke="#666" />
      <path d="M4.5 8h7" stroke="#fff" stroke-width="2" />
    </svg>
  {:else}
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="#d9403a" stroke="#8f1d18" />
      <path d="M5 5l6 6M11 5l-6 6" stroke="#fff" stroke-width="2" />
    </svg>
  {/if}
</span>

<style>
  .status-icon {
    width: 16px;
    height: 16px;
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
</style>

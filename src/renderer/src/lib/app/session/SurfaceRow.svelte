<script lang="ts">
  import type { A2uiSurfaceTarget } from '@shared/a2ui'
  import Button from '../../kit/atoms/Button.svelte'
  import Icon from '../../kit/atoms/Icon.svelte'
  import ToolStripDropDownButton from '../../kit/molecules/ToolStripDropDownButton.svelte'
  import { TARGET_LABELS, type SurfaceRowModel } from './surfaceRow'

  interface Props {
    model: SurfaceRowModel
    onopen?: () => void
    onclose?: () => void
    ondelete?: () => void
    onmove?: (target: A2uiSurfaceTarget) => void
  }

  let { model, onopen, onclose, ondelete, onmove }: Props = $props()

  const moveItems = $derived(
    model.moveTargets.map((t) => ({ id: `move-${t}`, testid: `chat-surface-move-${t}`, label: TARGET_LABELS[t], action: () => onmove?.(t) }))
  )
</script>

<div class="surface-row" class:inline={!model.hasOpenClose} data-testid="chat-surface-row" data-surface-id={model.surfaceId} data-state={model.state} data-target={model.target}>
  {#if model.hasOpenClose}
    <Icon name={model.icon} />
    <span class="label" title={model.stateText}>
      <span class="intro">The agent opened a {model.purpose}: <span class="title" data-testid="chat-surface-title">{model.title}</span>.<span class="state" data-testid="chat-surface-state"> ({model.stateLabel})</span></span>
      <span class="where" data-testid="chat-surface-where">{model.where}</span>
    </span>
  {:else}
    <span class="grow"></span>
  {/if}
  {#if model.hasOpenClose}
    <Button data-testid="chat-surface-open" disabled={!model.canOpen} onclick={() => onopen?.()}>{model.openLabel}</Button>
    <Button data-testid="chat-surface-close" disabled={!model.canClose} onclick={() => onclose?.()}>Close</Button>
  {/if}
  <Button data-testid="chat-surface-delete" onclick={() => ondelete?.()}>Delete</Button>
  <ToolStripDropDownButton text="Move to" testid="chat-surface-move" items={moveItems} />
</div>

<style>
  .surface-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    background: linear-gradient(#fafcfe, #e6edf7);
    border: 1px solid var(--w7-panel-border);
    font: var(--w7-font);
    color: var(--w7-text);
  }
  .surface-row.inline {
    padding: 1px 2px;
    background: none;
    border: 0;
    justify-content: flex-end;
  }
  .grow {
    flex: 1;
  }
  .label {
    flex: 1 1 200px;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .intro,
  .where {
    overflow-wrap: anywhere;
  }
  .title {
    font-weight: 600;
  }
  .where {
    color: var(--w7-text-muted);
  }
  .state {
    flex: none;
    color: var(--w7-text-muted);
  }
  .surface-row {
    flex-wrap: wrap;
  }
  .surface-row :global(.w7-btn) {
    flex: none;
    min-width: 56px;
    padding: 0 10px;
  }
</style>

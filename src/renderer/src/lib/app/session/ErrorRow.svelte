<script lang="ts">
  import Button from '../../kit/atoms/Button.svelte'
  import MessageIcon from '../../kit/molecules/MessageIcon.svelte'
  import type { ProblemAction, ProblemActionId } from './chatProblem'

  interface Props {
    message: string
    /** The buttons of the row (see `describeProblem`). */
    actions?: readonly ProblemAction[]
    onaction?: (id: ProblemActionId) => void
  }

  let { message, actions = [], onaction }: Props = $props()
</script>

<div class="error-row" role="alert" data-testid="chat-error">
  <MessageIcon kind="error" size={20} />
  <div class="main">
    <span class="text" data-testid="chat-error-text">{message}</span>
    {#if actions.length > 0}
      <div class="actions">
        {#each actions as action (action.id)}
          <Button data-testid="chat-error-{action.id}" onclick={() => onaction?.(action.id)}>{action.label}</Button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .error-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 4px 6px;
    border: 1px solid #d9a5a1;
    background: #fff0ef;
    color: #7a0000;
  }
  .main {
    min-width: 0;
    flex: 1;
  }
  .text {
    display: block;
    padding-top: 2px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    user-select: text;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 6px 0 2px;
  }
  .actions :global(.w7-btn) {
    min-width: 0;
    padding: 0 10px;
  }
</style>

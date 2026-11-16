<script lang="ts">
  import Button from '../../kit/atoms/Button.svelte'
  import MessageIcon from '../../kit/molecules/MessageIcon.svelte'
  import { defaultActionId, type ProblemAction, type ProblemActionId } from './chatProblem'

  interface Props {
    message: string
    /** The buttons of the row (see `describeProblem`). */
    actions?: readonly ProblemAction[]
    onaction?: (id: ProblemActionId) => void
    /** The technical text behind "Details...", shown inline under the buttons while it is open (null: closed). */
    details?: string | null
    /** Something the user asked for (they ended the agent program): a grey notice with an information icon, not a red error (UX-201). */
    notice?: boolean
  }

  let { message, actions = [], onaction, details = null, notice = false }: Props = $props()

  /** The buttons; Event Viewer is a link in the sentence after them. */
  const buttons = $derived(actions.filter((a) => a.id !== 'event-viewer'))
  const hasEventViewer = $derived(actions.some((a) => a.id === 'event-viewer'))
  /** The recovery that works is the highlighted button. */
  const primary = $derived(defaultActionId(actions))
</script>

<div class="error-row" class:notice role={notice ? 'status' : 'alert'} data-testid="chat-error" data-notice={notice}>
  <MessageIcon kind={notice ? 'information' : 'error'} size={20} />
  <div class="main">
    <span class="text" data-testid="chat-error-text">{message}</span>
    {#if buttons.length > 0}
      <div class="actions">
        {#each buttons as action (action.id)}
          <Button data-testid="chat-error-{action.id}" isDefault={action.id === primary} onclick={() => onaction?.(action.id)}>{action.id === 'details' && details !== null ? 'Hide details' : action.label}</Button>
        {/each}
      </div>
    {/if}
    {#if hasEventViewer}
      <p class="where">The details are in <button type="button" class="link" data-testid="chat-error-event-viewer" onclick={() => onaction?.('event-viewer')}>Event Viewer</button>.</p>
    {/if}
    {#if details !== null}<pre class="details" data-testid="chat-error-details-text">{details}</pre>{/if}
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
  .error-row.notice {
    border-color: #b9c7da;
    background: #f4f7fb;
    color: #1d3a63;
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
  .details {
    margin: 4px 0 2px;
    padding: 4px 6px;
    max-height: 160px;
    overflow: auto;
    border: 1px solid #d9a5a1;
    background: #fff;
    color: #333;
    font: 11px/1.4 Consolas, 'Courier New', monospace;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    user-select: text;
  }
  .where {
    margin: 4px 0 0;
    color: #333;
  }
  .link {
    padding: 0;
    border: 0;
    background: none;
    color: var(--w7-link);
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
  .link:focus-visible {
    outline: var(--w7-focus-outline);
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

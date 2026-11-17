<script lang="ts">
  import MessageIcon from '../../kit/molecules/MessageIcon.svelte'
  import { stopNoticeLines } from './stopNotice'

  /** `reason` is the ACP stop reason (`refusal`, `max_tokens`, `max_turn_requests`...); `cancelled` is the user's own Stop. */
  let { reason, programRunning = true }: { reason: string; programRunning?: boolean } = $props()

  const lines = $derived(stopNoticeLines(reason, programRunning))
</script>

<div class="stop-notice" role="status" data-testid="chat-stop-notice" data-reason={reason}>
  <MessageIcon kind={reason === 'cancelled' ? 'information' : 'warning'} size={20} />
  <span class="text">
    <span data-testid="chat-stop-notice-text">{lines[0]}</span>
    {#if lines[1]}<span class="second" data-testid="chat-stop-notice-program">{lines[1]}</span>{/if}
  </span>
</div>

<style>
  .stop-notice {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 4px 6px;
    border: 1px solid #e0c97a;
    background: #fffbe6;
    color: #4a3b00;
  }
  .stop-notice[data-reason='cancelled'] {
    border-color: #b9c7da;
    background: #f4f2e8;
    color: #1d3a63;
  }
  .text {
    padding-top: 2px;
    overflow-wrap: anywhere;
    user-select: text;
  }
  .second {
    display: block;
  }
</style>

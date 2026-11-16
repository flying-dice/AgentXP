<script lang="ts">
  import { stopNoticeText } from '@shared/agui-state'
  import MessageIcon from '../../kit/molecules/MessageIcon.svelte'

  /** `reason` is the ACP stop reason (`refusal`, `max_tokens`, `max_turn_requests`...). */
  let { reason }: { reason: string } = $props()
</script>

<div class="stop-notice" role="status" data-testid="chat-stop-notice" data-reason={reason}>
  <MessageIcon kind="warning" size={20} />
  <span class="text">{stopNoticeText(reason)}</span>
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
  .text {
    padding-top: 2px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    user-select: text;
  }
</style>

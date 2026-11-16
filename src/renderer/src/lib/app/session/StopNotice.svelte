<script lang="ts">
  import { stopNoticeText } from '@shared/agui-state'
  import LinkLabel from '../../kit/atoms/LinkLabel.svelte'
  import MessageIcon from '../../kit/molecules/MessageIcon.svelte'
  import { getDesktopContext } from '../../desktop/context'

  /** `reason` is the ACP stop reason (`refusal`, `max_tokens`, `max_turn_requests`...). */
  let { reason }: { reason: string } = $props()

  /** The desktop, when the notice is on one (a story has none and shows no link). */
  const desktop = (() => {
    try {
      return getDesktopContext().desktop
    } catch {
      return null
    }
  })()
</script>

<div class="stop-notice" role="status" data-testid="chat-stop-notice" data-reason={reason}>
  <MessageIcon kind="warning" size={20} />
  <span class="text">
    {stopNoticeText(reason)}
    {#if reason === 'cancelled'}
      <span data-testid="chat-stop-notice-program">To end the agent program, use Task Manager, Processes.</span>
      {#if desktop}<LinkLabel data-testid="chat-stop-notice-taskmgr" text="Open Task Manager" onclick={() => void desktop.openTaskManager('processes')} />{/if}
    {/if}
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
  .text {
    padding-top: 2px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    user-select: text;
  }
</style>

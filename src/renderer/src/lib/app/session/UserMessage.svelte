<script lang="ts">
  import Button from '../../kit/atoms/Button.svelte'
  import type { SendState } from './chatProblem'
  import { AUTOMATIC_SENDER, RESUMED_NOTE, isContinueMessage } from './resumeNote'

  interface Props {
    text: string
    /** File names attached to the message. */
    attachments?: string[]
    /** `not-sent`: the agent never got it; `stopped`: the agent started on it and then stopped. */
    state?: SendState
    /** "Send again" (only for a message that is not sent). */
    onresend?: () => void
    /** "Edit": puts the text back in the message box. */
    onedit?: () => void
  }

  let { text, attachments = [], state = 'sent', onresend, onedit }: Props = $props()

  /** The message Resume sends to a chat whose step Pause stopped: marked as a resume, not as something the user typed. */
  const resumed = $derived(isContinueMessage(text))
</script>

<div class="user-message" class:failed={state !== 'sent'} class:automatic={resumed} data-testid="chat-message-user" data-send-state={state}>
  <div class="who" data-testid="chat-message-sender">{resumed ? AUTOMATIC_SENDER : 'You'}</div>
  {#if resumed}<div class="resumed" role="status" data-testid="chat-resume-note">{RESUMED_NOTE}</div>{/if}
  {#if text}<div class="body" data-message-body>{text}</div>{/if}
  {#if attachments.length > 0}
    <div class="files">
      {#each attachments as name, i (i)}<span class="file">{name}</span>{/each}
    </div>
  {/if}
  {#if state === 'not-sent'}
    <div class="notice" role="status">
      <span class="label" data-testid="chat-message-not-sent">Not sent</span>
      <Button data-testid="chat-message-send-again" onclick={() => onresend?.()}>Send again</Button>
      <Button data-testid="chat-message-edit" onclick={() => onedit?.()}>Edit</Button>
    </div>
  {:else if state === 'stopped'}
    <div class="notice" role="status"><span class="label stopped" data-testid="chat-message-stopped">Stopped</span></div>
  {/if}
</div>

<style>
  .who {
    font-weight: 700;
    color: var(--w7-accent-user, #1b3f8b);
    margin-bottom: 2px;
  }
  .automatic .who,
  .automatic .body {
    color: var(--w7-text-muted, #555);
  }
  .resumed {
    margin-bottom: 2px;
    color: #4a3b00;
    font-weight: 700;
  }
  .body {
    font-size: 13px;
    line-height: 1.45;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .failed .body {
    color: #444;
  }
  .files {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }
  .file {
    padding: 0 6px;
    border: 1px solid var(--w7-hot-border);
    background: var(--w7-hot-face);
    color: var(--w7-text-muted);
    line-height: 17px;
  }
  .notice {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
  }
  .label {
    font-weight: 700;
    color: #b00020;
  }
  .label.stopped {
    color: #555;
  }
  .notice :global(.w7-btn) {
    min-width: 0;
    padding: 0 10px;
  }
</style>

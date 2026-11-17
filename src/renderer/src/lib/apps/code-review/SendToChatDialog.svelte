<script lang="ts">
  /** Where review comments go to be fixed: an existing chat of this desktop, or a new chat on the same drive. */
  import type { SessionDto } from '@shared/models'
  import Icon from '../../kit/atoms/Icon.svelte'
  import Button from '../../kit/atoms/Button.svelte'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import { NEW_CHAT_FOR_COMMENTS, chatChoiceLabel } from './reviewModel'

  export type SendTarget = { kind: 'chat'; sessionId: number } | { kind: 'new' }

  interface Props {
    /** The chats (role `chat`) of the desktop, newest first. */
    chats: readonly SessionDto[]
    /** How many comments are sent. */
    count: number
    /** Where a new chat would work (the review's folder). */
    cwd: string
    /** The project a path belongs to, for a chat that has no title yet. */
    projectName?: (cwd: string) => string | null
    busy?: boolean
    onsend: (target: SendTarget) => void
    oncancel: () => void
  }

  let { chats, count, cwd, projectName = () => null, busy = false, onsend, oncancel }: Props = $props()

  let chosen = $state<string | null>(null)
  const choice = $derived(chosen ?? (chats[0] ? `chat:${chats[0].id}` : 'new'))
  const target = $derived<SendTarget>(choice === 'new' ? { kind: 'new' } : { kind: 'chat', sessionId: Number(choice.slice(5)) })
</script>

<Dialog testid="review-send-dialog" title="Send to chat" iconName="session" width="440px" contained bodyColor="window" onclose={oncancel}>
  <div class="body">
    <p>Send {count} {count === 1 ? 'comment' : 'comments'} to a chat to fix. The chat gets a message with each file, line, severity and text{count === 1 ? '' : ', and the verdict'}.</p>
    <ul role="radiogroup" aria-label="Chat">
      {#each chats as chat (chat.id)}
        <li>
          <button type="button" class="option" role="radio" aria-checked={choice === `chat:${chat.id}`} class:on={choice === `chat:${chat.id}`} data-testid="review-send-chat" data-session-id={chat.id} onclick={() => (chosen = `chat:${chat.id}`)}>
            <Icon name="session" size={24} />
            <span class="text"><span class="title" data-testid="review-send-chat-name">{chatChoiceLabel(chat, projectName(chat.cwd))}</span></span>
          </button>
        </li>
      {/each}
      <li>
        <button type="button" class="option" role="radio" aria-checked={choice === 'new'} class:on={choice === 'new'} data-testid="review-send-new-chat" onclick={() => (chosen = 'new')}>
          <Icon name="new" size={24} />
          <span class="text"><span class="title">{NEW_CHAT_FOR_COMMENTS}</span><span class="sub">The agent works in {cwd}</span></span>
        </button>
      </li>
    </ul>
  </div>
  {#snippet buttons()}
    <Button data-testid="review-send-confirm" isDefault disabled={busy} onclick={() => onsend(target)}>Send</Button>
    <Button data-testid="review-send-cancel" onclick={oncancel}>Cancel</Button>
  {/snippet}
</Dialog>

<style>
  .body {
    padding: 12px 16px 8px;
    background: var(--xp-window);
  }
  p {
    margin: 0 0 8px;
    color: #1e3287;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 240px;
    overflow: auto;
  }
  .option {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 8px;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: default;
  }
  .option:hover,
  .option:focus-visible {
    border-color: var(--xp-hot-border);
    background: var(--xp-hot-face);
    outline: 0;
  }
  .option.on {
    border-color: var(--xp-select-border, #316ac5);
    background: var(--xp-select-face, #d6dff7);
  }
  .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .title {
    color: #0b3b9c;
  }
  .sub {
    color: var(--xp-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>

<script lang="ts">
  /**
   * The collapsed chat: a tab at the edge of the window with a chat icon and the word Chat, so it reads as the way in (UX-153).
   * It pulses while the chat has news. One piece for the strip of an app window and for the strip of a chat panel.
   */
  import Icon from '../../kit/atoms/Icon.svelte'

  interface Props {
    /** Opens the chat. */
    onopen: () => void
    /** Test id of the button. */
    testid: string
    /** The chat has something new since it was closed. */
    news?: boolean
    title?: string
  }

  let { onopen, testid, news = false, title = 'Open the chat (Ctrl+Shift+C)' }: Props = $props()
</script>

<button type="button" class="tab" class:news data-testid={testid} data-news={news} aria-label={news ? 'Open the chat. It has news.' : 'Open the chat'} {title} onclick={onopen}>
  <Icon name="session" size={16} />
  <span class="text">Chat</span>
</button>

<style>
  .tab {
    flex: none;
    width: 44px;
    min-width: 44px;
    padding: 8px 0 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 4px;
    background: linear-gradient(90deg, #f9fbfd, #e4ecf6);
    border: 0;
    border-left: 1px solid #9aa9bf;
    border-radius: 0;
    color: var(--w7-text);
    cursor: default;
  }
  .text {
    font-weight: 700;
  }
  .tab:hover {
    background: var(--w7-btn-hover-face);
  }
  .tab:focus-visible {
    outline: var(--w7-focus-outline);
    outline-offset: -2px;
  }
  .news {
    animation: news 1.2s ease-in-out infinite alternate;
  }
  @keyframes news {
    from {
      background: linear-gradient(90deg, #f9fbfd, #e4ecf6);
    }
    to {
      background: linear-gradient(90deg, #fff4c8, #ffe28a);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .news {
      animation: none;
      background: linear-gradient(90deg, #fff4c8, #ffe28a);
    }
  }
</style>

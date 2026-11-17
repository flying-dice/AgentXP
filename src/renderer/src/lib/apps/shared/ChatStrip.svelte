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
    /** The word on the tab. A window that knows what the chat is for says it (the Code window: Ask about this file, UX-210). */
    label?: string
  }

  let { onopen, testid, news = false, title = 'Chat', label = 'Chat' }: Props = $props()
</script>

<button type="button" class="tab" class:news data-testid={testid} data-news={news} aria-label={news ? `Open the chat: ${label}. It has news.` : `Open the chat: ${label}`} {title} onclick={onopen}>
  <Icon name="session" size={16} />
  <span class="text">{label}</span>
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
    color: var(--xp-text);
    cursor: default;
  }
  .text {
    max-width: 100%;
    padding: 0 2px;
    font-weight: 700;
    font-size: 11px;
    line-height: 1.15;
    text-align: center;
    overflow-wrap: anywhere;
  }
  .tab:hover {
    background: var(--xp-btn-hover-face);
  }
  .tab:focus-visible {
    outline: var(--xp-focus-outline);
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

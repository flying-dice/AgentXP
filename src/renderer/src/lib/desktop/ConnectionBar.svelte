<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    /** The desktop's title (the "computer name" of the connection). */
    title: string
    /** Shown after the title in the middle of the bar (the agent's state). */
    children?: Snippet
    /** Pinned: the bar below stays open; unpinned it folds away until the pointer is over the bar. */
    pinned?: boolean
    /** The OS window is maximised (the button then offers Restore Down). */
    maximized?: boolean
    onminimize?: () => void
    onmaximize?: () => void
    /** Disconnect: closes the window; the agents keep running. */
    ondisconnect?: () => void
  }

  let { title, children, pinned = $bindable(true), maximized = false, onminimize, onmaximize, ondisconnect }: Props = $props()
</script>

<div class="connbar" data-testid="connbar" data-pinned={pinned} role="toolbar" aria-label="Desktop connection">
  <button
    type="button"
    class="pin"
    class:on={pinned}
    data-testid="connbar-pin"
    aria-pressed={pinned}
    aria-label={pinned ? 'Unpin the connection bar' : 'Pin the connection bar'}
    title={pinned ? 'Unpin: the bar folds away when the pointer leaves it' : 'Pin: keep the bar open'}
    onclick={() => (pinned = !pinned)}
  >
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      {#if pinned}
        <path d="M8.5 1.5l4 4-1.6.7-2.2 2.2.2 2.1-1 1-2.6-2.6-3.6 3.6-.9-.9 3.6-3.6-2.6-2.6 1-1 2.1.2 2.2-2.2z" fill="#fff" stroke="#233a5c" stroke-width=".9" stroke-linejoin="round" />
      {:else}
        <path d="M1.5 5.5l4-4 .7 1.6 2.2 2.2 2.1-.2 1 1-2.6 2.6 3.6 3.6-.9.9-3.6-3.6-2.6 2.6-1-1 .2-2.1-2.2-2.2z" fill="#fff" stroke="#233a5c" stroke-width=".9" stroke-linejoin="round" />
      {/if}
    </svg>
  </button>
  <span class="name"><strong data-testid="connbar-title" title={title}>{title}</strong>{@render children?.()}</span>
  <span class="buttons">
    <button type="button" class="cb" data-testid="connbar-minimize" aria-label="Minimize the desktop" title="Minimize the desktop" onclick={() => onminimize?.()}>
      <svg width="10" height="8" viewBox="0 0 10 8" aria-hidden="true"><rect x="1" y="5" width="8" height="2.2" fill="#fff" stroke="#3a4f6e" stroke-width=".8" /></svg>
    </button>
    <button type="button" class="cb" data-testid="connbar-maximize" aria-label={maximized ? 'Restore the desktop' : 'Maximize the desktop'} title={maximized ? 'Restore the desktop' : 'Maximize the desktop'} onclick={() => onmaximize?.()}>
      {#if maximized}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <g fill="none" stroke="#3a4f6e" stroke-width="1.4"><rect x="3.2" y="1" width="5.8" height="5" /><rect x="1" y="3.6" width="5.8" height="5.4" fill="#c3d4ea" /></g>
        </svg>
      {:else}
        <svg width="10" height="9" viewBox="0 0 10 9" aria-hidden="true">
          <rect x="1" y="1" width="8" height="7" fill="none" stroke="#3a4f6e" stroke-width="1.6" />
          <rect x="1" y="1" width="8" height="2" fill="#fff" stroke="#3a4f6e" stroke-width=".6" />
        </svg>
      {/if}
    </button>
    <button
      type="button"
      class="cb close"
      data-testid="connbar-close"
      aria-label="Disconnect"
      title="Disconnect. Agents keep running."
      onclick={() => ondisconnect?.()}
    >
      <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden="true">
        <g stroke="#5a1710" stroke-width="3.4" stroke-linecap="square"><line x1="2" y1="1.5" x2="10" y2="8.5" /><line x1="10" y1="1.5" x2="2" y2="8.5" /></g>
        <g stroke="#fff" stroke-width="2" stroke-linecap="square"><line x1="2" y1="1.5" x2="10" y2="8.5" /><line x1="10" y1="1.5" x2="2" y2="8.5" /></g>
      </svg>
    </button>
  </span>
</div>

<style>
  .connbar {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 21px;
    margin: 0 -8px 2px;
    padding: 0 0 0 5px;
    border-bottom: 1px solid var(--w7-caption-border);
    background: linear-gradient(#a9c4e8, #7ea3d4 48%, #6a92c8 52%, #8db0dc);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45);
    color: #000;
    text-shadow: 0 0 6px rgba(255, 255, 255, 0.9);
  }
  .pin {
    flex: none;
    width: 18px;
    height: 17px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: default;
  }
  .pin:hover,
  .pin:focus-visible {
    outline: none;
    border-color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.3);
  }
  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .name strong {
    flex: none;
    max-width: 40%;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 600;
  }
  .buttons {
    flex: none;
    display: inline-flex;
    align-self: flex-start;
    height: 19px;
    border: 1px solid var(--w7-caption-border);
    border-top: 0;
    border-right: 0;
    border-radius: 0 0 0 5px;
    overflow: hidden;
  }
  .cb {
    width: 29px;
    height: 19px;
    padding: 0;
    border: 0;
    border-right: 1px solid var(--w7-caption-border);
    background: var(--w7-caption-face);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: default;
  }
  .cb.close {
    width: 47px;
    border-right: 0;
    background: var(--w7-caption-close-face);
  }
  .cb:hover {
    background: var(--w7-caption-hover-face);
  }
  .cb.close:hover {
    background: var(--w7-caption-close-hover-face);
  }
  .cb:active {
    filter: brightness(0.82);
  }
  .cb:focus-visible {
    outline: var(--w7-focus-outline);
    outline-offset: -3px;
  }
</style>

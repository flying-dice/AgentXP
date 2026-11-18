<script lang="ts">
  /**
   * A WinXP notification-area balloon: pale yellow, rounded, with a tail pointing down at the tray. A notice about an
   * agent shows the agent's colour swatch beside the title (the name is in the text, never colour alone), a button (two
   * for a show request: Show and Not now), and "2 more" when other balloons wait their turn.
   */
  import Button from '../atoms/Button.svelte'
  import Icon from '../atoms/Icon.svelte'
  import type { IconName } from '../atoms/icons'

  interface Props {
    title: string
    text: string
    icon?: IconName
    /** The agent the balloon is about: its colour swatch (with its name as the tooltip). */
    identity?: { name: string; color: string } | null
    onclose?: () => void
    /** The pointer entered (true) or left (false) the balloon: it stays while the pointer is on it. */
    onhold?: (held: boolean) => void
    /** A button under the text (for example "Open Task Manager", "Open review"). */
    action?: { label: string; onclick: () => void }
    /** A second button beside it ("Not now" of a show request). */
    secondary?: { label: string; onclick: () => void }
    /** "2 more": other balloons wait behind this one. */
    more?: string | null
    /** Announce the balloon to screen readers when it appears (off when the page announced it already). */
    live?: boolean
    /** Distance of the tail from the right edge of the balloon, in px. */
    tail?: number
  }

  let { title, text, icon = 'info', identity = null, onclose, onhold, action, secondary, more = null, live = true, tail = 44 }: Props = $props()
</script>

<div
  class="balloon"
  data-testid="balloon"
  data-agent={identity?.name}
  role={live ? 'status' : 'group'}
  aria-label={live ? undefined : title}
  style:--tail="{tail}px"
  onpointerenter={() => onhold?.(true)}
  onpointerleave={() => onhold?.(false)}
>
  <div class="head">
    {#if identity}
      <span class="swatch" data-testid="balloon-agent" title={identity.name} style:background={identity.color} aria-hidden="true"></span>
    {:else}
      <Icon name={icon} size={16} />
    {/if}
    <b data-testid="balloon-title">{title}</b>
    <button type="button" class="x" data-testid="balloon-close" aria-label="Close" onclick={onclose}>&times;</button>
  </div>
  <p data-testid="balloon-text">{text}</p>
  {#if action || more}
    <div class="foot">
      {#if action}<Button data-testid="balloon-action" onclick={action.onclick}>{action.label}</Button>{/if}
      {#if secondary}<Button data-testid="balloon-secondary" onclick={secondary.onclick}>{secondary.label}</Button>{/if}
      {#if more}<span class="more" data-testid="balloon-more">{more}</span>{/if}
    </div>
  {/if}
</div>

<style>
  .balloon {
    position: relative;
    width: 232px;
    box-sizing: border-box;
    padding: 8px 10px 10px;
    border: 1px solid var(--xp-balloon-border);
    border-radius: 6px;
    background: var(--xp-balloon-face);
    box-shadow: 2px 3px 6px rgba(0, 0, 0, 0.35);
    color: #000;
    font: var(--xp-font);
  }
  .balloon::before,
  .balloon::after {
    content: '';
    position: absolute;
    right: var(--tail);
    border-style: solid;
    border-color: transparent;
  }
  .balloon::before {
    bottom: -12px;
    border-width: 11px 6px 0 6px;
    border-top-color: var(--xp-balloon-border);
  }
  .balloon::after {
    bottom: -10px;
    border-width: 10px 5px 0 5px;
    border-top-color: var(--xp-balloon-tail);
    margin-right: 1px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .swatch {
    flex: none;
    width: 12px;
    height: 12px;
    margin: 0 2px;
    border: 1px solid #404040;
    box-shadow: inset 1px 1px 0 rgba(255, 255, 255, 0.45);
  }
  b {
    flex: 1;
    min-width: 0;
  }
  .x {
    width: 16px;
    height: 16px;
    padding: 0;
    border: 0;
    background: transparent;
    font: 16px/14px 'Segoe UI', sans-serif;
    color: #555;
    cursor: default;
  }
  .x:hover {
    color: #000;
  }
  .foot {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px 0 0 22px;
  }
  .more {
    margin-left: auto;
    color: var(--xp-text-muted);
  }
  p {
    margin: 6px 0 0 22px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
</style>

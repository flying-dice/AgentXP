<script lang="ts">
  /**
   * The note callout of a show (`docs/AGENT_PRESENCE.md`, section 5): an XP balloon tooltip beside the target, its tail
   * pointing at it. The agent's swatch and name, what it shows and why, **OK** (done) and **Reply** (that chat's composer
   * with the note quoted). Placed by `placeCallout`, so it stays on screen near an edge and in a small window.
   */
  import Button from '../kit/atoms/Button.svelte'
  import type { CalloutPlacement } from './showResolvers'

  interface Props {
    name: string
    color: string
    label: string
    note: string
    showId: string
    placement: CalloutPlacement
    /** Measured by the overlay before it is placed. */
    element?: HTMLDivElement | null
    onok: () => void
    onreply: () => void
  }

  let { name, color, label, note, showId, placement, element = $bindable(null), onok, onreply }: Props = $props()
</script>

<div
  class="callout {placement.side}"
  bind:this={element}
  data-testid="show-callout"
  data-agent={name}
  data-show-id={showId}
  data-side={placement.side}
  role="dialog"
  aria-label="{name} shows you {label}"
  style:left="{placement.x}px"
  style:top="{placement.y}px"
  style:--tail="{placement.tail}px"
  tabindex="-1"
  onkeydown={(e) => e.key === 'Escape' && onok()}
>
  <div class="head">
    <span class="swatch" data-testid="show-callout-agent" title={name} style:background={color} aria-hidden="true"></span>
    <b>{name}</b>
    <span class="label" data-testid="show-callout-label" title={label}>{label}</span>
  </div>
  <p data-testid="show-callout-note">{note}</p>
  <div class="foot">
    <Button data-testid="show-callout-ok" onclick={onok}>OK</Button>
    <Button data-testid="show-callout-reply" onclick={onreply}>Reply</Button>
  </div>
</div>

<style>
  .callout {
    position: absolute;
    width: 260px;
    box-sizing: border-box;
    padding: 7px 9px 9px;
    border: 1px solid var(--xp-balloon-border);
    border-radius: 6px;
    background: var(--xp-balloon-face);
    box-shadow: 2px 3px 6px rgba(0, 0, 0, 0.35);
    color: #000;
    font: var(--xp-font);
    pointer-events: auto;
  }
  /* The tail: a bordered triangle on the side that faces the target. */
  .callout::before,
  .callout::after {
    content: '';
    position: absolute;
    border-style: solid;
    border-color: transparent;
  }
  .right::before {
    left: -12px;
    top: calc(var(--tail) - 6px);
    border-width: 6px 12px 6px 0;
    border-right-color: var(--xp-balloon-border);
  }
  .right::after {
    left: -10px;
    top: calc(var(--tail) - 5px);
    border-width: 5px 10px 5px 0;
    border-right-color: var(--xp-balloon-tail);
  }
  .left::before {
    right: -12px;
    top: calc(var(--tail) - 6px);
    border-width: 6px 0 6px 12px;
    border-left-color: var(--xp-balloon-border);
  }
  .left::after {
    right: -10px;
    top: calc(var(--tail) - 5px);
    border-width: 5px 0 5px 10px;
    border-left-color: var(--xp-balloon-tail);
  }
  .below::before {
    top: -12px;
    left: calc(var(--tail) - 6px);
    border-width: 0 6px 12px 6px;
    border-bottom-color: var(--xp-balloon-border);
  }
  .below::after {
    top: -10px;
    left: calc(var(--tail) - 5px);
    border-width: 0 5px 10px 5px;
    border-bottom-color: #fffff0;
  }
  .above::before {
    bottom: -12px;
    left: calc(var(--tail) - 6px);
    border-width: 12px 6px 0 6px;
    border-top-color: var(--xp-balloon-border);
  }
  .above::after {
    bottom: -10px;
    left: calc(var(--tail) - 5px);
    border-width: 10px 5px 0 5px;
    border-top-color: var(--xp-balloon-tail);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .swatch {
    flex: none;
    width: 12px;
    height: 12px;
    border: 1px solid #404040;
    box-shadow: inset 1px 1px 0 rgba(255, 255, 255, 0.45);
  }
  b {
    flex: none;
  }
  .label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--xp-text-muted);
  }
  p {
    margin: 6px 0 0 18px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
  .foot {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 8px;
  }
</style>

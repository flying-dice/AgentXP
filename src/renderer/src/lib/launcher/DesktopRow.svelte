<script lang="ts">
  /** One desktop in the launcher list: thumbnail, title, state, drives and last use. */
  import type { DesktopSummaryDto } from '@shared/vfs'
  import { drivesLine, lastUsedText, stateLabel, stateTone } from './launcherModel'

  interface Props {
    desktop: DesktopSummaryDto
    selected?: boolean
    /** Clock for "last used" (stories pass a fixed one). */
    now?: Date
    onselect?: () => void
    onactivate?: () => void
  }

  let { desktop, selected = false, now, onselect, onactivate }: Props = $props()

  const tone = $derived(stateTone(desktop))
</script>

<div
  class="row"
  data-testid="launcher-desktop-row"
  class:selected
  role="option"
  tabindex="-1"
  aria-selected={selected}
  data-desktop-id={desktop.id}
  onclick={() => onselect?.()}
  ondblclick={() => onactivate?.()}
  onkeydown={(e) => e.key === 'Enter' && onactivate?.()}
>
  <div class="thumb">
    {#if desktop.thumbnailUrl}
      <img src={desktop.thumbnailUrl} alt="" width="96" height="60" draggable="false" />
    {:else}
      <span class="blank"></span>
    {/if}
  </div>
  <div class="text">
    <div class="title">
      <span class="name" data-testid="launcher-desktop-name">{desktop.title}</span>
      {#if desktop.connected}<span class="chip" data-testid="launcher-desktop-connected">Connected</span>{/if}
    </div>
    <div class="state {tone}" data-testid="launcher-desktop-state"><i class="dot" aria-hidden="true"></i>{stateLabel(desktop)}</div>
    <div class="meta">{drivesLine(desktop.drives)}</div>
    <div class="meta">Last used {lastUsedText(desktop.lastUsedAt, now)}</div>
  </div>
</div>

<style>
  .row {
    display: flex;
    gap: 10px;
    padding: 5px 6px;
    border: 1px solid transparent;
    cursor: default;
    outline: 0;
  }
  .row:hover {
    border-color: var(--w7-hot-border);
    background: var(--w7-hot-face);
  }
  .row.selected {
    border-color: var(--w7-select-border);
    background: var(--w7-select-face);
  }
  .thumb {
    flex: none;
    width: 98px;
    height: 62px;
    border: 1px solid #5d6c82;
    background: #1e5aa8;
    box-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  }
  .thumb img,
  .blank {
    display: block;
    width: 96px;
    height: 60px;
    object-fit: cover;
  }
  .text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1px;
  }
  .title {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .name {
    font-size: 13px;
    font-weight: 600;
    color: #1e3287;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chip {
    flex: none;
    padding: 0 5px;
    border: 1px solid #9cc1e8;
    border-radius: 2px;
    background: linear-gradient(#f6fbff, #dcebfa);
    color: #1f4f8a;
    font-size: 11px;
  }
  .state {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.35);
    background: #9a9a9a;
  }
  .running .dot {
    background: radial-gradient(circle at 35% 30%, #9cf59c, #1fa71f);
  }
  .approval .dot {
    background: radial-gradient(circle at 35% 30%, #ffe08a, #e89a0c);
  }
  .error .dot {
    background: radial-gradient(circle at 35% 30%, #ff9a8a, #c91d0f);
  }
  .approval {
    color: #8a5200;
  }
  .error {
    color: #a01408;
  }
  .meta {
    color: var(--w7-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>

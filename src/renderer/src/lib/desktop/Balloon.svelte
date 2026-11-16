<script lang="ts">
  /** A Win7 notification-area balloon: pale yellow, rounded, with a tail pointing down at the tray. */
  import Icon from '../kit/atoms/Icon.svelte'
  import type { IconName } from '../kit/atoms/icons'

  interface Props {
    title: string
    text: string
    icon?: IconName
    onclose?: () => void
    /** Distance of the tail from the right edge of the balloon, in px. */
    tail?: number
  }

  let { title, text, icon = 'info', onclose, tail = 44 }: Props = $props()
</script>

<div class="balloon" role="status" style:--tail="{tail}px">
  <div class="head">
    <Icon name={icon} size={16} />
    <b>{title}</b>
    <button type="button" class="x" aria-label="Close" onclick={onclose}>&times;</button>
  </div>
  <p>{text}</p>
</div>

<style>
  .balloon {
    position: relative;
    width: 232px;
    box-sizing: border-box;
    padding: 8px 10px 10px;
    border: 1px solid #696969;
    border-radius: 6px;
    background: linear-gradient(#fffff0, #ffffe1);
    box-shadow: 2px 3px 6px rgba(0, 0, 0, 0.35);
    color: #000;
    font: var(--w7-font);
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
    border-top-color: #696969;
  }
  .balloon::after {
    bottom: -10px;
    border-width: 10px 5px 0 5px;
    border-top-color: #ffffe1;
    margin-right: 1px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 6px;
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
  p {
    margin: 6px 0 0 22px;
    line-height: 1.35;
  }
</style>

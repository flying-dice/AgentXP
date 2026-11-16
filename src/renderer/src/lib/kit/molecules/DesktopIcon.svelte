<script lang="ts">
  import Icon from '../atoms/Icon.svelte'
  import type { IconName } from './../atoms/icons'

  interface Props {
    label: string
    /** Tooltip: what the icon opens. */
    title?: string
    /** `data-testid` of the icon button. */
    testid?: string
    icon: IconName
    selected?: boolean
    onselect?: () => void
    /** Double click or Enter. */
    onopen?: () => void
    oncontextmenu?: (event: MouseEvent) => void
  }

  let { label, title, icon, testid = 'desktop-icon', selected = false, onselect, onopen, oncontextmenu }: Props = $props()
</script>

<button
  type="button"
  data-testid={testid}
  class="w7-desktop-icon"
  class:selected
  data-desktop-icon
  {title}
  aria-pressed={selected}
  onclick={() => onselect?.()}
  ondblclick={() => onopen?.()}
  onfocus={() => onselect?.()}
  onkeydown={(e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onopen?.()
    }
  }}
  {oncontextmenu}
>
  <span class="art"><Icon name={icon} size={36} /></span>
  <span class="label">{label}</span>
</button>

<style>
  .w7-desktop-icon {
    width: 86px;
    box-sizing: border-box;
    padding: 4px 2px 3px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    color: #fff;
    font: var(--w7-font);
    text-align: center;
    text-shadow: 0 0 4px #000, 0 1px 2px #000;
    cursor: default;
  }
  .art {
    display: flex;
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
  }
  .label {
    max-width: 100%;
    overflow-wrap: anywhere;
    line-height: 1.2;
  }
  .w7-desktop-icon:hover {
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.16);
  }
  .w7-desktop-icon.selected,
  .w7-desktop-icon:focus-visible {
    border-color: rgba(255, 255, 255, 0.7);
    background: rgba(120, 175, 235, 0.42);
  }
  /* The dotted focus rectangle stays visible on the blue desktop (white on blue, over 3:1). */
  .w7-desktop-icon:focus-visible {
    outline: 2px dotted #fff;
    outline-offset: -2px;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
  }
</style>

<script lang="ts">
  import Icon from '../atoms/Icon.svelte'
  import type { IconName } from '../atoms/icons'

  interface Props {
    title: string
    icon?: IconName
    selected?: boolean
    disabled?: boolean
    id?: string
    /** Id of the tab panel this header controls. */
    controls?: string
    testid?: string
    /** Tooltip of the header. */
    tooltip?: string
    onclick?: () => void
    onkeydown?: (event: KeyboardEvent) => void
  }

  let { title, icon, selected = false, disabled = false, id, controls, testid, tooltip, onclick, onkeydown }: Props = $props()
</script>

<button
  {id}
  data-testid={testid}
  title={tooltip}
  type="button"
  class="tab"
  class:selected
  role="tab"
  aria-selected={selected}
  aria-controls={controls}
  tabindex={selected ? 0 : -1}
  {disabled}
  {onclick}
  {onkeydown}
>
  {#if icon}<Icon name={icon} />{/if}
  <span>{title}</span>
</button>

<style>
  .tab {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    margin: 1px -1px 0 0;
    padding: 0 12px;
    border: 1px solid var(--w7-panel-border);
    border-bottom: 0;
    border-radius: 3px 3px 0 0;
    background: linear-gradient(#f6f6f6, #e4e4e4);
    color: var(--w7-text);
    cursor: default;
    outline: none;
  }
  .tab:hover:not(.selected):not(:disabled) {
    background: linear-gradient(#f2fafe, #d4ecfa);
    border-color: #7eb4ea;
  }
  .tab.selected {
    height: 27px;
    margin-top: -2px;
    margin-bottom: -1px;
    border-top: 2px solid var(--w7-tab-accent);
    background: var(--w7-window);
    z-index: 2;
  }
  .tab:focus-visible > span {
    outline: var(--w7-focus-outline);
    outline-offset: 1px;
  }
  .tab:disabled {
    color: var(--w7-text-disabled);
  }
</style>

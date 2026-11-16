<script lang="ts">
  import Icon from '../atoms/Icon.svelte'
  import Separator from '../atoms/Separator.svelte'
  import { parseMnemonic, type MenuItemDef } from './MenuItem'

  interface Props {
    item: MenuItemDef
    /** Highlighted (mouse hover or keyboard). */
    hot?: boolean
    /** Underline the mnemonic letter. */
    showMnemonic?: boolean
    /** Submenu of this item is open. */
    expanded?: boolean
    id?: string
    onclick?: (event: MouseEvent) => void
    onpointerenter?: (event: PointerEvent) => void
  }

  let { item, hot = false, showMnemonic = false, expanded = false, id, onclick, onpointerenter }: Props = $props()

  const parts = $derived(parseMnemonic(item.label))
  const hasSub = $derived(!!item.items?.length)
  const role = $derived(item.radio ? 'menuitemradio' : item.checked !== undefined ? 'menuitemcheckbox' : 'menuitem')
</script>

{#if item.separator}
  <Separator variant="menu" />
{:else}
  <div
    {id}
    data-testid={item.testid ?? (item.id ? `menu-item-${item.id}` : undefined)}
    class="mi"
    title={item.title}
    class:hot
    class:disabled={item.disabled}
    {role}
    tabindex="-1"
    aria-disabled={item.disabled || undefined}
    aria-checked={role === 'menuitem' ? undefined : !!item.checked}
    aria-haspopup={hasSub ? 'menu' : undefined}
    aria-expanded={hasSub ? expanded : undefined}
    {onclick}
    {onpointerenter}
  >
    <span class="icon">
      {#if item.checked}
        <span class="mark" class:radio={item.radio}>
          {#if item.radio}
            <span class="dot"></span>
          {:else}
            <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true"><path d="M1 4.2l2.4 2.6L8 1.4" fill="none" stroke="#2b4a73" stroke-width="1.8" /></svg>
          {/if}
        </span>
      {:else if item.icon}
        <Icon name={item.icon} />
      {/if}
    </span>
    <span class="text"
      >{parts.before}{#if parts.key}<span class:mn={showMnemonic}>{parts.key}</span>{/if}{parts.after}</span
    >
    {#if item.shortcut}<span class="shortcut">{item.shortcut}</span>{/if}
    <span class="arrow">
      {#if hasSub}<svg width="4" height="7" viewBox="0 0 4 7" aria-hidden="true"><path d="M0 0l4 3.5L0 7z" fill="currentColor" /></svg>{/if}
    </span>
  </div>
{/if}

<style>
  .mi {
    display: flex;
    align-items: center;
    height: 24px;
    padding: 0 0 0 0;
    border: 1px solid transparent;
    border-radius: 2px;
    color: var(--w7-text);
    white-space: nowrap;
    cursor: default;
    outline: none;
  }
  .mi.hot:not(.disabled) {
    border-color: var(--w7-menu-hot-border);
    background: var(--w7-menu-hot-face);
  }
  .mi.disabled {
    color: var(--w7-text-disabled);
  }
  .mi.disabled :global(.w7-icon) {
    opacity: 0.45;
  }
  .icon {
    flex: none;
    width: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .mark {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--w7-menu-hot-border);
    border-radius: 2px;
    background: linear-gradient(#f4fafe, #dff0fa);
  }
  .mark.radio {
    border-radius: 2px;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #2b4a73;
  }
  .text {
    flex: 1;
    padding: 0 28px 0 5px;
  }
  .mn {
    text-decoration: underline;
  }
  .shortcut {
    flex: none;
    padding-right: 6px;
    color: #444;
  }
  .disabled .shortcut {
    color: var(--w7-text-disabled);
  }
  .arrow {
    flex: none;
    width: 16px;
    display: flex;
    justify-content: center;
    color: #404040;
  }
</style>

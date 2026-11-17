<script lang="ts">
  import { tick } from 'svelte'
  import { clickOutside } from '../actions/clickOutside'
  import type { ComboItem } from './ComboBox'
  import { positionPopup, type PopupPosition } from '../actions/popup'

  interface Props {
    items: ComboItem[]
    value?: string
    /** DropDownList: pick only. DropDown: editable text plus list. */
    dropDownStyle?: 'DropDownList' | 'DropDown'
    placeholder?: string
    disabled?: boolean
    maxDropDownItems?: number
    class?: string
    style?: string
    /** `data-testid` of the control. */
    testid?: string
    onchange?: (value: string) => void
    'aria-label'?: string
  }

  let {
    items,
    value = $bindable(''),
    dropDownStyle = 'DropDownList',
    placeholder = '',
    disabled = false,
    maxDropDownItems = 8,
    class: className = '',
    style,
    testid,
    onchange,
    'aria-label': ariaLabel
  }: Props = $props()

  const uid = $props.id()
  const ITEM_HEIGHT = 17
  const editable = $derived(dropDownStyle === 'DropDown')

  let root = $state<HTMLElement | null>(null)
  let listEl = $state<HTMLElement | null>(null)
  let open = $state(false)
  let highlighted = $state(-1)
  let position = $state<PopupPosition | null>(null)
  let typed = $state<string | null>(null)

  const selectedIndex = $derived(items.findIndex((i) => i.value === value))
  const selectedLabel = $derived(items[selectedIndex]?.label ?? (editable ? value : ''))
  const text = $derived(typed ?? selectedLabel)
  const listHeight = $derived(Math.min(items.length, maxDropDownItems) * ITEM_HEIGHT + 2)

  const enabled = (i: number): boolean => i >= 0 && i < items.length && !items[i].disabled

  function move(from: number, step: 1 | -1): number {
    for (let i = from + step; i >= 0 && i < items.length; i += step) if (enabled(i)) return i
    return from
  }

  async function show(): Promise<void> {
    if (disabled || open || !root) return
    position = positionPopup(root.getBoundingClientRect(), listHeight)
    highlighted = enabled(selectedIndex) ? selectedIndex : move(-1, 1)
    open = true
    await tick()
    listEl?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }

  function hide(): void {
    open = false
  }

  function commit(i: number): void {
    if (!enabled(i)) return
    typed = null
    hide()
    if (items[i].value === value) return
    value = items[i].value
    onchange?.(value)
  }

  function highlight(i: number): void {
    highlighted = i
    tick().then(() => listEl?.querySelector('[data-hot="true"]')?.scrollIntoView({ block: 'nearest' }))
  }

  function onInput(event: Event & { currentTarget: HTMLInputElement }): void {
    typed = event.currentTarget.value
    const match = items.find((i) => i.label === typed)
    value = match ? match.value : typed
    onchange?.(value)
  }

  let searchBuffer = ''
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  function typeahead(key: string): void {
    clearTimeout(searchTimer)
    searchBuffer += key.toLowerCase()
    searchTimer = setTimeout(() => (searchBuffer = ''), 700)
    const start = open ? highlighted : selectedIndex
    const order = items.map((_, k) => (start + (searchBuffer.length > 1 ? 0 : 1) + k) % items.length)
    const hit = order.find((i) => enabled(i) && items[i].label.toLowerCase().startsWith(searchBuffer))
    if (hit === undefined) return
    if (open) highlight(hit)
    else commit(hit)
  }

  function onKeydown(event: KeyboardEvent): void {
    if (disabled) return
    const current = open ? highlighted : selectedIndex
    switch (event.key) {
      case 'ArrowDown':
        if (event.altKey) void show()
        else if (open) highlight(move(current, 1))
        else if (editable) void show()
        else commit(move(selectedIndex, 1))
        break
      case 'ArrowUp':
        if (!open && !editable) commit(move(selectedIndex, -1))
        else if (open) highlight(move(current, -1))
        else void show()
        break
      case 'Home':
        if (editable) return
        open ? highlight(move(-1, 1)) : commit(move(-1, 1))
        break
      case 'End':
        if (editable) return
        open ? highlight(move(items.length, -1)) : commit(move(items.length, -1))
        break
      case 'Enter':
        if (!open) return
        commit(highlighted)
        break
      case ' ':
        if (editable) return
        open ? commit(highlighted) : void show()
        break
      case 'Escape':
        if (!open) return
        hide()
        break
      case 'Tab':
        hide()
        return
      default:
        if (!editable && event.key.length === 1 && !event.ctrlKey && !event.altKey) {
          typeahead(event.key)
          break
        }
        return
    }
    event.preventDefault()
  }

  function toggle(): void {
    if (open) hide()
    else void show()
  }
</script>

<svelte:window onresize={hide} />

<div
  bind:this={root}
  data-testid={testid}
  class="xp-combo {className}"
  class:open
  class:disabled
  class:editable
  {style}
  use:clickOutside={{ handler: hide }}
>
  {#if editable}
    <input
      class="field"
      type="text"
      role="combobox"
      aria-label={ariaLabel}
      aria-expanded={open}
      aria-controls="{uid}-list"
      aria-autocomplete="none"
      aria-activedescendant={open && highlighted >= 0 ? `${uid}-opt-${highlighted}` : undefined}
      {placeholder}
      {disabled}
      value={text}
      oninput={onInput}
      onkeydown={onKeydown}
    />
    <button type="button" class="arrow" tabindex="-1" aria-label="Show list" {disabled} onclick={toggle}>
      <svg width="7" height="4" viewBox="0 0 7 4" aria-hidden="true"><path d="M0 0h7L3.5 4z" fill="currentColor" /></svg>
    </button>
  {:else}
    <div
      class="field face"
      role="combobox"
      tabindex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls="{uid}-list"
      aria-disabled={disabled || undefined}
      aria-activedescendant={open && highlighted >= 0 ? `${uid}-opt-${highlighted}` : undefined}
      onclick={toggle}
      onkeydown={onKeydown}
    >
      <span class="label">{text || placeholder}</span>
      <span class="arrow" aria-hidden="true">
        <svg width="7" height="4" viewBox="0 0 7 4"><path d="M0 0h7L3.5 4z" fill="currentColor" /></svg>
      </span>
    </div>
  {/if}

  {#if open && position}
    <div
      bind:this={listEl}
      id="{uid}-list"
      class="popup"
      role="listbox"
      style:left="{position.left}px"
      style:top="{position.top}px"
      style:min-width="{position.minWidth}px"
      style:max-height="{Math.min(position.maxHeight, listHeight)}px"
    >
      {#each items as item, i (item.value)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          id="{uid}-opt-{i}"
          data-testid={testid ? `${testid}-option-${item.value}` : undefined}
          class="option"
          role="option"
          tabindex="-1"
          aria-selected={i === selectedIndex}
          aria-disabled={item.disabled || undefined}
          data-hot={i === highlighted}
          class:hot={i === highlighted}
          class:off={item.disabled}
          onpointerenter={() => enabled(i) && (highlighted = i)}
          onclick={() => commit(i)}
        >
          {item.label}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .xp-combo {
    position: relative;
    display: inline-flex;
    align-items: stretch;
    height: 21px;
    width: 160px;
    color: var(--xp-text);
  }
  .field {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    font: inherit;
    outline: none;
    cursor: default;
  }

  /* DropDownList: a gradient "button" face with an arrow */
  .face {
    border: 1px solid #7a7a7a;
    border-radius: 2px;
    background: linear-gradient(#fff, #ececec 49%, #d6d0c5 50%, #d6d0c5);
    padding: 0 0 0 3px;
  }
  .face .label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    padding: 0 1px;
  }
  .face .arrow {
    flex: none;
    width: 17px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #404040;
  }
  .face:hover,
  .open .face {
    border-color: var(--xp-btn-hover-border);
    background: var(--xp-btn-hover-face);
  }
  .open .face {
    border-color: var(--xp-btn-active-border);
    background: var(--xp-btn-active-face);
  }
  .xp-combo:not(.open) .face:focus-visible .label {
    background: #316ac5;
    color: #fff;
  }

  /* DropDown: textbox + arrow button */
  .editable {
    border: 1px solid var(--xp-input-border);
    border-top-color: var(--xp-input-border-top);
    background: var(--xp-window);
  }
  .editable:hover:not(.disabled) {
    border-color: #3d7bad;
  }
  .editable:focus-within {
    border-color: #569de5;
  }
  .editable input.field {
    border: 0;
    padding: 0 3px;
    background: transparent;
    color: inherit;
    cursor: text;
    user-select: text;
  }
  .editable button.arrow {
    flex: none;
    width: 17px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-left: 1px solid #8e9097;
    background: linear-gradient(#fff, #ececec 49%, #d6d0c5 50%, #d6d0c5);
    color: #404040;
    cursor: default;
  }
  .editable button.arrow:hover:not(:disabled),
  .editable.open button.arrow {
    background: var(--xp-btn-hover-face);
  }

  .disabled .face,
  .disabled.editable {
    border-color: var(--xp-border-disabled);
    background: #f4f2e8;
    color: var(--xp-text-disabled);
  }
  .disabled .arrow {
    color: #b0b0b0;
  }

  .popup {
    position: fixed;
    z-index: 1000;
    overflow-y: auto;
    padding: 0;
    background: #fff;
    border: 1px solid #646464;
    box-shadow: var(--xp-shadow-popup);
  }
  .option {
    height: 17px;
    line-height: 17px;
    padding: 0 3px;
    white-space: nowrap;
    cursor: default;
  }
  .option.hot {
    background: #316ac5;
    color: #fff;
  }
  .option.off {
    color: var(--xp-text-disabled);
  }
  .option.off.hot {
    background: transparent;
    color: var(--xp-text-disabled);
  }
</style>

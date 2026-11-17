<script lang="ts">
  type T = string | number
  import type { Snippet } from 'svelte'
  import { applySelection, nextEnabled, type ListBoxItem, type SelectionMode } from './ListBox'

  type Props = {
    items: ListBoxItem<T>[]
    selectionMode?: SelectionMode
    /** Selected values (all modes). */
    selected?: T[]
    /** Convenience for single selection. */
    value?: T | undefined
    disabled?: boolean
    width?: number | string
    height?: number | string
    label?: string
    /** Optional content rendered before the label (used by CheckedListBox). */
    prefix?: Snippet<[ListBoxItem<T>]>
    onselectionchange?: (selected: T[]) => void
    /** Fired on Space or double click on an item. */
    onitemactivate?: (item: ListBoxItem<T>) => void
    class?: string
    /** `data-testid` of the list. */
    testid?: string
  }

  let {
    items,
    selectionMode = 'One',
    selected = $bindable([]),
    value = $bindable(undefined),
    disabled = false,
    width = 180,
    height = 120,
    label = 'List',
    prefix,
    onselectionchange,
    onitemactivate,
    class: className = '',
    testid,
    ...rest
  }: Props = $props()

  const uid = $props.id()
  let active = $state(-1)
  let anchor = -1
  let focused = $state(false)
  let box: HTMLDivElement | undefined = $state()

  const dim = (v: number | string) => (typeof v === 'number' ? `${v}px` : v)

  function commit(next: T[]): void {
    selected = next
    value = next[0]
    onselectionchange?.(next)
  }

  function pick(index: number, mods: { ctrl: boolean; shift: boolean }): void {
    if (items[index]?.disabled) return
    active = index
    if (!mods.shift) anchor = index
    commit(applySelection(selectionMode, items, selected, anchor, index, mods))
    scrollIntoView(index)
  }

  function scrollIntoView(index: number): void {
    box?.querySelector<HTMLElement>(`#${CSS.escape(`${uid}-${index}`)}`)?.scrollIntoView({ block: 'nearest' })
  }

  function move(index: number, e: KeyboardEvent): void {
    if (index === active) return
    if (selectionMode === 'MultiSimple' || (selectionMode === 'MultiExtended' && e.ctrlKey && !e.shiftKey)) {
      active = index
      scrollIntoView(index)
    } else {
      pick(index, { ctrl: false, shift: e.shiftKey && selectionMode === 'MultiExtended' })
    }
  }

  function onkeydown(e: KeyboardEvent): void {
    if (disabled || items.length === 0) return
    const start = active < 0 ? (e.key === 'ArrowUp' || e.key === 'End' ? items.length : -1) : active
    switch (e.key) {
      case 'ArrowDown': move(nextEnabled(items, start, 1), e); break
      case 'ArrowUp': move(nextEnabled(items, start, -1), e); break
      case 'Home': move(nextEnabled(items, -1, 1), e); break
      case 'End': move(nextEnabled(items, items.length, -1), e); break
      case 'PageDown': move(Math.min(items.length - 1, Math.max(active, 0) + 8), e); break
      case 'PageUp': move(Math.max(0, Math.max(active, 0) - 8), e); break
      case ' ':
        if (active >= 0) {
          if (selectionMode !== 'One') pick(active, { ctrl: selectionMode === 'MultiExtended', shift: false })
          onitemactivate?.(items[active])
        }
        break
      case 'a':
        if (e.ctrlKey && selectionMode === 'MultiExtended') commit(items.filter((i) => !i.disabled).map((i) => i.value))
        else return
        break
      default: return
    }
    e.preventDefault()
  }

  function onfocus(): void {
    focused = true
    if (active < 0 && items.length) active = Math.max(0, items.findIndex((i) => selected.includes(i.value)))
  }
</script>

<div
  bind:this={box}
  {...rest}
  data-testid={testid}
  role="listbox"
  tabindex={disabled ? -1 : 0}
  aria-label={label}
  aria-multiselectable={selectionMode !== 'One'}
  aria-disabled={disabled}
  aria-activedescendant={active >= 0 ? `${uid}-${active}` : undefined}
  class="xp-listbox xp-scroll {className}"
  class:disabled
  class:focused
  style="width:{dim(width)};height:{dim(height)}"
  {onkeydown}
  {onfocus}
  onblur={() => (focused = false)}
>
  {#each items as item, i (item.value)}
    {@const isSel = selected.includes(item.value)}
    <div
      id="{uid}-{i}"
      role="option"
      data-testid={item.testid}
      title={item.title}
      tabindex="-1"
      aria-selected={isSel}
      aria-disabled={item.disabled}
      class="item"
      class:selected={isSel}
      class:active={focused && i === active}
      class:off={item.disabled}
      onpointerdown={(e) => !disabled && pick(i, { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey })}
      ondblclick={() => !disabled && !item.disabled && onitemactivate?.(item)}
    >
      {#if prefix}{@render prefix(item)}{/if}
      <span class="text">{item.label}</span>
    </div>
  {/each}
</div>

<style>
  .xp-listbox {
    display: block;
    box-sizing: border-box;
    padding: 1px 0;
    background: var(--xp-window);
    border: 1px solid var(--xp-list-border);
    font: var(--xp-font);
    color: var(--xp-text);
    outline: none;
    overflow-x: hidden;
  }
  .xp-listbox.disabled {
    background: var(--xp-face);
    color: var(--xp-text-disabled);
    border-color: var(--xp-border-disabled);
  }
  .item {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 17px;
    padding: 0 3px;
    white-space: nowrap;
    border: 1px solid transparent;
    box-sizing: border-box;
  }
  .text {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .item.off {
    color: var(--xp-text-disabled);
  }
  /* Selected, list not focused: classic inactive grey highlight. */
  .item.selected {
    background: #d9d9d9;
  }
  .focused .item.selected {
    background: var(--xp-list-select-face);
    color: var(--xp-list-select-text);
  }
  .item.active {
    outline: var(--xp-focus-outline);
    outline-offset: -1px;
  }
  .focused .item.selected.active {
    outline-color: #fff;
  }
</style>

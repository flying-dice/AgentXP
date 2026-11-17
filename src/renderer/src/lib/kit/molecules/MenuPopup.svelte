<script lang="ts">
  import { tick } from 'svelte'
  import MenuItem from './MenuItem.svelte'
  import MenuPopup from './MenuPopup.svelte'
  import { isSelectable, mnemonicKey, type MenuItemDef } from './MenuItem'
  import { nudgeUp, placeBeside } from '../actions/popup'

  interface Props {
    items: MenuItemDef[]
    /** Underline mnemonic letters (Alt held). */
    showMnemonics?: boolean
    /** Nested popup: opens to the right of its parent item, Left/Esc closes only this level. */
    submenu?: boolean
    /** Focus the popup when mounted (keyboard navigation starts here). */
    autofocus?: boolean
    /** Select the first item when mounted. */
    activateFirst?: boolean
    label?: string
    class?: string
    style?: string
    /** A leaf item was chosen (bubbles from submenus). */
    onselect: (item: MenuItemDef) => void
    /** Esc, or Left in a submenu. */
    onclose?: () => void
    /** Left/Right pressed where this popup cannot handle it (switch menu in a MenuStrip). */
    onnavigate?: (direction: 'left' | 'right') => void
    element?: HTMLElement | null
    /**
     * Cap the height (px): a taller menu scrolls. Its submenus are then placed with fixed coordinates
     * beside their item, so the scrolling box does not clip them.
     */
    maxHeight?: number
    /** Fixed placement beside this item rect (a submenu of a scrolling menu). */
    anchor?: DOMRect
  }

  let {
    items,
    showMnemonics = false,
    submenu = false,
    autofocus = false,
    activateFirst = false,
    label,
    class: className = '',
    style,
    onselect,
    onclose,
    onnavigate,
    element = $bindable(null),
    maxHeight,
    anchor
  }: Props = $props()

  const uid = $props.id()
  let active = $state(-1)
  let openSub = $state(-1)
  let flipped = $state(false)
  /** Upward shift (px, ≤ 0) that keeps a submenu above the bottom of the screen. */
  let shift = $state(0)
  let subFocus = $state(false)
  /** Item rect of the open submenu, when this menu scrolls (see `maxHeight`). */
  let subAnchor = $state<DOMRect | undefined>(undefined)
  /** Fixed coordinates when placed beside `anchor`. */
  let fixedAt = $state<{ left: number; top: number } | null>(null)
  let hoverTimer: ReturnType<typeof setTimeout> | undefined

  const hasSub = (i: number): boolean => !!items[i]?.items?.length

  function step(from: number, dir: 1 | -1): number {
    const n = items.length
    for (let k = 1; k <= n; k++) {
      const i = (((from + dir * k) % n) + n) % n
      if (isSelectable(items[i])) return i
    }
    return from
  }

  function openSubmenu(i: number, focus: boolean): void {
    if (!hasSub(i) || items[i].disabled) return
    active = i
    subAnchor = maxHeight !== undefined ? element?.querySelectorAll<HTMLElement>(':scope > .slot')[i]?.getBoundingClientRect() : undefined
    openSub = i
    subFocus = focus
  }

  function activate(i: number): void {
    const item = items[i]
    if (!item || !isSelectable(item)) return
    if (hasSub(i)) openSubmenu(i, true)
    else onselect(item)
  }

  function hover(i: number): void {
    if (!isSelectable(items[i])) return
    active = i
    clearTimeout(hoverTimer)
    if (openSub !== i) {
      openSub = -1
      if (hasSub(i)) hoverTimer = setTimeout(() => openSubmenu(i, false), 150)
    }
  }

  function closeSub(): void {
    openSub = -1
    subFocus = false
    element?.focus()
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) return
    switch (event.key) {
      case 'ArrowDown':
        active = step(active, 1)
        break
      case 'ArrowUp':
        active = step(active < 0 ? 0 : active, -1)
        break
      case 'Home':
        active = step(-1, 1)
        break
      case 'End':
        active = step(items.length, -1)
        break
      case 'ArrowRight':
        if (active >= 0 && hasSub(active)) openSubmenu(active, true)
        else onnavigate?.('right')
        break
      case 'ArrowLeft':
        if (submenu) onclose?.()
        else onnavigate?.('left')
        break
      case 'Enter':
      case ' ':
        activate(active)
        break
      case 'Escape':
        onclose?.()
        break
      default: {
        if (event.altKey || event.key.length !== 1) return
        const matches = items.map((_, i) => i).filter((i) => isSelectable(items[i]) && mnemonicKey(items[i].label) === event.key.toLowerCase())
        if (matches.length === 0) return
        active = matches[(matches.indexOf(active) + 1) % matches.length]
        if (matches.length === 1) activate(active)
      }
    }
    event.preventDefault()
    event.stopPropagation()
  }

  function flipIfClipped(node: HTMLElement | null): void {
    if (!node) return
    if (anchor) {
      fixedAt = placeBeside(anchor, node.getBoundingClientRect())
      return
    }
    if (!submenu) return
    const r = node.getBoundingClientRect()
    flipped = r.right > window.innerWidth
    shift = nudgeUp(r)
  }

  $effect(() => {
    if (activateFirst && active < 0) active = step(-1, 1)
  })

  $effect(() => {
    flipIfClipped(element)
    if (!autofocus) return
    tick().then(() => element?.focus({ preventScroll: true }))
  })

  $effect(() => () => clearTimeout(hoverTimer))

  /**
   * One style attribute: the caller's `style` (a MenuStrip/drop-down/context menu passes its fixed left/top there)
   * plus this popup's own placement. Not `style:left`/`style:top` directives: when they are undefined Svelte
   * removes those properties, wiping the caller's coordinates and leaving the menu at its static position.
   */
  const popupStyle = $derived(
    [
      style,
      shift ? `translate: 0 ${shift}px` : '',
      maxHeight !== undefined ? `max-height: ${maxHeight}px` : '',
      fixedAt ? `left: ${fixedAt.left}px; top: ${fixedAt.top}px` : ''
    ]
      .filter(Boolean)
      .join('; ') || undefined
  )
</script>

<div
  bind:this={element}
  class="menu {className}"
  class:flipped
  class:submenu
  class:fixed={!!anchor}
  class:scrolls={maxHeight !== undefined}
  role="menu"
  tabindex="-1"
  aria-label={label}
  aria-activedescendant={active >= 0 ? `${uid}-${active}` : undefined}
  style={popupStyle}
  onscroll={() => {
    if (openSub >= 0) openSub = -1
  }}
  {onkeydown}
  onpointerleave={() => {
    if (openSub < 0) active = -1
  }}
>
  {#each items as item, i (i)}
    <div class="slot">
      <MenuItem
        id="{uid}-{i}"
        {item}
        hot={active === i}
        expanded={openSub === i}
        showMnemonic={showMnemonics}
        onpointerenter={() => hover(i)}
        onclick={() => activate(i)}
      />
      {#if openSub === i && item.items}
        <MenuPopup
          submenu
          anchor={subAnchor}
          items={item.items}
          {showMnemonics}
          autofocus={subFocus}
          activateFirst={subFocus}
          label={item.label}
          {onselect}
          onclose={closeSub}
          {onnavigate}
        />
      {/if}
    </div>
  {/each}
</div>

<style>
  .menu {
    position: relative;
    min-width: 150px;
    width: max-content;
    padding: 2px;
    background: var(--xp-menu-face);
    border: 1px solid var(--xp-menu-border);
    box-shadow: var(--xp-shadow-popup);
    outline: none;
    cursor: default;
    z-index: 100;
  }
  .menu.submenu {
    position: absolute;
    left: calc(100% - 3px);
    top: -3px;
  }
  .menu.submenu.flipped {
    left: auto;
    right: calc(100% - 3px);
  }
  .menu.submenu.fixed {
    position: fixed;
    right: auto;
  }
  .menu.scrolls {
    overflow-y: auto;
    overflow-x: hidden;
  }
  .slot {
    position: relative;
  }
  /* The icon column divider of WinXP menus. */
  .menu::before {
    content: '';
    position: absolute;
    top: 2px;
    bottom: 2px;
    left: 28px;
    width: 2px;
    background: linear-gradient(90deg, #e2e3e3 50%, #fff 50%);
    pointer-events: none;
  }
</style>

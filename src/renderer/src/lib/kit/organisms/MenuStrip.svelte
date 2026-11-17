<script lang="ts">
  import { clickOutside } from '../actions/clickOutside'
  import { keepPlaced, placePopup } from '../actions/popup'
  import { rovingFocus } from '../actions/rovingFocus'
  import MenuPopup from '../molecules/MenuPopup.svelte'
  import { mnemonicKey, parseMnemonic, type MenuDef, type MenuItemDef } from '../molecules/MenuItem'

  interface Props {
    menus: MenuDef[]
    /** A leaf item was chosen (its own `action` runs first). */
    onselect?: (item: MenuItemDef) => void
    class?: string
    'aria-label'?: string
  }

  let { menus, onselect, class: className = '', 'aria-label': ariaLabel = 'Menu bar' }: Props = $props()

  let root = $state<HTMLElement | null>(null)
  let openIndex = $state(-1)
  let focusIndex = $state(0)
  /** Alt pressed or menu driven by keyboard: mnemonic letters are underlined. */
  let keyboardMode = $state(false)
  let openByKeyboard = $state(false)
  let pos = $state({ left: 0, top: 0 })
  let popup = $state<HTMLElement | null>(null)
  let anchor = $state<DOMRect | null>(null)
  /** `File` / `&File` -> `file`: the test id stem of a menu bar button (`menubar-file`) and its menu (`menubar-file-menu`). */
  const menuSlug = (label: string): string => {
    const p = parseMnemonic(label)
    return (p.before + p.key + p.after).toLowerCase().replace(/\s+/g, '-')
  }
  let altPending = false
  let restoreTo: HTMLElement | null = null

  const buttons = (): HTMLElement[] => [...(root?.querySelectorAll<HTMLElement>('.mb') ?? [])]
  const within = (el: Element | null): boolean => !!el && !!root?.contains(el)

  function openMenu(i: number, byKeyboard: boolean): void {
    const button = buttons()[i]
    if (!button) return
    if (openIndex < 0 && !within(document.activeElement)) restoreTo = document.activeElement as HTMLElement | null
    const rect = button.getBoundingClientRect()
    pos = { left: rect.left, top: rect.bottom - 1 }
    focusIndex = i
    openByKeyboard = byKeyboard
    anchor = rect
    openIndex = i
  }

  // Below the menu bar button (above it only when there is no room below), kept there as the menu lays out.
  $effect(() => {
    if (!popup || !anchor || openIndex < 0) return
    const r = anchor
    return keepPlaced(popup, (size) => (pos = placePopup(r, size)))
  })

  function closeMenu(refocus: 'button' | 'restore' | 'none'): void {
    const was = openIndex
    openIndex = -1
    if (refocus === 'button') buttons()[was]?.focus()
    else {
      keyboardMode = false
      if (refocus === 'restore') restoreTo?.focus?.()
    }
  }

  function select(item: MenuItemDef): void {
    item.action?.()
    onselect?.(item)
    closeMenu('restore')
  }

  function navigate(direction: 'left' | 'right'): void {
    const n = menus.length
    openMenu((openIndex + (direction === 'right' ? 1 : -1) + n) % n, true)
  }

  function onButtonKeydown(event: KeyboardEvent, i: number): void {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      keyboardMode = true
      openMenu(i, true)
      event.preventDefault()
    } else if (event.key === 'Escape') {
      keyboardMode = false
      restoreTo?.focus?.()
      ;(document.activeElement as HTMLElement | null)?.blur()
    }
  }

  function onWindowKeydown(event: KeyboardEvent): void {
    if (event.key === 'Alt') {
      if (!event.repeat) altPending = true
      keyboardMode = true
      return
    }
    altPending = false
    if (event.altKey && !event.ctrlKey && event.key.length === 1) {
      const i = menus.findIndex((m) => mnemonicKey(m.label) === event.key.toLowerCase())
      if (i >= 0) {
        keyboardMode = true
        openMenu(i, true)
        event.preventDefault()
      }
    }
  }

  function onWindowKeyup(event: KeyboardEvent): void {
    if (event.key !== 'Alt') return
    const active = openIndex >= 0 || within(document.activeElement)
    if (altPending && !active) {
      restoreTo = document.activeElement as HTMLElement | null
      buttons()[focusIndex]?.focus()
    } else if (altPending && active) {
      closeMenu('restore')
      ;(document.activeElement as HTMLElement | null)?.blur()
    } else if (!active) keyboardMode = false
    altPending = false
  }

  function onFocusout(event: FocusEvent): void {
    if (openIndex < 0 && !within(event.relatedTarget as Element | null)) keyboardMode = false
  }
</script>

<svelte:window onkeydown={onWindowKeydown} onkeyup={onWindowKeyup} />

<div
  bind:this={root}
  class="xp-menustrip {className}"
  data-testid="menubar"
  role="menubar"
  aria-label={ariaLabel}
  tabindex="-1"
  onfocusout={onFocusout}
  use:rovingFocus={{ selector: '.mb' }}
  use:clickOutside={{ handler: () => openIndex >= 0 && closeMenu('none') }}
>
  {#each menus as menu, i (i)}
    {@const parts = parseMnemonic(menu.label)}
    <button
      type="button"
      class="mb"
      data-testid="menubar-{menuSlug(menu.label)}"
      class:open={openIndex === i}
      role="menuitem"
      tabindex={focusIndex === i ? 0 : -1}
      aria-haspopup="menu"
      aria-expanded={openIndex === i}
      onfocus={() => (focusIndex = i)}
      onpointerdown={() => (keyboardMode = false)}
      onclick={() => (openIndex === i ? closeMenu('restore') : openMenu(i, false))}
      onpointerenter={() => openIndex >= 0 && openIndex !== i && openMenu(i, false)}
      onkeydown={(e) => onButtonKeydown(e, i)}
      >{parts.before}{#if parts.key}<span class:mn={keyboardMode}>{parts.key}</span>{/if}{parts.after}</button
    >
  {/each}
  {#if openIndex >= 0}
    {#key openIndex}
      <MenuPopup
        bind:element={popup}
        layer
        testid="menubar-{menuSlug(menus[openIndex].label)}-menu"
        items={menus[openIndex].items}
        label={menus[openIndex].label.replace('&', '')}
        showMnemonics={keyboardMode}
        autofocus
        activateFirst={openByKeyboard}
        style="position:fixed;left:{pos.left}px;top:{pos.top}px"
        onselect={select}
        onclose={() => closeMenu('button')}
        onnavigate={navigate}
      />
    {/key}
  {/if}
</div>

<style>
  /* A narrow window wraps its menu bar onto a second row, as a Win32 menu bar does, instead of clipping the last menus. */
  .xp-menustrip {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    min-height: 24px;
    min-width: 0;
    padding: 0 2px;
    background: var(--xp-menubar-face);
    border-bottom: 1px solid #b4bfcf;
    outline: none;
  }
  .mb {
    flex: none;
    height: 24px;
    min-width: 24px;
    padding: 0 8px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--xp-text);
    cursor: default;
    outline: none;
  }
  .mb:hover,
  .mb:focus-visible,
  .mb.open {
    border-color: var(--xp-menubar-hot-border);
    background: var(--xp-menubar-hot-face);
  }
  .mb.open {
    border-bottom-color: transparent;
    background: var(--xp-menu-face);
    border-color: var(--xp-menu-border);
    border-bottom-color: var(--xp-menu-face);
    position: relative;
    z-index: 101;
  }
  .mn {
    text-decoration: underline;
  }
</style>

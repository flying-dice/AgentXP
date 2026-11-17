<script lang="ts">
  import { clickOutside } from '../actions/clickOutside'
  import { keepPlaced, placePopup } from '../actions/popup'
  import type { IconName } from '../atoms/icons'
  import type { MenuItemDef } from './MenuItem'
  import MenuPopup from './MenuPopup.svelte'
  import ToolStripButton from './ToolStripButton.svelte'

  interface Props {
    icon?: IconName
    text?: string
    items: MenuItemDef[]
    disabled?: boolean
    onselect?: (item: MenuItemDef) => void
    title?: string
    testid?: string
  }

  let { icon, text, items, disabled = false, onselect, title, testid }: Props = $props()

  let open = $state(false)
  let button = $state<HTMLButtonElement | null>(null)
  let pos = $state({ left: 0, top: 0 })
  let byKeyboard = $state(false)
  let popup = $state<HTMLElement | null>(null)
  let anchor = $state<DOMRect | null>(null)

  function show(keyboard: boolean): void {
    if (!button || disabled) return
    const r = button.getBoundingClientRect()
    pos = { left: r.left, top: r.bottom - 1 }
    byKeyboard = keyboard
    anchor = r
    open = true
  }

  // Once rendered (before paint), and whenever it resizes: below the button, above it when cramped, on screen.
  $effect(() => {
    if (!popup || !anchor) return
    const r = anchor
    return keepPlaced(popup, (size) => (pos = placePopup(r, size)))
  })

  function close(refocus: boolean): void {
    open = false
    if (refocus) button?.focus()
  }

  function select(item: MenuItemDef): void {
    item.action?.()
    onselect?.(item)
    close(true)
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' && !open) {
      show(true)
      event.preventDefault()
    }
  }
</script>

<span class="wrap" use:clickOutside={{ handler: () => (open = false) }}>
  <ToolStripButton
    bind:ref={button}
    {icon}
    {text}
    {disabled}
    {title}
    data-testid={testid}
    expanded={open}
    aria-haspopup="menu"
    aria-expanded={open}
    onclick={() => (open ? close(false) : show(false))}
    {onkeydown}
  >
  </ToolStripButton>
  <svg class="arrow" width="7" height="4" viewBox="0 0 7 4" aria-hidden="true"><path d="M0 0h7L3.5 4z" fill="#404040" /></svg>
  {#if open}
    <MenuPopup
      bind:element={popup}
      {items}
      label={text ?? title}
      autofocus
      activateFirst={byKeyboard}
      style="position:fixed;left:{pos.left}px;top:{pos.top}px"
      onselect={select}
      onclose={() => close(true)}
    />
  {/if}
</span>

<style>
  .wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
  }
  .arrow {
    position: absolute;
    right: 6px;
    top: 12px;
    pointer-events: none;
  }
  .wrap :global(.tb) {
    padding-right: 18px;
  }
</style>

<script lang="ts">
  import { clickOutside } from '../actions/clickOutside'
  import { keepPlaced, workArea } from '../actions/popup'
  import MenuPopup from '../molecules/MenuPopup.svelte'
  import type { MenuItemDef } from '../molecules/MenuItem'

  interface Props {
    items: MenuItemDef[]
    open?: boolean
    /** Viewport coordinates of the popup's top-left corner. */
    x?: number
    y?: number
    onselect?: (item: MenuItemDef) => void
    onclose?: () => void
    label?: string
  }

  let { items, open = $bindable(false), x = 0, y = 0, onselect, onclose, label = 'Context menu' }: Props = $props()

  let element = $state<HTMLElement | null>(null)
  let left = $state(0)
  let top = $state(0)
  let restoreTo: HTMLElement | null = null

  function close(): void {
    if (!open) return
    open = false
    restoreTo?.focus?.()
    onclose?.()
  }

  function select(item: MenuItemDef): void {
    item.action?.()
    onselect?.(item)
    close()
  }

  $effect(() => {
    if (!open) return
    restoreTo = document.activeElement as HTMLElement | null
    left = x
    top = y
  })

  // At the pointer, slid back inside the work area (window minus taskbar) once its size is known.
  $effect(() => {
    if (!open || !element) return
    const px = x
    const py = y
    return keepPlaced(element, (size) => {
      const area = workArea()
      left = Math.max(0, Math.min(px, area.width - size.width - 2))
      top = Math.max(0, Math.min(py, area.height - size.height - 2))
    })
  })
</script>

{#if open}
  <div class="cms" use:clickOutside={{ handler: close }}>
    <MenuPopup
      bind:element
      layer
      {items}
      {label}
      autofocus
      style="position:fixed;left:{left}px;top:{top}px"
      onselect={select}
      onclose={close}
    />
  </div>
{/if}

<style>
  .cms {
    display: contents;
  }
</style>

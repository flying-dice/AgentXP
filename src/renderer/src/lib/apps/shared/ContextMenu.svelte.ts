/**
 * The right-click menu of an app: state for the kit `ContextMenuStrip` plus the opening gestures.
 *
 *   const ctx = new ContextMenu()
 *   <div oncontextmenu={(e) => ctx.show(e, items())} onkeydown={(e) => ctx.key(e, items)}>
 *   <ContextMenuStrip bind:open={ctx.open} x={ctx.x} y={ctx.y} items={ctx.items} label="Notepad" />
 *
 * Right-click, the Menu key and Shift+F10 open it; the strip handles the arrow keys, Enter and Esc. The innermost
 * handler wins (`show` stops the event), so a row menu beats the app menu behind it.
 */
import type { MenuItemDef } from '../../kit/molecules/MenuItem'

/** True for the keys that open a context menu: Menu (ContextMenu) and Shift+F10. */
export const isContextMenuKey = (event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'ctrlKey' | 'altKey'>): boolean =>
  event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey && !event.ctrlKey && !event.altKey)

export class ContextMenu {
  open = $state(false)
  x = $state(0)
  y = $state(0)
  items = $state.raw<MenuItemDef[]>([])

  /** Opens at the pointer; the browser's own menu never shows. */
  show(event: MouseEvent, items: MenuItemDef[]): void {
    event.preventDefault()
    event.stopPropagation()
    this.showAt(event.clientX, event.clientY, items)
  }

  showAt(x: number, y: number, items: MenuItemDef[]): void {
    if (items.length === 0) return
    this.items = items
    this.x = x
    this.y = y
    this.open = true
  }

  /** Menu key or Shift+F10: opens at the top-left of the focused element (or the target). */
  key(event: KeyboardEvent, items: MenuItemDef[] | (() => MenuItemDef[])): void {
    if (!isContextMenuKey(event)) return
    event.preventDefault()
    event.stopPropagation()
    const box = (event.target instanceof Element ? event.target : (event.currentTarget as Element)).getBoundingClientRect()
    this.showAt(box.left + Math.min(24, box.width / 2), box.top + Math.min(24, box.height / 2), typeof items === 'function' ? items() : items)
  }
}

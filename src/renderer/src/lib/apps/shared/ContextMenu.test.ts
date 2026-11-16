import { describe, expect, it } from 'vitest'
import { ContextMenu, isContextMenuKey } from './ContextMenu.svelte'

describe('isContextMenuKey', () => {
  it('accepts the Menu key and Shift+F10 only', () => {
    const k = (key: string, shiftKey = false, ctrlKey = false, altKey = false) => isContextMenuKey({ key, shiftKey, ctrlKey, altKey })
    expect(k('ContextMenu')).toBe(true)
    expect(k('F10', true)).toBe(true)
    expect(k('F10')).toBe(false)
    expect(k('F10', true, true)).toBe(false)
    expect(k('a', true)).toBe(false)
  })
})

describe('ContextMenu', () => {
  it('opens at a point with items, and ignores an empty list', () => {
    const menu = new ContextMenu()
    menu.showAt(5, 6, [])
    expect(menu.open).toBe(false)
    menu.showAt(5, 6, [{ label: 'x' }])
    expect(menu).toMatchObject({ open: true, x: 5, y: 6 })
  })
})

import { describe, expect, it, vi } from 'vitest'
import { closeItems, editItems, helpMenu, menuBar } from './standardMenu'

describe('helpMenu', () => {
  it('has View Help F1, a separator and About <App>, with test ids', () => {
    const onhelp = vi.fn()
    const onabout = vi.fn()
    const menu = helpMenu({ app: 'notepad', name: 'Notepad', onhelp, onabout })
    expect(menu.label).toBe('&Help')
    expect(menu.items.map((i) => i.testid ?? (i.separator ? '-' : ''))).toEqual(['notepad-menu-help', '-', 'notepad-menu-about'])
    expect(menu.items[0]).toMatchObject({ label: '&View Help', shortcut: 'F1' })
    expect(menu.items[2].label).toBe('&About Notepad')
    menu.items[0].action?.()
    menu.items[2].action?.()
    expect(onhelp).toHaveBeenCalledOnce()
    expect(onabout).toHaveBeenCalledOnce()
  })
})

describe('closeItems', () => {
  it('is a separator and Close with Alt+F4', () => {
    const items = closeItems('code', () => {})
    expect(items[0].separator).toBe(true)
    expect(items[1]).toMatchObject({ testid: 'code-menu-close', shortcut: 'Alt+F4' })
  })
})

describe('editItems', () => {
  const ops = { undo: () => {}, cut: () => {}, copy: () => {}, paste: () => {}, delete: () => {}, selectAll: () => {} }

  it('orders Undo | Cut Copy Paste Delete | Select All', () => {
    const items = editItems('notepad-ctx', ops, { hasSelection: true })
    expect(items.map((i) => (i.separator ? '|' : i.testid))).toEqual(['notepad-ctx-undo', '|', 'notepad-ctx-cut', 'notepad-ctx-copy', 'notepad-ctx-paste', 'notepad-ctx-delete', '|', 'notepad-ctx-select-all'])
  })

  it('disables Cut, Copy and Delete without a selection, and everything that changes text when read only', () => {
    const none = editItems('x', ops)
    expect(none.filter((i) => i.disabled).map((i) => i.id)).toEqual(['x-cut', 'x-copy', 'x-delete'])
    const ro = editItems('x', ops, { hasSelection: true, readOnly: true })
    expect(ro.filter((i) => i.disabled).map((i) => i.id)).toEqual(['x-undo', 'x-cut', 'x-paste', 'x-delete'])
  })

  it('leaves out operations the app has no function for', () => {
    expect(editItems('x', { copy: () => {}, selectAll: () => {} }, { hasSelection: true }).map((i) => (i.separator ? '|' : i.id))).toEqual(['x-copy', '|', 'x-selectAll'])
  })
})

describe('menuBar', () => {
  it('drops empty menus and falsy entries', () => {
    const bar = menuBar([{ label: '&File', items: [] }, false, null, { label: '&Help', items: [{ label: 'x' }] }])
    expect(bar.map((m) => m.label)).toEqual(['&Help'])
  })
})

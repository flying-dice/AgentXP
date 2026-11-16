import type { MenuDef, MenuItemDef } from '../molecules/MenuItem'

/** Demo menus modelled on the main window of the design mockup. */
export function createAppMenus(): MenuDef[] {
  return [
    {
      label: '&File',
      items: [
        { label: '&New Session', icon: 'new', shortcut: 'Ctrl+N' },
        { label: '&Open Folder...', icon: 'open-folder', shortcut: 'Ctrl+O' },
        { label: '&Save Transcript', icon: 'save', shortcut: 'Ctrl+S' },
        { separator: true },
        {
          label: '&Recent',
          items: [{ label: 'claude-code-win' }, { label: 'dotfiles' }, { separator: true }, { label: '&Clear list', disabled: true }]
        },
        { separator: true },
        { label: 'E&xit', shortcut: 'Alt+F4' }
      ]
    },
    {
      label: '&Edit',
      items: [
        { label: '&Undo edit', icon: 'undo', shortcut: 'Ctrl+Z', disabled: true },
        { label: '&Redo', icon: 'redo', shortcut: 'Ctrl+Y', disabled: true },
        { separator: true },
        { label: 'Cu&t', icon: 'cut', shortcut: 'Ctrl+X' },
        { label: '&Copy', icon: 'copy', shortcut: 'Ctrl+C' },
        { label: '&Paste', icon: 'paste', shortcut: 'Ctrl+V' },
        { label: '&Delete', icon: 'delete', shortcut: 'Del' }
      ]
    },
    {
      label: '&View',
      items: [
        { label: '&Sessions pane', checked: true },
        { label: '&Changes pane', checked: true },
        { separator: true },
        { label: '&Details', radio: true, checked: true },
        { label: '&List', radio: true, checked: false },
        { label: 'Large &icons', radio: true, checked: false }
      ]
    },
    { label: 'S&ession', items: [{ label: '&Compact', icon: 'compact' }, { label: '&Stop', icon: 'stop', shortcut: 'Esc' }] },
    { label: '&Tools', items: [{ label: '&Options...', icon: 'options' }] },
    { label: '&Help', items: [{ label: '&Contents', icon: 'help', shortcut: 'F1' }, { separator: true }, { label: '&About Agent7', icon: 'info' }] }
  ]
}

/** Applies check/radio semantics for a chosen item (what a real form's handler would do). */
export function toggleMenuItem(groups: MenuItemDef[][], item: MenuItemDef): void {
  if (item.checked === undefined) return
  const siblings = groups.find((g) => g.includes(item)) ?? []
  if (!item.radio) {
    item.checked = !item.checked
    return
  }
  for (const s of siblings) if (s.radio) s.checked = s === item
}

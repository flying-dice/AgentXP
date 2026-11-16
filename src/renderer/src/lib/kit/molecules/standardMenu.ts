/**
 * The standard items of a classic Win7 menu bar, shared by every app (File > Close, Edit, Help). Each app builds its
 * own menus around them; the ids and test ids follow `<app>-menu-<action>` (docs/CONVENTIONS.md).
 */
import type { IconName } from '../atoms/icons'
import type { MenuDef, MenuItemDef } from './MenuItem'

export interface HelpMenuOptions {
  /** The app kind, the prefix of the test ids: `notepad-menu-help`, `notepad-menu-about`. */
  app: string
  /** The name shown in "About <name>". */
  name: string
  /** View Help (F1): opens the app's Help window. */
  onhelp: () => void
  /** About <name>: shows the app's about dialog. */
  onabout: () => void
}

/** `Help > View Help F1, separator, About <App>`: always the last menu of the bar. */
export function helpMenu({ app, name, onhelp, onabout }: HelpMenuOptions): MenuDef {
  return {
    label: '&Help',
    items: [
      { id: `${app}-help`, testid: `${app}-menu-help`, label: '&View Help', icon: 'help', shortcut: 'F1', action: onhelp },
      { separator: true },
      { id: `${app}-about`, testid: `${app}-menu-about`, label: `&About ${name}`, icon: 'info' as IconName, action: onabout }
    ]
  }
}

/** The end of a File menu: a separator and `Close` (Alt+F4 closes the window). */
export function closeItems(app: string, onclose: () => void): MenuItemDef[] {
  return [{ separator: true }, { id: `${app}-close`, testid: `${app}-menu-close`, label: '&Close', shortcut: 'Alt+F4', action: onclose }]
}

export interface EditOps {
  undo?: () => void
  cut?: () => void
  copy?: () => void
  paste?: () => void
  delete?: () => void
  selectAll?: () => void
}

export interface EditState {
  hasSelection?: boolean
  canUndo?: boolean
  readOnly?: boolean
}

/**
 * Edit menu items in the Win7 order: Undo | Cut, Copy, Paste, Delete | Select All. An item whose operation is not
 * given is left out (with its separator); `idPrefix` is `<app>-menu` for a menu bar or `<app>-ctx` for a context menu.
 */
export function editItems(idPrefix: string, ops: EditOps, state: EditState = {}): MenuItemDef[] {
  const { hasSelection = false, canUndo = true, readOnly = false } = state
  const item = (key: keyof EditOps, label: string, shortcut: string, disabled: boolean): MenuItemDef | null => {
    const action = ops[key]
    return action ? { id: `${idPrefix}-${key}`, testid: `${idPrefix}-${key === 'selectAll' ? 'select-all' : key}`, label, shortcut, disabled, action } : null
  }
  const groups = [
    [item('undo', '&Undo', 'Ctrl+Z', readOnly || !canUndo)],
    [item('cut', 'Cu&t', 'Ctrl+X', readOnly || !hasSelection), item('copy', '&Copy', 'Ctrl+C', !hasSelection), item('paste', '&Paste', 'Ctrl+V', readOnly), item('delete', 'De&lete', 'Del', readOnly || !hasSelection)],
    [item('selectAll', 'Select &All', 'Ctrl+A', false)]
  ].map((g) => g.filter((i): i is MenuItemDef => i !== null)).filter((g) => g.length > 0)
  return groups.flatMap((g, i) => (i === 0 ? g : [{ separator: true } as MenuItemDef, ...g]))
}

/** Drops empty menus, so a bar lists only the menus that have real items; Help (last) stays. */
export const menuBar = (menus: (MenuDef | null | false)[]): MenuDef[] => menus.filter((m): m is MenuDef => !!m && m.items.length > 0)

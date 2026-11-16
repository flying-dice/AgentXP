import type { IconName } from '../atoms/icons'

/** Data definition of a menu entry (MenuStrip, ContextMenuStrip, drop-down buttons). */
export interface MenuItemDef {
  id?: string
  /** `data-testid` of the rendered item; defaults to `menu-item-<id>` when the item has an id. */
  testid?: string
  /** Text. A `&` marks the mnemonic letter (`&File`); `&&` is a literal ampersand. */
  label?: string
  icon?: IconName
  /** Shortcut text shown right-aligned, e.g. `Ctrl+N`. */
  shortcut?: string
  checked?: boolean
  /** Draw the checked mark as a radio bullet. */
  radio?: boolean
  disabled?: boolean
  separator?: boolean
  items?: MenuItemDef[]
  action?: () => void
}

export interface MnemonicParts {
  before: string
  key: string
  after: string
}

/** Splits a WinForms-style label on its `&` accelerator. */
export function parseMnemonic(label = ''): MnemonicParts {
  const text = label.replace(/&&/g, '\u0000')
  const at = text.indexOf('&')
  const unescape = (s: string): string => s.replace(/\u0000/g, '&')
  if (at < 0 || at === text.length - 1) return { before: unescape(text), key: '', after: '' }
  return { before: unescape(text.slice(0, at)), key: unescape(text[at + 1]), after: unescape(text.slice(at + 2)) }
}

export function mnemonicKey(label?: string): string {
  return parseMnemonic(label).key.toLowerCase()
}

export function isSelectable(item: MenuItemDef): boolean {
  return !item.separator && !item.disabled
}

/** A top-level menu of a MenuStrip. */
export interface MenuDef {
  /** Text with optional `&` mnemonic, e.g. `&File`. */
  label: string
  items: MenuItemDef[]
}

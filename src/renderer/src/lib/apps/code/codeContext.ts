/**
 * Pure builders of the context menus of the Code project tree (UX-38): a project (drive) row, a folder row, a file
 * row and the empty area of the tree. Test ids are `code-ctx-<action>`.
 */
import { vpathParent } from '@shared/vfs'
import type { MenuItemDef } from '../../kit/molecules/MenuItem'
import { CHAT_ITEM_LABELS } from '../shared/contextItems'

export interface TreeMenuOps {
  /** Opens the file, or expands the folder. */
  open: () => void
  startChat: () => void
  openInExplorer: () => void
  openWithNotepad: () => void
  copyPath: () => void
  askAboutFile: () => void
  eject: () => void
  plugIn: () => void
}

/** The kind of row that was clicked: a project root, a folder, a file; `empty` is the space below the rows. */
export type TreeMenuTarget = 'project' | 'folder' | 'file' | 'empty'

const item = (id: string, label: string, action: () => void, extra: Partial<MenuItemDef> = {}): MenuItemDef => ({ id: `code-ctx-${id}`, testid: `code-ctx-${id}`, label, action, ...extra })

export function treeMenu(target: TreeMenuTarget, ops: TreeMenuOps, state: { canEject: boolean }): MenuItemDef[] {
  switch (target) {
    case 'project':
      return [
        item('open', '&Open', ops.open, { icon: 'folder-open' }),
        item('start-chat', '&New chat here', ops.startChat, { icon: 'session' }),
        item('open-explorer', 'Open in &Explorer', ops.openInExplorer, { icon: 'folder' }),
        { separator: true },
        item('eject', '&Remove from desktop', ops.eject, { icon: 'usb', disabled: !state.canEject, title: 'Remove this project from the desktop. Its folder stays on your disk.' })
      ]
    case 'folder':
      return [
        item('open', '&Open', ops.open, { icon: 'folder-open' }),
        item('start-chat', '&New chat here', ops.startChat, { icon: 'session' }),
        item('open-explorer', 'Open in &Explorer', ops.openInExplorer, { icon: 'folder' }),
        item('copy-path', 'Copy as &path', ops.copyPath, { icon: 'copy' })
      ]
    case 'file':
      return [
        item('open', '&Open', ops.open, { icon: 'file-code' }),
        item('open-notepad', 'Open with &Notepad', ops.openWithNotepad, { icon: 'file-text' }),
        item('copy-path', 'Copy as &path', ops.copyPath, { icon: 'copy' }),
        item('ask-file', CHAT_ITEM_LABELS.askFile, ops.askAboutFile, { icon: 'session' })
      ]
    case 'empty':
      return [item('plug-in', '&Plug in a project...', ops.plugIn, { icon: 'plus' })]
  }
}

/** What the toolbar above the project tree can do with the selected row. */
export interface TreeToolbarState {
  /** The folder a new chat works in: the selected project or folder, the folder of the selected file, else the first project. */
  chatFolder: string
  /** The project that "Remove from desktop" takes off: only a selected project root that is a plugged-in drive. */
  removable: boolean
}

/** The state of the tree toolbar for the selected row; `fallback` is the folder when nothing is selected. */
export function treeToolbar(target: { kind: TreeMenuTarget; path: string } | null, fallback: string, canRemove: boolean): TreeToolbarState {
  if (!target || target.kind === 'empty') return { chatFolder: fallback, removable: false }
  const folder = target.kind === 'file' ? (vpathParent(target.path) ?? fallback) : target.path
  return { chatFolder: folder, removable: target.kind === 'project' && canRemove }
}

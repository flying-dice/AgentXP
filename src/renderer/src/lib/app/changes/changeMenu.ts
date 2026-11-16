import type { FileChangeDto } from '@shared/models'
import type { MenuItemDef } from '../../kit/molecules/MenuItem'

/** What the right-click menu of a row in the Changes list can do (UX-169). Every action is optional: an item without one is left out. */
export interface ChangeRowMenuOptions {
  /** The change under the pointer; null for a reverted row. */
  change: FileChangeDto | null
  /** Asks and reverts (the same as the Revert button). */
  onrevert?: (change: FileChangeDto) => void
  onopeneditor?: (change: FileChangeDto) => void
  /** Opens the Recycle Bin (a reverted row's way back). */
  onopenrecyclebin?: () => void
}

/**
 * The menu of one row of the Changes list. A changed row offers Revert and Open in editor; a reverted row offers
 * "Show in the Recycle Bin", where the file waits (the Restore button beside the list puts it back in one click) (UX-169: the way back is where a user looks, on the row).
 */
export function changeRowItems({ change, onrevert, onopeneditor, onopenrecyclebin }: ChangeRowMenuOptions): MenuItemDef[] {
  if (!change) {
    return onopenrecyclebin ? [{ id: 'changes-ctx-restore', testid: 'changes-ctx-restore', label: '&Show in the Recycle Bin', icon: 'recycle', title: 'Open the Recycle Bin, where the reverted file waits.', action: onopenrecyclebin }] : []
  }
  const items: MenuItemDef[] = []
  if (onrevert) items.push({ id: 'changes-ctx-revert', testid: 'changes-ctx-revert', label: '&Revert', icon: 'recycle', title: 'Put the file back to how it was before the agent changed it.', action: () => onrevert(change) })
  if (onopeneditor) {
    const deleted = change.kind === 'deleted'
    items.push({ id: 'changes-ctx-open-editor', testid: 'changes-ctx-open-editor', label: '&Open in editor', icon: 'file-code', disabled: deleted, title: deleted ? 'A deleted file cannot be opened.' : 'Open the file in the editor.', action: () => onopeneditor(change) })
  }
  return items
}

/**
 * `Edit > Undo revert` of the chat: it is there while the last thing the user did to the changes was a revert, and it takes
 * the newest reverted file out of the Recycle Bin (UX-169). `available` says whether a revert is waiting to be undone.
 */
export function undoRevertItem(available: boolean, undo: () => void): MenuItemDef[] {
  if (!available) return []
  return [{ separator: true }, { id: 'chat-menu-undo-revert', testid: 'chat-menu-undo-revert', label: 'Undo re&vert', icon: 'recycle', title: 'Take the last reverted file out of the Recycle Bin.', action: undo }]
}

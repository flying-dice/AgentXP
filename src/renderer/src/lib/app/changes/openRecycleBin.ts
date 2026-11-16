import type { Id } from '@shared/models'
import type { DesktopHost } from '../../apps/types'

/** Opens the Recycle Bin, on the entry of a reverted row when it is known (UX-185: "Restore..." lands on the item). */
/** What a one-click restore did: the file is back, or the reason it is not (the Recycle Bin is then open on the item). */
export type RestoreOutcome = { restored: true } | { restored: false; message: string }

/**
 * "Restore" of a reverted row: puts the file back in one click (UX-209). When that is not possible (the folder is gone, the drive is not
 * plugged in) it opens the Recycle Bin on the item instead and says why, so the user is never left with a button that did nothing.
 */
export async function restoreReverted(host: Pick<DesktopHost, 'openApp' | 'api'>, entryId: Id): Promise<RestoreOutcome> {
  try {
    await host.api.recycle.restore(entryId)
    return { restored: true }
  } catch (error) {
    await openRecycleBin(host, entryId)
    return { restored: false, message: error instanceof Error ? error.message : String(error) }
  }
}

export async function openRecycleBin(host: Pick<DesktopHost, 'openApp' | 'api'>, entryId?: Id): Promise<void> {
  const window = await host.openApp({ app: 'recycle-bin' })
  if (entryId !== undefined) await host.api.desktop.updateView(window.id, { app: 'recycle-bin', selectedId: entryId }).catch(() => {})
}

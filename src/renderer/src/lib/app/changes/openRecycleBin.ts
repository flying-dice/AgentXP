import type { Id } from '@shared/models'
import type { DesktopHost } from '../../apps/types'

/** Opens the Recycle Bin, on the entry of a reverted row when it is known (UX-185: "Restore..." lands on the item). */
export async function openRecycleBin(host: Pick<DesktopHost, 'openApp' | 'api'>, entryId?: Id): Promise<void> {
  const window = await host.openApp({ app: 'recycle-bin' })
  if (entryId !== undefined) await host.api.desktop.updateView(window.id, { app: 'recycle-bin', selectedId: entryId }).catch(() => {})
}

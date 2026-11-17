import type { AgentXPApi } from '@shared/ipc'
import type { RecycledChangeDto } from '@shared/desktop'
import type { FileChangeDto, Id } from '@shared/models'
import { revertedRows, type RevertedChange } from './changesLayout'

/**
 * The reverted rows of a Changes pane, read from the Recycle Bin of the desktop (saved with it) and read again whenever it
 * changes. Call it while a component starts; the pane takes `list` as its `reverted` rows (UX-117).
 */
export function useRevertedChanges(
  api: Pick<AgentXPApi, 'recycle' | 'on'>,
  desktopId: () => Id,
  sessionIds: () => readonly Id[],
  changes: () => readonly FileChangeDto[]
): { readonly list: RevertedChange[] } {
  let recycled = $state.raw<RecycledChangeDto[]>([])

  $effect(() => {
    const id = desktopId()
    let stale = false
    const load = (): void =>
      void api.recycle.list(id).then(
        (entries) => !stale && (recycled = entries),
        () => {}
      )
    load()
    const off = api.on('recycle.changed', (event) => event.desktopId === id && load())
    return () => {
      stale = true
      off()
    }
  })

  const list = $derived(revertedRows(recycled, sessionIds(), changes()))
  return {
    get list() {
      return list
    }
  }
}

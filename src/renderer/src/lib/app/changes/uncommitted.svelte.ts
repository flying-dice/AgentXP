import type { GitStatusDto } from '@shared/git'
import type { AgentXPApi } from '@shared/ipc'
import type { FileChangeDto, Id } from '@shared/models'
import type { DriveLetter } from '@shared/vfs'
import { changeDrives, driveRootOf, uncommittedChanges } from './uncommitted'

/**
 * The changes of a Changes pane that are still uncommitted. Git is asked for the status of every drive that has a change, and
 * asked again when the changes change, on `git.changed` (saves, agent edits, the poll of the Code window), when the window gets
 * focus (a commit made in a terminal), and on `refresh()`. Call it while a component starts.
 */
export function useUncommittedChanges(
  api: Pick<AgentXPApi, 'git' | 'on'>,
  desktopId: () => Id,
  changes: () => readonly FileChangeDto[]
): { readonly list: FileChangeDto[]; refresh(): Promise<void> } {
  let statuses = $state.raw<ReadonlyMap<DriveLetter, GitStatusDto | null>>(new Map())
  let token = 0
  const drivesKey = $derived(changeDrives(changes()).join(','))

  async function refresh(): Promise<void> {
    const mine = ++token
    const id = desktopId()
    const drives = drivesKey === '' ? [] : drivesKey.split(',')
    const next = new Map<DriveLetter, GitStatusDto | null>()
    await Promise.all(
      drives.map(async (drive) => {
        // A failed read keeps the changes (no entry), it never hides them.
        const status = await api.git.status(id, driveRootOf(drive)).catch(() => undefined)
        if (status !== undefined) next.set(drive, status)
      })
    )
    if (mine === token && JSON.stringify([...next]) !== JSON.stringify([...statuses])) statuses = next
  }

  $effect(() => {
    void drivesKey
    void changes().length
    void desktopId()
    void refresh()
  })
  $effect(() => {
    const id = desktopId()
    const off = api.on('git.changed', (e) => e.desktopId === id && void refresh())
    const onFocus = (): void => void refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      off()
      window.removeEventListener('focus', onFocus)
    }
  })

  const list = $derived(uncommittedChanges(changes(), statuses))
  return {
    get list() {
      return list
    },
    refresh
  }
}

/** One directory level as the apps show it: '' is "Computer" and lists the drives. */
import type { Agent7Api } from '@shared/ipc'
import type { Id } from '@shared/models'
import type { VfsEntryDto, VPath } from '@shared/vfs'
import { driveRoot, driveTitle, sortDrives } from '../explorer/explorerModel'

export async function listLocation(api: Pick<Agent7Api, 'vfs' | 'drives'>, desktopId: Id, path: VPath | ''): Promise<VfsEntryDto[]> {
  if (path !== '') return api.vfs.readDir(desktopId, path)
  const drives = sortDrives(await api.drives.list(desktopId))
  return drives.map((d): VfsEntryDto => ({ name: driveTitle(d), path: driveRoot(d.letter), kind: 'directory', size: null, modifiedAt: d.pluggedAt }))
}

export const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error))

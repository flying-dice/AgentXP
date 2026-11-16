import type { Id } from '@shared/models'

/** A project that was ejected from the desktop and can be plugged in again. */
export interface RemovedProject {
  folderId: Id
  /** The project's name (`login-app`). */
  label: string
}

/** How many ejected projects Computer remembers. */
export const RECENTLY_REMOVED_MAX = 3

/** Newest first, no project twice, at most `RECENTLY_REMOVED_MAX`. */
export function addRemoved(list: readonly RemovedProject[], project: RemovedProject): RemovedProject[] {
  return [project, ...list.filter((p) => p.folderId !== project.folderId)].slice(0, RECENTLY_REMOVED_MAX)
}

/** Text of the balloon after Plug in: `login-app (E:) is ready to use.` */
export const pluggedBalloonText = (driveTitle: string): string => `${driveTitle} is ready to use.`

/** Text of the balloon after Eject; it also says how to get the project back. */
export const ejectBalloonText = (driveTitle: string): string =>
  `${driveTitle} can now be removed. Its files on disk were not changed.\n\nTo use it again, open Computer and choose Plug in a project...`

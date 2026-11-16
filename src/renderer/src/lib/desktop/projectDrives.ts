import type { Id } from '@shared/models'

/** A project that was ejected from the desktop and can be plugged in again (the desktop state keeps the list). */
export interface RemovedProject {
  folderId: Id
  /** The project's name (`login-app`). */
  label: string
  /** The letter it had (`E`), when known. */
  letter?: string
}

/** How many ejected projects Computer remembers. */
export const RECENTLY_REMOVED_MAX = 3

/** Newest first, no project twice, at most `max`. */
export function addRemoved<T extends RemovedProject>(list: readonly T[], project: T, max = RECENTLY_REMOVED_MAX): T[] {
  return [project, ...list.filter((p) => p.folderId !== project.folderId)].slice(0, max)
}

/** Tray entry: `Plug in login-app (E:) again`. */
export const plugAgainLabel = (project: RemovedProject): string => `Plug in ${project.label}${project.letter ? ` (${project.letter}:)` : ''} again`

/** Tooltip of the Plug in again button when it is disabled. */
export const NOTHING_REMOVED_TIP = 'Nothing was removed from this desktop yet. Use Plug in a project... to add a folder.'

/** Text of the balloon after Plug in: `Project plugged in: login-app (E:) is ready to use.` */
export const pluggedBalloonText = (driveTitle: string): string => `Project plugged in: ${driveTitle} is ready to use.`

/** Text of the balloon after Eject; it also says how to get the project back. */
export const ejectBalloonText = (driveTitle: string): string =>
  `${driveTitle} can now be removed. Its files on disk were not changed.\n\nTo use it again, open Computer and choose Plug in a project...`

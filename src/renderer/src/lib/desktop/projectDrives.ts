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

/** Title of the balloon after Eject. */
export const EJECT_BALLOON_TITLE = 'Project removed'

/** The project as people say it: `'login-app' (E:)` (the letter is never used alone). */
export const projectQuoted = (label: string, letter?: string): string => `'${label}'${letter ? ` (${letter}:)` : ''}`

/** Text of the balloon after Eject: what happened, that the files are safe, and how to get the project back. */
export const ejectBalloonText = (label: string, letter?: string): string =>
  `${projectQuoted(label, letter)} was removed from this desktop. Your files are still in the folder. Double-click it in Computer to plug it in again.`

/** The question before a project is removed while chats still work on it. */
export const removeProjectText = (label: string): string => `Remove '${label}' from this desktop? The agent can no longer use it. The folder and its files stay where they are.`

/** Menu entry and button of Eject (the `&` is the access key). */
export const EJECT_LABEL = 'Eject (remove from this desktop)'

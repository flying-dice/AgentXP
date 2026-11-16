/** The words of the Changes pane that depend on what the list holds (UX-185, UX-187). Pure, so they are tested. */

/** The list's empty text. It says only what this chat did, so it never contradicts a Git list (UX-187). */
export const CHANGES_EMPTY = 'No uncommitted changes from this chat.'

/** What the pane shows in place of a diff when a reverted row is selected (UX-185). */
export const UNDONE_TEXT = 'This change was undone. Restore it to put the file back.'

/** The button of that row: it restores the file in one click (UX-209). */
export const RESTORE_LABEL = 'Restore'
/** The button when the file cannot be restored from here: it opens the Recycle Bin on the item. */
export const OPEN_BIN_LABEL = 'Open Recycle Bin...'

/** The line above the list after a restore (UX-209). */
export const restoredText = (path: string): string => `Restored ${path.split(/[\\/]/).filter(Boolean).pop() ?? path}.`

/** Why a restore did not happen here, in plain words: the folder is gone, or the reason the system gave (UX-209). */
export function restoreFailedText(message: string): string {
  const gone = /ENOENT|no such file|not found|not plugged in|outside the workspace/i.test(message)
  return gone ? 'The folder of this file is not available, so it cannot be restored here. Open the Recycle Bin to restore it from there.' : 'The file could not be restored here. Open the Recycle Bin to try from there.'
}

/** The line for a folder that is not under Git: why there are no change marks (UX-208). */
export const NOT_TRACKED_TEXT = 'This folder is not tracked by Git, so there are no change marks.'

/** The link at the end of the Git line. */
export const OPEN_GIT_LINK = 'open the Git tab'

/** The line under the empty list: what Git knows (a count, with the link to Git) or why there is nothing more. */
export type GitNote = { kind: 'files'; text: string } | { kind: 'untracked'; text: string }

/**
 * `gitCount` is how many files Git lists as changed; `gitTracked` says whether the folder is under Git (undefined: not known, as in
 * the chat window, which does not read Git). Null: nothing to add.
 */
export function gitNote(gitCount: number, gitTracked: boolean | undefined): GitNote | null {
  if (gitCount > 0) return { kind: 'files', text: `Git shows ${gitCount} changed ${gitCount === 1 ? 'file' : 'files'} from before:` }
  if (gitTracked === false) return { kind: 'untracked', text: NOT_TRACKED_TEXT }
  return null
}

/** The line under the buttons that says why Revert is grey: nothing to revert yet, or nothing is selected. Null while Revert works. */
export function revertReasonText(hasChanges: boolean, hasSelection: boolean): string | null {
  if (!hasChanges) return 'Nothing to revert yet.'
  return hasSelection ? null : 'Select a changed file first.'
}

/** The words of the Changes pane that depend on what the list holds (UX-185, UX-187). Pure, so they are tested. */

/** The list's empty text. It says only what this chat did, so it never contradicts a Git list (UX-187). */
export const CHANGES_EMPTY = 'No uncommitted changes from this chat.'

/** What the pane shows in place of a diff when a reverted row is selected (UX-185). */
export const UNDONE_TEXT = 'This change was undone. Restore it from the Recycle Bin.'

/** The line under the empty list: what Git knows (a count, with the link to Git) or why there is nothing more. */
export type GitNote = { kind: 'files'; text: string } | { kind: 'untracked'; text: string }

/**
 * `gitCount` is how many files Git lists as changed; `gitTracked` says whether the folder is under Git (undefined: not known, as in
 * the chat window, which does not read Git). Null: nothing to add.
 */
export function gitNote(gitCount: number, gitTracked: boolean | undefined): GitNote | null {
  if (gitCount > 0) return { kind: 'files', text: `Git shows ${gitCount} changed ${gitCount === 1 ? 'file' : 'files'} from before.` }
  if (gitTracked === false) return { kind: 'untracked', text: 'This folder is not tracked by Git, so there is nothing else to show.' }
  return null
}

/** The line under the buttons that says why Revert is grey: nothing to revert yet, or nothing is selected. Null while Revert works. */
export function revertReasonText(hasChanges: boolean, hasSelection: boolean): string | null {
  if (!hasChanges) return 'Nothing to revert yet.'
  return hasSelection ? null : 'Select a changed file first.'
}

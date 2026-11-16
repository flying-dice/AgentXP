import { changeCounts, changeCountsShort } from '@shared/lineCounts'
import type { FileChangeDto, FileChangeKind } from '@shared/models'
import type { IconName } from '../../kit/atoms/icons'

const KIND: Record<FileChangeKind, string> = { added: 'Added', modified: 'Modified', deleted: 'Deleted' }

export const changeKindLabel = (kind: FileChangeKind): string => KIND[kind]

/** The picture of a status in a list too narrow for its word (UX-207). The word is its tooltip and its name for a screen reader. */
const KIND_ICON: Record<FileChangeKind, IconName> = { added: 'plus', modified: 'edit', deleted: 'delete' }
export const changeKindIcon = (kind: FileChangeKind): IconName => KIND_ICON[kind]
export const REVERTED_ICON: IconName = 'undo'

type Counted = Pick<FileChangeDto, 'additions' | 'deletions'> & Partial<Pick<FileChangeDto, 'kind' | 'originalText' | 'currentText'>>

/**
 * The lines of a change, counted by the shared `changeCounts` (the same code as the permission box) from the two texts
 * when the pane has them; the numbers saved with the change stand in when it does not.
 */
export function fileChangeCounts(change: Counted): { additions: number; deletions: number } {
  if (change.originalText !== undefined || change.currentText !== undefined) {
    const before = change.kind === 'added' ? (change.originalText ?? '') : change.originalText
    const after = change.kind === 'deleted' ? (change.currentText ?? '') : change.currentText
    if (before !== null && before !== undefined && after !== null && after !== undefined) {
      const { additions, deletions } = changeCounts(before, after)
      return { additions, deletions }
    }
  }
  return { additions: change.additions, deletions: change.deletions }
}

/** "+4 / -1": the lines column, "+ added / - removed" (the compact form of the permission box's "4 lines added, 1 removed"). */
export const linesLabel = (change: Counted): string => changeCountsShort(fileChangeCounts(change))

/** "5 files, +12 -3": the total over a list of changes. */
export function changesSummary(changes: readonly Counted[]): string {
  const counts = changes.map(fileChangeCounts)
  const added = counts.reduce((n, c) => n + c.additions, 0)
  const removed = counts.reduce((n, c) => n + c.deletions, 0)
  return `${changes.length} ${changes.length === 1 ? 'file' : 'files'}, +${added} -${removed}`
}

/** `redirect.ts` and `src\auth` for `src\auth\redirect.ts` (either separator): the bold name and the grey folder beside it. */
export function splitChangePath(path: string): { name: string; dir: string } {
  const at = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'))
  return at < 0 ? { name: path, dir: '' } : { name: path.slice(at + 1), dir: path.slice(0, at) }
}

/** The question before a revert. It says where the file goes, so nobody needs to look for it (UX-40). */
export const revertConfirmText = (path: string): string =>
  `Revert the changes to ${path}?\n\nThe file goes back to how it was before the agent edited it. You can get it back from the Recycle Bin.`

/** What a reverted row says in place of its change kind (UX-79). */
export const REVERTED_LABEL = 'Reverted. Restore from the Recycle Bin'
/** The one line above the list when a file was reverted; the link beside it opens the Recycle Bin (UX-151). */
export const REVERTED_NOTE = 'Reverted files are in the Recycle Bin.'

/** The short word in the Change column of a reverted row. */
export const REVERTED_KIND = 'Reverted'

/** `redirect` and `.ts` for `redirect.ts`: the stem may be cut with an ellipsis, the extension never is (UX-79). */
export function splitFileName(name: string): { stem: string; ext: string } {
  const dot = name.lastIndexOf('.')
  return dot <= 0 ? { stem: name, ext: '' } : { stem: name.slice(0, dot), ext: name.slice(dot) }
}

/** Joins a folder path and a relative change path with the separator the folder path uses. */
export function absolutePath(folderPath: string, relative: string): string {
  const sep = folderPath.includes('\\') && !folderPath.includes('/') ? '\\' : '/'
  const clean = relative.replace(/^[\\/]+/, '').replaceAll(sep === '\\' ? '/' : '\\', sep)
  return `${folderPath.replace(/[\\/]+$/, '')}${sep}${clean}`
}

/** How many characters of the stem stay beside the extension when a long name is cut in the middle. */
export const NAME_TAIL = 6

/**
 * A file name in two parts so that a long one is cut in the middle: `head` may end in an ellipsis, `tail` (the last
 * characters of the stem and the extension) never does. `redirect-handler.ts` gives `redirect-h` and `andler.ts`, so
 * the reader still sees the end of the name and its type when the middle is cut.
 */
export function splitForMiddleEllipsis(name: string): { head: string; tail: string } {
  const { stem, ext } = splitFileName(name)
  const keep = Math.min(stem.length, NAME_TAIL)
  return { head: stem.slice(0, stem.length - keep), tail: `${stem.slice(stem.length - keep)}${ext}` }
}

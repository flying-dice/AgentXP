/** The size of a proposed change to a file, in words ("5 lines added, 2 removed"), for the approval dialogs. */
import { computeDiff } from '@shared/diff'
import { changeCounts, changeCountsText, type ChangeKind } from '@shared/lineCounts'

export interface ChangeSummary {
  added: number
  removed: number
  /** The kind of change (see `changeCounts`); `unknown` when the current text of the file could not be read. */
  kind: ChangeKind
  /** The current file could not be read, so the box shows no preview of what changes. */
  unreadable: boolean
  /** "5 lines added, 2 removed", plus "This replaces the whole file." only for a rewrite of every line; the "could not read" sentence when unknown. */
  text: string
  /** Rows the preview shows (changed lines plus a little context). */
  rows: number
}

export function changeSummary(oldText: string | null, newText: string): ChangeSummary {
  const counts = changeCounts(oldText, newText)
  const rows = counts.kind === 'unknown' ? 0 : computeDiff(oldText ?? '', newText).reduce((n, hunk) => n + hunk.lines.length, 0)
  return { added: counts.additions, removed: counts.deletions, kind: counts.kind, unreadable: counts.kind === 'unknown', text: changeCountsText(counts), rows }
}

/** The size of a proposed change to a file, in words ("5 lines added, 2 removed"), for the approval dialogs. */
import { computeDiff, countLineChanges } from '@shared/diff'

export interface ChangeSummary {
  added: number
  removed: number
  /** The agent did not say what the file holds now, so the preview cannot show what is replaced. */
  replacesWholeFile: boolean
  /** "5 lines added, 2 removed" */
  text: string
  /** Rows the preview shows (changed lines plus a little context). */
  rows: number
}

const lines = (n: number): string => `${n} ${n === 1 ? 'line' : 'lines'}`

export function changeSummary(oldText: string | null, newText: string): ChangeSummary {
  const { additions, deletions } = countLineChanges(oldText, newText)
  const rows = computeDiff(oldText ?? '', newText).reduce((n, hunk) => n + hunk.lines.length, 0)
  return { added: additions, removed: deletions, replacesWholeFile: oldText === null, text: `${lines(additions)} added, ${deletions} removed`, rows }
}

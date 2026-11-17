/**
 * The one way to count and word a change to a file. The permission box ("5 lines added, 2 removed") and the Changes pane
 * ("+5 / -2") read it, so the same change shows the same numbers in both.
 */
import { countLineChanges, splitLines } from './diff'
import type { ReadErrorKind } from './models'

/**
 * What a change is, as far as the user needs to know:
 * - `unknown`: the current text of the file could not be read (`oldText` null), so nothing can be said about the change;
 * - `new`: the file did not exist (empty old text);
 * - `whole`: every old line changed or went away;
 * - `partial`: some lines stay.
 */
export type ChangeKind = 'unknown' | 'new' | 'whole' | 'partial'

export interface ChangeCounts {
  kind: ChangeKind
  additions: number
  deletions: number
}

/** What the box knows about the file besides the two texts: its path and, when the read failed, why. */
export interface ChangeContext {
  path?: string
  error?: ReadErrorKind
}

/** The line of the permission box when the old text could not be read (it does not claim a whole-file replacement). */
export function cannotReadText({ path, error }: ChangeContext = {}): string {
  const file = path ?? 'the file'
  return error === 'in_use' ? `AgentXP cannot read ${file}: it is in use.` : `AgentXP cannot read ${file}, so it cannot show what changes.`
}

/** Counts the lines a write adds and removes against the file's current text (`null`: it could not be read). */
export function changeCounts(oldText: string | null, newText: string): ChangeCounts {
  if (oldText === null) return { kind: 'unknown', additions: 0, deletions: 0 }
  const { additions, deletions } = countLineChanges(oldText, newText)
  const before = splitLines(oldText).length
  const after = splitLines(newText).length
  const kind: ChangeKind = before === 0 ? 'new' : deletions === before && additions === after ? 'whole' : 'partial'
  return { kind, additions, deletions }
}

/** The compact form for a narrow column: "+5 / -2" (the Changes pane). Same numbers as `changeCountsText`. */
export const changeCountsShort = ({ additions, deletions }: Pick<ChangeCounts, 'additions' | 'deletions'>): string => `+${additions} / -${deletions}`

const lines = (n: number): string => `${n} ${n === 1 ? 'line' : 'lines'}`

/**
 * "5 lines added, 2 removed"; for a file that does not exist yet "The file does not exist yet, so everything below is new";
 * the words of `cannotReadText` when the counts are unknown; "This replaces the whole file." only for a rewrite of every line.
 */
export function changeCountsText({ kind, additions, deletions }: ChangeCounts, context: ChangeContext = {}): string {
  if (kind === 'unknown') return cannotReadText(context)
  if (kind === 'new') return `The file does not exist yet, so everything below is new (${lines(additions)}).`
  const text = `${lines(additions)} added, ${deletions} removed`
  return kind === 'whole' ? `${text}. This replaces the whole file.` : text
}

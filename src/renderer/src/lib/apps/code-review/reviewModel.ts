/** Pure model of the Code Review app: rows, where comments hang, which comments a "send to chat" passes on. */
import type { DiffLine, SplitRow } from '@shared/diff'
import { parseVPath } from '@shared/vfs'
import { changeRegions, fullDiffLines, fullSplitRows, marginBlocks, splitKinds, unifiedKinds, type ChangeRegion, type MarginBlock, type RowKind } from '@shared/windiff'
import {
  VERDICT_LABELS,
  formatReviewPrompt,
  threadsOf,
  type ReviewChangeDto,
  type ReviewFileDto,
  type ReviewChangeStatus,
  type ReviewCommentDto,
  type ReviewStateDto,
  type ReviewVerdict
} from '@shared/review'

export type ReviewLayout = 'unified' | 'split'
/** `all`: every changed file's diff in one scroll (UX-41). */
export type ReviewViewMode = 'outline' | 'expanded' | 'all'

export interface ReviewThread {
  root: ReviewCommentDto
  replies: ReviewCommentDto[]
}

/** The status words of the outline (UX-42): plain words, no git letters. */
export const STATUS_LABEL: Record<ReviewChangeStatus, string> = {
  modified: 'Modified',
  added: 'New file',
  deleted: 'Deleted',
  renamed: 'Renamed',
  untracked: 'New file'
}

/** What `HEAD` means to a reader who does not know git. */
export const HEAD_MEANING = 'the last saved version'

/** The base shown in the toolbar and the status bar: `HEAD (the last saved version)`. */
export const baseLabel = (baseRef: string): string => (baseRef === 'HEAD' ? `HEAD (${HEAD_MEANING})` : baseRef)

/** The row of a unified diff a comment hangs under (the row that shows its last line), or -1 when that line is not in the diff. */
export function unifiedAnchor(lines: readonly DiffLine[], c: Pick<ReviewCommentDto, 'side' | 'lineEnd'>): number {
  return lines.findIndex((l) => (c.side === 'old' ? l.oldNo === c.lineEnd : l.newNo === c.lineEnd))
}

/** The same for the side-by-side rows (old lines are on the left, new lines on the right). */
export function splitAnchor(rows: readonly SplitRow[], c: Pick<ReviewCommentDto, 'side' | 'lineEnd'>): number {
  return rows.findIndex((r) => (c.side === 'old' ? r.left?.oldNo === c.lineEnd : r.right?.newNo === c.lineEnd))
}

/** Groups the threads of one file under their rows; threads whose line is no longer in the diff are `orphans`. */
export function placeThreads(threads: readonly ReviewThread[], anchor: (c: ReviewCommentDto) => number): { byRow: Map<number, ReviewThread[]>; orphans: ReviewThread[] } {
  const byRow = new Map<number, ReviewThread[]>()
  const orphans: ReviewThread[] = []
  for (const thread of threads) {
    const row = anchor(thread.root)
    if (row < 0) orphans.push(thread)
    else byRow.set(row, [...(byRow.get(row) ?? []), thread])
  }
  return { byRow, orphans }
}

export const fileThreads = (comments: readonly ReviewCommentDto[], path: string): ReviewThread[] => threadsOf(comments, path)

/** Open comments per file path (the badge in the outline). */
export function openCounts(comments: readonly ReviewCommentDto[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const c of comments) if (c.state === 'open') counts.set(c.path, (counts.get(c.path) ?? 0) + 1)
  return counts
}

/** The file F7 / Shift+F7 goes to next: the neighbour of `path` in the list (wraps), or null for a single file. */
export function neighbourFile(changes: readonly ReviewChangeDto[], path: string | null, direction: 1 | -1): string | null {
  if (changes.length < 2) return null
  const i = changes.findIndex((c) => c.path === path)
  if (i < 0) return changes[direction === 1 ? 0 : changes.length - 1].path
  return changes[(i + direction + changes.length) % changes.length].path
}

/** The comment ids "send to chat" passes on, and the prompt. `ids` = 'open': every open thread root; else those comments. */
export function selectForSend(state: ReviewStateDto, ids: readonly number[] | 'open', baseRef?: string): { text: string; ids: number[] } {
  const all = state.comments
  const roots = ids === 'open' ? all.filter((c) => c.state === 'open' && c.parentId === null) : all.filter((c) => ids.includes(c.id))
  if (roots.length === 0) return { text: '', ids: [] }
  const replies = all.filter((c) => c.parentId !== null && roots.some((r) => r.id === c.parentId) && !roots.includes(c))
  const text = formatReviewPrompt({ comments: roots, all, summary: state.summary, baseRef })
  return { text, ids: [...roots, ...replies].map((c) => c.id) }
}

/** Counts of the comments by state, for the status bar. */
export function commentCounts(comments: readonly ReviewCommentDto[]): { open: number; resolved: number; sent: number; total: number } {
  const roots = comments.filter((c) => c.parentId === null)
  return {
    open: roots.filter((c) => c.state === 'open').length,
    resolved: roots.filter((c) => c.state === 'resolved').length,
    sent: roots.filter((c) => c.state === 'sent').length,
    total: roots.length
  }
}

/** Everything the expanded view draws for one file: both row lists, the margin blocks and the F7 regions of the active layout. */
export interface FileView {
  lines: DiffLine[]
  split: SplitRow[]
  kinds: RowKind[]
  blocks: MarginBlock[]
  regions: ChangeRegion[]
}

export function fileView(file: ReviewFileDto | null, layout: ReviewLayout): FileView {
  const lines = file && !file.binary && !file.tooLarge ? fullDiffLines(file.oldText, file.newText) : []
  const split = layout === 'split' ? fullSplitRows(lines) : []
  const kinds = layout === 'split' ? splitKinds(split) : unifiedKinds(lines)
  return { lines, split, kinds, blocks: marginBlocks(kinds), regions: changeRegions(kinds) }
}

/** The file the window opens on: the first one (in list order) that has a comment, else the first file, else null. */
export function openingFile(changes: readonly ReviewChangeDto[], comments: readonly ReviewCommentDto[]): string | null {
  const commented = new Set(comments.map((c) => c.path))
  return (changes.find((c) => commented.has(c.path)) ?? changes[0])?.path ?? null
}

/** "Change 3 of 7": where the selected row is among the regions of the file (0 before the first one). */
export function changePosition(regions: readonly ChangeRegion[], selectedRow: number | null): { index: number; total: number } {
  if (selectedRow === null) return { index: 0, total: regions.length }
  const inside = regions.findIndex((r) => selectedRow >= r.start && selectedRow <= r.end)
  if (inside >= 0) return { index: inside + 1, total: regions.length }
  const before = regions.filter((r) => r.end < selectedRow).length
  return { index: before, total: regions.length }
}

/** "Change 3 of 7" as the status bar shows it; empty when the file has no change. */
export function changePositionLabel(regions: readonly ChangeRegion[], selectedRow: number | null): string {
  const { index, total } = changePosition(regions, selectedRow)
  if (total === 0) return ''
  return index === 0 ? `${total} ${total === 1 ? 'change' : 'changes'}` : `Change ${index} of ${total}`
}

/** "5 files, +12 -3": the line under the outline. */
export function changeTotals(changes: readonly ReviewChangeDto[]): string {
  const added = changes.reduce((n, c) => n + (c.binary ? 0 : c.additions), 0)
  const removed = changes.reduce((n, c) => n + (c.binary ? 0 : c.deletions), 0)
  return `${changes.length} ${changes.length === 1 ? 'file' : 'files'}, +${added} -${removed}`
}

/** The name of the project a path is in: the label of its drive ("review-notes" for `E:\\src`); null when the drive is unknown. */
export function projectNameOf(path: string, drives: readonly { letter: string; label: string }[]): string | null {
  const drive = parseVPath(path)?.drive
  return drives.find((d) => d.letter === drive)?.label || null
}

/** The line of the dialog for an open chat: "Chat: review-notes (in E:\)". An untitled chat is named after its project. */
export function chatChoiceLabel(chat: { title?: string | null; cwd: string }, projectName: string | null = null): string {
  const name = chat.title?.trim() ?? ''
  const own = name && name !== 'New session' && name !== 'New chat' ? name : (projectName ?? 'New chat')
  return `Chat: ${own} (in ${chat.cwd})`
}

/** The words of the choice that starts a chat of its own. */
export const NEW_CHAT_FOR_COMMENTS = 'Start a new chat for these comments'

/** Why the toolbar's "Add comment" is grey, or what it does. */
export const addCommentButtonTitle = (expanded: boolean, lineSelected: boolean): string =>
  !expanded ? 'Show one file (Expanded) and select a line first.' : !lineSelected ? 'Select a line first: click its number or its text.' : 'Add a comment on the selected line'

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

/**
 * The one sentence of the verdict banner: "Changes requested." and, when comments are blockers, "1 comment is a blocker." The
 * number of comments is not in it: the link "2 comments" at its end says it, so the banner never says the same thing twice (UX-191).
 */
export function verdictLine(verdict: ReviewVerdict, comments: readonly Pick<ReviewCommentDto, 'parentId' | 'severity'>[]): string {
  const blockers = comments.filter((c) => c.parentId === null && c.severity === 'blocker').length
  const tail = blockers === 0 ? '' : blockers === 1 ? ' 1 comment is a blocker.' : ` ${blockers} comments are blockers.`
  return `${VERDICT_LABELS[verdict]}.${tail}`
}

/**
 * The status bar: "2 files changed", and "redirect.ts (file 1 of 2 changed files)" when one of several files is open (UX-77,
 * UX-131, UX-167, UX-191: the file's name says which one). With a single changed file there is nothing to explain.
 * `path` is the open file; its name (not the folder) goes in the label.
 */
export const filesStatusLabel = (total: number, shown: number, path?: string): string => {
  const name = path ? (path.split(/[\\/]/).filter(Boolean).pop() ?? path) : ''
  return shown > 0 && total > shown ? (name ? `${name} (file ${shown} of ${total} changed files)` : `File ${shown} of ${total} changed files`) : `${plural(total, 'file', 'files')} changed`
}

export interface StatusField {
  key: string
  text: string
}

/**
 * The status fields that fit in `width` pixels. `fields` come in order of importance (most important first); a field that does
 * not fit is left out, with every less important one after it, so no field is ever cut in the middle (UX-167). The room of the
 * folder text (the spring) is what is left, at least `MIN_ROOT`.
 */
export const STATUS_CHAR_PX = 7
export const STATUS_PAD_PX = 24
export const MIN_ROOT = 140
export function fitStatusFields<T extends StatusField>(fields: readonly T[], width: number): T[] {
  if (width <= 0) return [...fields]
  const kept: T[] = []
  let used = MIN_ROOT
  for (const field of fields) {
    used += field.text.length * STATUS_CHAR_PX + STATUS_PAD_PX
    if (used > width && kept.length > 0) break
    kept.push(field)
  }
  return kept
}

/** The words under the severity list of the comment box (UX-76). */
export const SEVERITY_HELP = 'Minor is the usual choice for a suggestion. Use Blocker only when the change must not be accepted as it is.'

/** The tooltip of the "+" in the gutter. */
export const addCommentTitle = (line: number | undefined): string => (line === undefined ? 'There is no line to comment on here' : 'Add a comment on this line')

/** The line under the verdict once comments went to a chat: where they are and what happens next (UX-211). Null while none were sent. */
export const sentCommentsLine = (sent: number): string | null =>
  sent <= 0 ? null : `${sent} ${sent === 1 ? 'comment' : 'comments'} sent to the chat. Waiting for the assistant.`

/** The words of the toolbar button that sends comments: it says "Comments sent" when everything open went out (UX-211). */
export const sendButtonText = (open: number, sent: number): string => (open === 0 && sent > 0 ? 'Comments sent' : 'Send comments to chat...')

/** The tooltip of that button. */
export const sendButtonTitle = (open: number, sent: number): string =>
  open > 0 ? 'Send the open comments to a chat, so the agent can fix them' : sent > 0 ? 'All comments were sent to the chat.' : 'There are no open comments to send.'

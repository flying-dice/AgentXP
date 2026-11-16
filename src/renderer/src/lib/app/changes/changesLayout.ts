import type { RecycledChangeDto } from '@shared/desktop'
import type { Id } from '@shared/models'

/** Height of the list header, of one row and of the borders, as ListView draws them. */
const HEADER = 26
const ROW = 20
const BORDER = 2

/** Width of the bar between the list and the diff. */
export const SPLITTER = 4

/** The least height of the list (header and one row) and of the diff (about six lines) when the user drags the bar. */
export const LIST_MIN_HEIGHT = HEADER + ROW + BORDER
export const DIFF_MIN_HEIGHT = 100

/** The list shows at least this many rows when the chat has that many changes, and at most `MAX_ROWS` before it scrolls (UX-151). */
export const MIN_ROWS = 6
const MAX_ROWS = 10

/** The height that holds `rows` rows with the header. */
export const listHeightFor = (rows: number): number => HEADER + rows * ROW + BORDER

/**
 * The list starts with at least half of the room (the diff gets at most half) and with room for six rows; more rows grow it up to ten.
 * The diff keeps its least height when the room allows it. `available` is the height of the list and the diff together.
 */
export function defaultListHeight(rows: number, available: number): number {
  const wanted = Math.max(available / 2, listHeightFor(Math.min(MAX_ROWS, Math.max(MIN_ROWS, rows))))
  // Six rows win over the diff's least height: the pane then scrolls as a whole instead of squeezing the list.
  return Math.round(Math.min(wanted, Math.max(available - SPLITTER - DIFF_MIN_HEIGHT, listHeightFor(MIN_ROWS))))
}

/** A pane at least this wide and less than this high shows the diff beside the list; the list is then at least this wide and the diff this wide. */
export const BESIDE_MIN_WIDTH = 460
export const BESIDE_MAX_HEIGHT = 380
export const LIST_MIN_WIDTH = 200
export const DIFF_MIN_WIDTH = 180

const keyOf = (layoutKey: string): string => `agent7.changes.list.v2.${layoutKey}`

/** The list size (height, or width when the diff is beside it) the user chose for this window, or null. Reads never throw. */
export function readListSize(store: Pick<Storage, 'getItem'> | null, layoutKey: string): number | null {
  try {
    const value = Number(store?.getItem(keyOf(layoutKey)))
    return Number.isFinite(value) && value >= Math.min(LIST_MIN_HEIGHT, LIST_MIN_WIDTH) ? value : null
  } catch {
    return null
  }
}

export function writeListSize(store: Pick<Storage, 'setItem'> | null, layoutKey: string, height: number): void {
  try {
    store?.setItem(keyOf(layoutKey), String(Math.round(height)))
  } catch {
    // A full or blocked store only forgets the size.
  }
}

/** A change that was reverted: it stays in the list, grey, until the file is restored from the Recycle Bin (UX-117). */
export interface RevertedChange {
  id: Id
  path: string
}

const same = (a: string, b: string): boolean => a.replaceAll('/', '\\').toLowerCase() === b.replaceAll('/', '\\').toLowerCase()

/**
 * The reverted rows of some chats: what their Recycle Bin entries say, oldest first, one row per file, and none for a file the
 * agent changed again (it is a pending change once more). The entries are saved with the desktop, so the rows are still
 * there after the pane or the window is closed and opened again.
 */
export function revertedRows(recycled: readonly RecycledChangeDto[], sessionIds: readonly Id[], changes: readonly { path: string }[]): RevertedChange[] {
  const rows: (RevertedChange & { at: string })[] = []
  for (const entry of recycled) {
    if (entry.sessionId === null || !sessionIds.includes(entry.sessionId)) continue
    if (changes.some((c) => same(c.path, entry.path))) continue
    const at = rows.findIndex((r) => same(r.path, entry.path))
    if (at >= 0) {
      if (rows[at].at >= entry.revertedAt) continue
      rows.splice(at, 1)
    }
    rows.push({ id: entry.id, path: entry.path, at: entry.revertedAt })
  }
  return rows.sort((a, b) => a.at.localeCompare(b.at)).map(({ id, path }) => ({ id, path }))
}

/** How tall the preview of a change is in an approval box, in rows of the diff (UX-158, UX-177). */
export const DIFF_ROW_PX = 20
/** The preview always has room for this many rows (the three changed lines of a small edit show without a scroll)... */
export const DIFF_MIN_ROWS = 9
/** ...and shows up to this many before it scrolls. */
export const DIFF_MAX_ROWS = 14

/**
 * The height of the preview in pixels: the rows of the change (plus the header row), at least 9 rows and at most 14. When more rows
 * follow, the last visible row is cut in half, so a scroll bar is not the only sign that the preview scrolls (UX-177).
 */
export function diffViewportPx(changeRows: number): number {
  const rows = Math.min(DIFF_MAX_ROWS, Math.max(DIFF_MIN_ROWS, changeRows + 1))
  return rows * DIFF_ROW_PX + (isLongChange(changeRows) ? DIFF_ROW_PX / 2 : 0)
}

/** The height of the preview when the whole change is shown: every row, at most `limit` pixels (a very long change still scrolls). */
export function wholeChangePx(changeRows: number, limit = 400): number {
  return Math.min(limit, (changeRows + 1) * DIFF_ROW_PX)
}

/**
 * True when the box is too small to give the preview its room: the preview is shorter than 9 rows (or than the change, when that is
 * shorter), so the box offers "Show the whole change".
 */
export function previewIsTight(availablePx: number, changeRows: number): boolean {
  return availablePx + 1 < Math.min(DIFF_MIN_ROWS * DIFF_ROW_PX, (changeRows + 1) * DIFF_ROW_PX)
}

/** True when the change has more rows than the preview shows at most, so "Show all N lines" is offered. */
export const isLongChange = (changeRows: number): boolean => changeRows + 1 > DIFF_MAX_ROWS

/** The chat above the approval box keeps this much (one row) when the preview grows (UX-177). */
export const MIN_TRANSCRIPT_PX = 32

/**
 * The tallest the preview can get right now: what it has, plus what the chat above it can give up (it keeps one row). Both are
 * measured in pixels from the window (UX-194).
 */
export function growRoomPx(previewPx: number, transcriptPx: number): number {
  return previewPx + Math.max(0, transcriptPx - MIN_TRANSCRIPT_PX)
}

/**
 * Whether "Show the whole change" can show more rows: the click would make the preview at least one row taller. When it cannot
 * (a short window), the link is not shown, because a click that changes nothing is worse than no link (UX-194).
 */
export function canShowMore(previewPx: number, roomPx: number, changeRows: number): boolean {
  const wanted = wholeChangePx(changeRows)
  return Math.min(wanted, roomPx) >= previewPx + DIFF_ROW_PX
}

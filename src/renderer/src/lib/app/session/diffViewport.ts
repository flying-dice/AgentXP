/** How tall the preview of a change is in an approval box, in rows of the diff (UX-158). */
export const DIFF_ROW_PX = 20
/** The preview always has room for this many rows... */
export const DIFF_MIN_ROWS = 8
/** ...and shows up to this many before it scrolls. */
export const DIFF_MAX_ROWS = 14

/** The height of the preview in pixels: the rows of the change (plus the header row), at least 8 rows and at most 14. */
export function diffViewportPx(changeRows: number): number {
  const rows = Math.min(DIFF_MAX_ROWS, Math.max(DIFF_MIN_ROWS, changeRows + 1))
  return rows * DIFF_ROW_PX
}

/** The height of the preview when the whole change is shown: every row, at most `limit` pixels (a very long change still scrolls). */
export function wholeChangePx(changeRows: number, limit = 400): number {
  return Math.min(limit, (changeRows + 1) * DIFF_ROW_PX)
}

/**
 * True when the box is too small to give the preview its room: the preview is shorter than 8 rows (or than the change, when that is
 * shorter), so the box offers "Show the whole change".
 */
export function previewIsTight(availablePx: number, changeRows: number): boolean {
  return availablePx + 1 < Math.min(DIFF_MIN_ROWS * DIFF_ROW_PX, (changeRows + 1) * DIFF_ROW_PX)
}

/** True when the change has more rows than the preview shows at most, so "Show all N lines" is offered. */
export const isLongChange = (changeRows: number): boolean => changeRows + 1 > DIFF_MAX_ROWS

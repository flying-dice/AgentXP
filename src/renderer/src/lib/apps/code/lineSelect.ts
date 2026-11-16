/**
 * Selecting whole lines by their numbers (UX-186): a click on a line number selects that line, a drag over the numbers selects
 * the lines, and the click puts the focus in the code so that the keys work. The viewer is plain DOM text whose number column
 * is not selectable, so the lines are selected with a DOM range from the start of the first line to the end of the last.
 */

/** The index of the row at height `y`, from the rows' tops and bottoms; above the first row is 0, below the last is the last row. */
export function rowAtY(rects: readonly { top: number; bottom: number }[], y: number): number {
  if (rects.length === 0) return -1
  if (y < rects[0].top) return 0
  const at = rects.findIndex((r) => y >= r.top && y < r.bottom)
  return at >= 0 ? at : rects.length - 1
}

/** Selects the lines `from` to `to` (0-based row indexes, either order) of the viewer's scroll area. */
export function selectRows(scroller: HTMLElement, from: number, to: number): void {
  const rows = [...scroller.querySelectorAll('.row')]
  const first = rows[Math.min(from, to)]?.querySelector('.code')
  const last = rows[Math.max(from, to)]?.querySelector('.code')
  const selection = window.getSelection()
  if (!first || !last || !selection) return
  const range = document.createRange()
  range.setStart(first, 0)
  range.setEnd(last, last.childNodes.length)
  selection.removeAllRanges()
  selection.addRange(range)
}

/**
 * Makes the number column of `scroller` select lines. `onchange` runs when the selection changed (a click or the end of a drag).
 * Returns the function that removes the listeners.
 */
export function attachLineSelect(scroller: HTMLElement, onchange: () => void): () => void {
  let anchor = -1
  const rowsOf = (): Element[] => [...scroller.querySelectorAll('.row')]
  const rowUnder = (y: number): number =>
    rowAtY(
      rowsOf().map((r) => r.getBoundingClientRect()),
      y
    )
  const move = (event: MouseEvent): void => {
    if (anchor < 0) return
    selectRows(scroller, anchor, rowUnder(event.clientY))
  }
  const up = (): void => {
    if (anchor < 0) return
    anchor = -1
    document.removeEventListener('mousemove', move)
    document.removeEventListener('mouseup', up)
    onchange()
  }
  const down = (event: MouseEvent): void => {
    const number = event.target instanceof Element ? event.target.closest('.no') : null
    if (event.button !== 0 || !number || !scroller.contains(number)) return
    anchor = rowsOf().indexOf(number.closest('.row') as Element)
    if (anchor < 0) return
    // No native selection starts in the number column; the focus goes to the code so Shift+arrows and Ctrl+C work.
    event.preventDefault()
    scroller.focus({ preventScroll: true })
    selectRows(scroller, anchor, anchor)
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
    onchange()
  }
  scroller.addEventListener('mousedown', down)
  return () => {
    scroller.removeEventListener('mousedown', down)
    document.removeEventListener('mousemove', move)
    document.removeEventListener('mouseup', up)
  }
}

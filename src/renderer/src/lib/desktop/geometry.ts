/** Pure window geometry for the window manager (no DOM, no state). */
import type { AppKind, Bounds } from '@shared/desktop'
import { placeWindow } from '@shared/desktop-views'

export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
export const RESIZE_EDGES: readonly ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

export interface Size {
  width: number
  height: number
}

export const MIN_WINDOW_SIZE: Size = { width: 280, height: 160 }
/** How much of a window must stay reachable when it is dragged towards an edge. */
const GRAB_MARGIN = 90
const TITLE_HEIGHT = 30

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

/** New bounds while resizing from `edge` by the pointer delta; the opposite edge stays put. */
export function resizeBounds(start: Bounds, edge: ResizeEdge, dx: number, dy: number, area?: Size, min: Size = MIN_WINDOW_SIZE): Bounds {
  let { x, y, width, height } = start
  if (edge.includes('e')) width = Math.max(min.width, start.width + dx)
  if (edge.includes('s')) height = Math.max(min.height, start.height + dy)
  if (edge.includes('w')) {
    width = Math.max(min.width, start.width - dx)
    x = start.x + start.width - width
  }
  if (edge.includes('n')) {
    // The title bar must not leave the top of the desktop.
    const top = Math.max(0, start.y + dy)
    height = Math.max(min.height, start.y + start.height - top)
    y = start.y + start.height - height
  }
  if (area) {
    if (edge.includes('e')) width = Math.min(width, Math.max(min.width, area.width - x))
    if (edge.includes('s')) height = Math.min(height, Math.max(min.height, area.height - y))
  }
  return { x, y, width, height }
}

/** New bounds while dragging by the title bar: the title bar always stays grabbable. */
export function moveBounds(start: Bounds, dx: number, dy: number, area: Size): Bounds {
  return {
    x: clamp(start.x + dx, GRAB_MARGIN - start.width, area.width - GRAB_MARGIN),
    y: clamp(start.y + dy, 0, Math.max(0, area.height - TITLE_HEIGHT)),
    width: start.width,
    height: start.height
  }
}

/** Dragging the title bar to the very top edge maximises (edge snap). */
export const shouldSnapMaximize = (pointerY: number, areaTop = 0): boolean => pointerY <= areaTop + 2

/** Pulls a window that sits (partly) outside the desktop back in, and enforces the minimum size. */
export function fitToArea(b: Bounds, area: Size, min: Size = MIN_WINDOW_SIZE): Bounds {
  const width = clamp(b.width, min.width, Math.max(min.width, area.width))
  const height = clamp(b.height, min.height, Math.max(min.height, area.height))
  return moveBounds({ ...b, width, height }, 0, 0, area)
}

/**
 * A window made `extra` px wider for its chat pane: it grows to the right, moves left when the work area ends, and never gets
 * wider than the area. The result equals `b` when there is no room at all.
 */
export function widenBounds(b: Bounds, extra: number, area: Size): Bounds {
  const width = Math.min(b.width + Math.max(0, extra), Math.max(b.width, area.width))
  const x = Math.max(0, Math.min(b.x, area.width - width))
  return { ...b, x, width }
}

/** Where the top bar is: its horizontal extent and its height (px, as measured). */
export interface BarRect {
  left: number
  right: number
  height: number
}

/** Gap between the bar and a window that was moved down from under it. */
export const BAR_GAP = 4

/** The lowest `y` of a window for a bar of `height` pixels. */
export const minYBelow = (height: number): number => Math.round(height) + BAR_GAP

/**
 * A window that has its title bar under the top bar is moved down to just below it (UX-88). A window that does not
 * reach the bar's side-to-side extent, or that already starts below it, is left alone.
 */
export function belowBar(b: Bounds, bar: BarRect): Bounds {
  const minY = minYBelow(bar.height)
  if (b.y >= minY || b.x >= bar.right || b.x + b.width <= bar.left) return b
  return { ...b, y: minY }
}

/** CSS box of a window frame: its bounds, or the whole desktop when maximised (the top bar floats over it). */
export function frameStyle(bounds: Bounds, maximized: boolean): string {
  if (maximized) return 'left:0;top:0;right:0;bottom:0;'
  return `left:${bounds.x}px;top:${bounds.y}px;width:${bounds.width}px;height:${bounds.height}px;`
}

/**
 * Bounds that lie wholly inside the work area and below the top bar: smaller when the area is smaller than the window,
 * moved in when the window sticks out (UX-148). `barHeight` is 0 until the bar is measured.
 */
export function fitInsideWorkArea(b: Bounds, area: Size, barHeight: number): Bounds {
  const minY = barHeight > 0 ? minYBelow(barHeight) : 0
  const width = Math.min(b.width, area.width)
  const height = Math.min(b.height, Math.max(1, area.height - minY))
  return { x: clamp(b.x, 0, area.width - width), y: clamp(b.y, minY, Math.max(minY, area.height - height)), width, height }
}

const boundsOverlap = (a: Bounds, b: Bounds): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

/** A new window that does not fit beside the window it came from starts this far right of and below it, on top, so its whole title bar (28 px) stays visible (UX-203). */
export const OPENER_CASCADE = 28

/** A second chat window is never narrower than this (UX-203). */
export const CHAT_MIN_WIDTH = 560

/**
 * Where a window that the user opened from another window belongs (UX-181, UX-203): whole inside the work area, and beside the window
 * it came from (to the right, then below, then left, then above, else squeezed into the room that is left) instead of over it. When
 * the work area has no room beside it, the new window is cascaded 24 px right of and below the window it came from and is on top.
 * A chat opened from a chat gets the size of that chat (at least 560 px wide). `opened` is where it is now; the result equals
 * `opened` when nothing has to move. `opener` is null when no window had the focus (or it was minimized).
 */
export function placeBesideOpener(app: AppKind, opened: Bounds, opener: Bounds | null, area: Size, barHeight: number, openCount: number, openerApp?: AppKind): Bounds {
  const sameAsOpener = app === 'chat' && openerApp === 'chat' && opener !== null
  const size = sameAsOpener ? { width: Math.max(CHAT_MIN_WIDTH, opener.width), height: opener.height } : { width: opened.width, height: opened.height }
  const fitted = fitInsideWorkArea({ ...opened, ...size }, area, barHeight)
  if (!opener || !boundsOverlap(fitted, opener)) return fitted
  const minY = barHeight > 0 ? minYBelow(barHeight) : 0
  const beside = fitInsideWorkArea(placeWindow(app, openCount, opener, area, { width: fitted.width, height: fitted.height }, minY), area, barHeight)
  // A second chat keeps the size of the first: it is never squeezed to fit beside it, it cascades instead.
  if (!boundsOverlap(beside, opener) && !(sameAsOpener && beside.width < fitted.width)) return beside
  return fitInsideWorkArea({ ...fitted, x: opener.x + OPENER_CASCADE, y: opener.y + OPENER_CASCADE }, area, barHeight)
}

/** The Help window: 760 x 520, or the work area minus 40 px when that is less, never narrower than 640 px (UX-165). */
export const HELP_SIZE: Size = { width: 760, height: 520 }
export const HELP_MIN_WIDTH = 640
const HELP_MARGIN = 40

/** Where the Help window opens: centred in the work area below the top bar, so its search box and topic column are whole. */
export function helpBounds(area: Size, barHeight: number): Bounds {
  const minY = barHeight > 0 ? minYBelow(barHeight) : 0
  const width = Math.min(area.width, Math.max(HELP_MIN_WIDTH, Math.min(HELP_SIZE.width, area.width - HELP_MARGIN)))
  const height = Math.max(1, Math.min(HELP_SIZE.height, area.height - minY - HELP_MARGIN))
  return {
    x: Math.round((area.width - width) / 2),
    y: Math.round(minY + Math.max(0, (area.height - minY - height) / 2)),
    width,
    height
  }
}

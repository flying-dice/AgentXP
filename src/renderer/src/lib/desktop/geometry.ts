/** Pure window geometry for the window manager (no DOM, no state). */
import type { Bounds } from '@shared/desktop'

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

/** Dragging the title bar to the very top edge maximises (Aero Snap). */
export const shouldSnapMaximize = (pointerY: number, areaTop = 0): boolean => pointerY <= areaTop + 2

/** Pulls a window that sits (partly) outside the desktop back in, and enforces the minimum size. */
export function fitToArea(b: Bounds, area: Size, min: Size = MIN_WINDOW_SIZE): Bounds {
  const width = clamp(b.width, min.width, Math.max(min.width, area.width))
  const height = clamp(b.height, min.height, Math.max(min.height, area.height))
  return moveBounds({ ...b, width, height }, 0, 0, area)
}

/** CSS box of a window frame: its bounds, or the whole desktop when maximised (the top bar floats over it). */
export function frameStyle(bounds: Bounds, maximized: boolean): string {
  if (maximized) return 'left:0;top:0;right:0;bottom:0;'
  return `left:${bounds.x}px;top:${bounds.y}px;width:${bounds.width}px;height:${bounds.height}px;`
}

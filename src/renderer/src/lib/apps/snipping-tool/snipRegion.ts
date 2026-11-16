/** Pure geometry of the Snipping Tool overlay. */
import type { Bounds } from '@shared/desktop'

export interface Point {
  x: number
  y: number
}

export const MIN_SNIP = 4

/** The rectangle between two drag points, clamped to the area. */
export function rectFromDrag(a: Point, b: Point, area: { width: number; height: number }): Bounds {
  const clamp = (v: number, hi: number): number => Math.max(0, Math.min(hi, v))
  const x1 = clamp(a.x, area.width)
  const y1 = clamp(a.y, area.height)
  const x2 = clamp(b.x, area.width)
  const y2 = clamp(b.y, area.height)
  return { x: Math.round(Math.min(x1, x2)), y: Math.round(Math.min(y1, y2)), width: Math.round(Math.abs(x2 - x1)), height: Math.round(Math.abs(y2 - y1)) }
}

export const isUsable = (r: Bounds): boolean => r.width >= MIN_SNIP && r.height >= MIN_SNIP

/** The top-most window under a point; `windows` are ordered back to front. */
export function windowAt<T extends { bounds: Bounds }>(windows: readonly T[], p: Point): T | null {
  for (let i = windows.length - 1; i >= 0; i--) {
    const b = windows[i].bounds
    if (p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height) return windows[i]
  }
  return null
}

/** Window bounds clipped to the area (a maximised window is exactly the area). */
export function clipToArea(b: Bounds, area: { width: number; height: number }): Bounds {
  const x = Math.max(0, b.x)
  const y = Math.max(0, b.y)
  return { x, y, width: Math.max(0, Math.min(b.x + b.width, area.width) - x), height: Math.max(0, Math.min(b.y + b.height, area.height) - y) }
}

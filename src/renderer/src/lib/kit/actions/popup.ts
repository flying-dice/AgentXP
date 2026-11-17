export interface PopupPosition {
  left: number
  top: number
  minWidth: number
  maxHeight: number
}

/** Fixed-position coordinates for a popup hanging below (or above, if cramped) an anchor. */
export function positionPopup(anchor: DOMRect, popupHeight: number, viewportHeight = workArea().height): PopupPosition {
  const below = viewportHeight - anchor.bottom - 4
  const above = anchor.top - 4
  const flip = popupHeight > below && above > below
  const maxHeight = Math.max(60, flip ? above : below)
  const height = Math.min(popupHeight, maxHeight)
  return {
    left: anchor.left,
    top: flip ? anchor.top - height + 1 : anchor.bottom - 1,
    minWidth: anchor.width,
    maxHeight
  }
}

export interface PopupSize {
  width: number
  height: number
}

export interface Viewport {
  width: number
  height: number
}

/**
 * The work area popups may use: the window, minus the XP taskbar when one is docked along the bottom
 * (Windows keeps menus and drop-down lists off the taskbar).
 */
export function workArea(): Viewport {
  const width = window.innerWidth
  let height = window.innerHeight
  const taskbar = document.querySelector('.xp-taskbar')?.getBoundingClientRect()
  if (taskbar && taskbar.height > 0 && taskbar.top > height / 2) height = Math.min(height, taskbar.top)
  return { width, height }
}

/**
 * Where a measured popup (menu, palette) goes so it stays on screen: below its anchor when it fits,
 * otherwise above it when there is more room there (WinForms ToolStripDropDown behaviour), and
 * finally clamped inside the viewport. Horizontally it lines up with the anchor's left edge, sliding
 * left when it would run past the right edge.
 */
export function placePopup(anchor: DOMRect, size: PopupSize, viewport: Viewport = workArea()): { left: number; top: number } {
  const below = viewport.height - anchor.bottom
  const above = anchor.top
  let top = anchor.bottom - 1
  if (size.height > below && above > below) top = anchor.top - size.height + 1
  top = Math.max(0, Math.min(top, viewport.height - size.height))
  const left = Math.max(0, Math.min(anchor.left, viewport.width - size.width))
  return { left, top }
}

/** Vertical shift (≤ 0) that pulls a nested popup back inside the viewport's bottom edge. */
export function nudgeUp(rect: Pick<DOMRect, 'top' | 'bottom'>, viewportHeight = workArea().height): number {
  const overflow = rect.bottom - viewportHeight
  if (overflow <= 0) return 0
  return -Math.min(overflow, Math.max(0, rect.top))
}

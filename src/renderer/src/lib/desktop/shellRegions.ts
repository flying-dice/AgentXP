/**
 * The keyboard regions of the desktop: F6 and Shift+F6 move between desktop icons, the active window, the desktop bar,
 * the taskbar and the tray. Each region is an element with `data-region`; the pure part decides the order, the rest
 * moves focus.
 */

export const REGIONS = ['icons', 'window', 'bar', 'taskbar', 'tray'] as const
export type Region = (typeof REGIONS)[number]

/** The region after (`1`) or before (`-1`) `current` among the `available` ones; the first or last one when `current` is null. */
export function nextRegion(available: readonly Region[], current: Region | null, direction: 1 | -1): Region | null {
  const order = REGIONS.filter((r) => available.includes(r))
  if (order.length === 0) return null
  const at = current === null ? -1 : order.indexOf(current)
  if (at < 0) return direction === 1 ? order[0] : order[order.length - 1]
  return order[(at + direction + order.length) % order.length]
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]'

/** Controls of `container` that Tab reaches, in document order. */
export function tabbable(container: Element): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    if (el.matches(':disabled') || el.tabIndex < 0 || el.closest('[hidden], [inert]')) return false
    return el.getClientRects().length > 0
  })
}

export const regionOf = (el: Element | null): Region | null => (el?.closest<HTMLElement>('[data-region]')?.dataset.region as Region | undefined) ?? null

const regionElement = (root: ParentNode, region: Region): HTMLElement | null => root.querySelector<HTMLElement>(`[data-region="${region}"]`)

/** Regions that exist and have something to focus. */
export function availableRegions(root: ParentNode): Region[] {
  return REGIONS.filter((r) => {
    const el = regionElement(root, r)
    return !!el && (tabbable(el).length > 0 || el.tabIndex >= 0)
  })
}

/** Focuses a region: the control that asks for it (`data-autofocus`), else its first control. Resolves false when there is none. */
export function focusRegion(root: ParentNode, region: Region): boolean {
  const el = regionElement(root, region)
  if (!el) return false
  const target = el.querySelector<HTMLElement>('[data-autofocus]:not(:disabled)') ?? tabbable(el)[0] ?? (el.tabIndex >= 0 ? el : null)
  target?.focus()
  return !!target
}

/** F6: moves to the next region. Resolves true when focus moved. */
export function cycleRegion(root: ParentNode, direction: 1 | -1, active: Element | null = document.activeElement): boolean {
  const next = nextRegion(availableRegions(root), regionOf(active), direction)
  return next !== null && focusRegion(root, next)
}

/**
 * Tab after the last control of a region (Shift+Tab before the first) leaves for the next (previous) region.
 * Only the window region does this: inside the other regions Tab moves normally.
 */
export function tabOutOfWindow(root: ParentNode, event: Pick<KeyboardEvent, 'shiftKey'>, active: Element | null = document.activeElement): boolean {
  if (regionOf(active) !== 'window') return false
  const el = regionElement(root, 'window')
  if (!el) return false
  const controls = tabbable(el)
  const edge = event.shiftKey ? controls[0] : controls[controls.length - 1]
  if (controls.length > 0 && active !== edge) return false
  return cycleRegion(root, event.shiftKey ? -1 : 1, active)
}

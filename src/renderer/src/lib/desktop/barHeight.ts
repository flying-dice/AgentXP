/** Svelte action: tells the desktop how big the top bar really is, so new windows start below it (UX-88). */
import type { BarRect } from './geometry'

/** Waits this long after the last size change before the windows are moved, so a bar that grows is handled once. */
export const BAR_SETTLE_MS = 120

/**
 * Observes the first element inside `node` (the top bar; `node` itself may use `display: contents`) and calls `report`
 * with its rectangle. A bar the pointer is over or that has the focus is skipped: a folded bar grows over the windows
 * while it is pointed at and shrinks again, which must not push the windows around.
 */
export function observeBar(node: HTMLElement, report: (rect: BarRect) => void): { destroy(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined
  let observer: ResizeObserver | undefined
  let watched: Element | null = null

  const measure = (): void => {
    if (!watched) return
    if (watched.matches(':hover, :focus-within')) return
    const r = watched.getBoundingClientRect()
    if (r.height > 0) report({ left: r.left, right: r.right, height: r.height })
  }
  const schedule = (): void => {
    clearTimeout(timer)
    timer = setTimeout(measure, BAR_SETTLE_MS)
  }
  const attach = (): void => {
    const el = node.firstElementChild
    if (el === watched) return
    if (watched) observer?.unobserve(watched)
    watched = el
    if (watched) observer?.observe(watched)
    schedule()
  }

  if (typeof ResizeObserver !== 'undefined') observer = new ResizeObserver(schedule)
  attach()
  const mutations = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(attach)
  mutations?.observe(node, { childList: true })
  return {
    destroy(): void {
      clearTimeout(timer)
      observer?.disconnect()
      mutations?.disconnect()
    }
  }
}

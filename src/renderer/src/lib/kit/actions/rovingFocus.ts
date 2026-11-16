import type { Action } from 'svelte/action'

export interface RovingFocusParams {
  /** CSS selector of the focusable items inside the container. */
  selector: string
  orientation?: 'horizontal' | 'vertical'
  /** Wrap from last to first. */
  loop?: boolean
}

/** Arrow/Home/End keys move DOM focus between the container's enabled items. */
export const rovingFocus: Action<HTMLElement, RovingFocusParams> = (node, params) => {
  let current = params
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.altKey || event.metaKey) return
    const horizontal = (current.orientation ?? 'horizontal') === 'horizontal'
    const prev = horizontal ? 'ArrowLeft' : 'ArrowUp'
    const next = horizontal ? 'ArrowRight' : 'ArrowDown'
    if (![prev, next, 'Home', 'End'].includes(event.key)) return
    const items = [...node.querySelectorAll<HTMLElement>(current.selector)].filter(
      (el) => !el.matches(':disabled, [aria-disabled="true"]')
    )
    const index = items.indexOf(document.activeElement as HTMLElement)
    if (index < 0 || items.length === 0) return
    let target = index
    if (event.key === 'Home') target = 0
    else if (event.key === 'End') target = items.length - 1
    else {
      const step = event.key === next ? 1 : -1
      target = index + step
      if (current.loop ?? true) target = (target + items.length) % items.length
      else target = Math.min(items.length - 1, Math.max(0, target))
    }
    items[target].focus()
    event.preventDefault()
  }
  node.addEventListener('keydown', onKeydown)
  return {
    update: (next) => {
      current = next
    },
    destroy: () => node.removeEventListener('keydown', onKeydown)
  }
}

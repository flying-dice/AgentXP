import type { Action } from 'svelte/action'

const FOCUSABLE =
  'a[href],button:not(:disabled),input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])'

export const focusableIn = (node: HTMLElement): HTMLElement[] =>
  Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement)

/**
 * Keeps Tab / Shift+Tab inside `node`, moves focus in on mount (the element marked
 * `data-autofocus`, else the first focusable) and restores the previous focus on destroy.
 */
export const focusTrap: Action<HTMLElement> = (node) => {
  const previous = document.activeElement as HTMLElement | null
  queueMicrotask(() => {
    const preferred = node.querySelector<HTMLElement>('[data-autofocus]')
    ;(preferred ?? focusableIn(node)[0] ?? node).focus()
  })
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') return
    const items = focusableIn(node)
    if (items.length === 0) {
      event.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (event.shiftKey && (active === first || !node.contains(active))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (active === last || !node.contains(active))) {
      event.preventDefault()
      first.focus()
    }
  }
  node.addEventListener('keydown', onKeydown)
  return {
    destroy: () => {
      node.removeEventListener('keydown', onKeydown)
      previous?.focus?.()
    }
  }
}

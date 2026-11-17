import type { Action } from 'svelte/action'
import { logicallyContains } from './portal'

/**
 * Calls `handler` when a pointer press lands outside `node` (and outside any `ignore` element). A popup that
 * `portal` moved to the popup layer still counts as inside the element it was rendered in.
 */
export const clickOutside: Action<HTMLElement, { handler: () => void; ignore?: HTMLElement | null }> = (
  node,
  params
) => {
  let current = params
  const onDown = (event: PointerEvent): void => {
    const target = event.target as Node
    if (logicallyContains(node, target) || (current?.ignore && logicallyContains(current.ignore, target))) return
    current?.handler()
  }
  document.addEventListener('pointerdown', onDown, true)
  return {
    update: (next) => {
      current = next
    },
    destroy: () => document.removeEventListener('pointerdown', onDown, true)
  }
}

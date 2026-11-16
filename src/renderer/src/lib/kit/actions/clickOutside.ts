import type { Action } from 'svelte/action'

/** Calls `handler` when a pointer press lands outside `node` (and outside any `ignore` element). */
export const clickOutside: Action<HTMLElement, { handler: () => void; ignore?: HTMLElement | null }> = (
  node,
  params
) => {
  let current = params
  const onDown = (event: PointerEvent): void => {
    const target = event.target as Node
    if (node.contains(target) || current?.ignore?.contains(target)) return
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

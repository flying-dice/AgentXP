import type { Action } from 'svelte/action'

/**
 * The popup layer: menus, drop-down lists and palettes are moved here (the end of `<body>`), above every window,
 * the top bar and the taskbar, as Windows draws menus on top of everything. Inside a window they would be trapped
 * in the window's stacking context, under the expanded top bar.
 */
export const POPUP_LAYER_Z = 150000

/** Popup element -> the element it was rendered in, so "inside" still means inside its owner after the move. */
const owners = new WeakMap<Element, Element>()

function layer(): HTMLElement {
  let el = document.getElementById('xp-popup-layer')
  if (!el) {
    el = document.createElement('div')
    el.id = 'xp-popup-layer'
    el.style.cssText = `position:fixed;inset:0;width:0;height:0;overflow:visible;z-index:${POPUP_LAYER_Z};`
    document.body.appendChild(el)
  }
  return el
}

/** Moves the node to the popup layer while it lives (`use:portal`, or `use:portal={false}` to keep it in place). */
export const portal: Action<HTMLElement, boolean | undefined> = (node, enabled = true) => {
  const home = node.parentElement
  const move = (on: boolean): void => {
    if (on && home) {
      owners.set(node, home)
      layer().appendChild(node)
    }
  }
  move(enabled !== false)
  return {
    destroy: () => {
      owners.delete(node)
      node.remove()
    }
  }
}

/** `container.contains(target)`, following popups back to the element they were rendered in. */
export function logicallyContains(container: Node, target: Node | null): boolean {
  let n: Node | null = target
  while (n) {
    if (n === container) return true
    const owner = n instanceof Element ? owners.get(n) : undefined
    n = owner ?? n.parentNode
  }
  return false
}

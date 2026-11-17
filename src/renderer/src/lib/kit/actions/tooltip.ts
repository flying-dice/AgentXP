/**
 * A WinXP tooltip for any element without a wrapper: `use:tooltip={'Save the file'}`.
 *
 * The browser's own `title` tooltip waits one second or more. This one shows after `TOOLTIP_DELAY_MS` (under half a
 * second, UX-45), follows the same look as the kit `ToolTip` atom, hides on leave, press, Escape and blur, and stays
 * inside the viewport. An empty text shows nothing.
 */
export const TOOLTIP_DELAY_MS = 400

export function tooltip(node: HTMLElement, text: string | undefined): { update(next: string | undefined): void; destroy(): void } {
  let current = text
  let timer: ReturnType<typeof setTimeout> | undefined
  let tip: HTMLDivElement | null = null

  function hide(): void {
    clearTimeout(timer)
    tip?.remove()
    tip = null
  }

  function show(x: number, y: number): void {
    if (!current) return
    hide()
    tip = document.createElement('div')
    tip.setAttribute('role', 'tooltip')
    tip.setAttribute('data-testid', 'tooltip')
    tip.textContent = current
    Object.assign(tip.style, {
      position: 'fixed',
      zIndex: '2000',
      maxWidth: '300px',
      padding: '3px 5px 4px',
      border: '1px solid #767676',
      borderRadius: '2px',
      background: 'linear-gradient(#fff, #e4e5f0)',
      boxShadow: '2px 2px 3px rgba(0, 0, 0, 0.25)',
      color: '#575757',
      font: 'var(--xp-font)',
      pointerEvents: 'none',
      whiteSpace: 'pre-wrap',
      left: '0px',
      top: '0px'
    })
    document.body.appendChild(tip)
    const left = Math.max(0, Math.min(x, window.innerWidth - tip.offsetWidth - 2))
    const top = y + tip.offsetHeight > window.innerHeight ? Math.max(0, y - tip.offsetHeight - 28) : y
    tip.style.left = `${left}px`
    tip.style.top = `${top}px`
  }

  const schedule = (x: number, y: number): void => {
    clearTimeout(timer)
    if (current) timer = setTimeout(() => show(x, y), TOOLTIP_DELAY_MS)
  }
  const onEnter = (event: PointerEvent): void => schedule(event.clientX, event.clientY + 20)
  const onFocus = (): void => {
    if (!node.matches(':focus-visible')) return
    const r = node.getBoundingClientRect()
    schedule(r.left, r.bottom + 2)
  }
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') hide()
  }

  node.addEventListener('pointerenter', onEnter)
  node.addEventListener('pointerleave', hide)
  node.addEventListener('pointerdown', hide)
  node.addEventListener('focus', onFocus)
  node.addEventListener('blur', hide)
  node.addEventListener('keydown', onKey)

  return {
    update(next) {
      current = next
      if (!next) hide()
    },
    destroy() {
      hide()
      node.removeEventListener('pointerenter', onEnter)
      node.removeEventListener('pointerleave', hide)
      node.removeEventListener('pointerdown', hide)
      node.removeEventListener('focus', onFocus)
      node.removeEventListener('blur', hide)
      node.removeEventListener('keydown', onKey)
    }
  }
}

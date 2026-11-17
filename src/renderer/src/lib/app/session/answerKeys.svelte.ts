/** Keyboard behaviour both permission dialogs share: Alt shows the access keys, Left and Right move between the answers. */

/** True while Alt is held (the dialogs underline the access keys then, like a Windows XP dialog box). */
export class AltHeld {
  held = $state(false)

  readonly keydown = (event: KeyboardEvent): void => {
    if (event.key === 'Alt') this.held = true
  }
  readonly keyup = (event: KeyboardEvent): void => {
    if (event.key === 'Alt') this.held = false
  }
  readonly reset = (): void => {
    this.held = false
  }
}

/**
 * Left and Up go to the previous answer, Right and Down to the next one; the answers are the `[data-decision]` buttons
 * inside the `[data-answers]` group the key press happened in. Returns true when it moved the focus.
 */
export function moveBetweenAnswers(event: KeyboardEvent): boolean {
  const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : 0
  if (step === 0 || event.altKey || event.ctrlKey || event.metaKey) return false
  const group = event.target instanceof Element ? event.target.closest('[data-answers]') : null
  if (!group) return false
  const buttons = [...group.querySelectorAll<HTMLElement>('[data-decision]')]
  const at = buttons.findIndex((b) => b === document.activeElement || b.contains(document.activeElement))
  if (buttons.length < 2 || at < 0) return false
  event.preventDefault()
  buttons[(at + step + buttons.length) % buttons.length]?.focus()
  return true
}

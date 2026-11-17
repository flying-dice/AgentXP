/** How long a report waits for its echo before views from outside count again (an echo that never comes must not block them). */
export const ECHO_WAIT_MS = 2000

/**
 * Two-way view state without loops. An app reports its own changes with `report` (or remembers a view without sending
 * it with `mark`) and reacts to views that arrive from outside (the agent, the shell) with `isExternal`. A view that
 * equals the last one seen, reported or received, is not external, so an echo of our own report never triggers a reload.
 *
 * Views arrive in the order main applied them. Until the echo of a report arrives, every view that differs from it was
 * applied in main before the report, so it is older than what the app shows: it is ignored. Otherwise a view pushed just
 * before the user acted (the empty view of a window that just opened, while the user already opened a file) would undo
 * the user's change for a moment, and anything done in that moment (a line selection) would be lost.
 */
export class ViewSync<V> {
  private last: string | null = null
  /** The report whose echo has not arrived yet, and when it was sent. */
  private pending: { key: string; at: number } | null = null
  private readonly key: (view: V) => string

  /** `key` serialises the parts of the view the app reacts to. */
  constructor(
    key: (view: V) => string,
    private readonly now: () => number = () => Date.now()
  ) {
    this.key = key
  }

  /** True the first time a view with a new key is seen (and remembers it); false for a view older than a pending report. */
  isExternal(view: V): boolean {
    const key = this.key(view)
    if (this.pending) {
      if (key === this.pending.key) {
        this.pending = null
        this.last = key
        return false
      }
      if (this.now() - this.pending.at < ECHO_WAIT_MS) return false
      this.pending = null
    }
    if (key === this.last) return false
    this.last = key
    return true
  }

  /** Remembers a view without sending it; false when it equals the last one (nothing changed). */
  mark(view: V): boolean {
    const key = this.key(view)
    if (key === this.last) return false
    this.last = key
    return true
  }

  /** Remembers a view the app is about to send to main (and waits for its echo); false when nothing changed (send nothing). */
  report(view: V): boolean {
    if (!this.mark(view)) return false
    this.pending = { key: this.key(view), at: this.now() }
    return true
  }
}

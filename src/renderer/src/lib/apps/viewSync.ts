/**
 * Two-way view state without loops. An app reports its own changes with `mark` (which says whether
 * anything changed) and reacts to views that arrive from outside (the agent, the shell) with
 * `isExternal`. A view that equals the last one seen, reported or received, is not external, so an
 * echo of our own report never triggers a reload.
 */
export class ViewSync<V> {
  private last: string | null = null
  private readonly key: (view: V) => string

  /** `key` serialises the parts of the view the app reacts to. */
  constructor(key: (view: V) => string) {
    this.key = key
  }

  /** True the first time a view with a new key is seen (and remembers it). */
  isExternal(view: V): boolean {
    const key = this.key(view)
    if (key === this.last) return false
    this.last = key
    return true
  }

  /** Remembers a view the app is about to report; false when it equals the last one (nothing to report). */
  mark(view: V): boolean {
    return this.isExternal(view)
  }
}

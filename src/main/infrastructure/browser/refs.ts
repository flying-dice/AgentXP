/**
 * Refs: the numbers the agent passes to `browser_click` and friends. A ref names one DOM node of the page (frame id plus
 * `backendNodeId`), is handed out once per node (reading again returns the same number) and stays valid until the
 * page navigates. Pure bookkeeping, no CDP.
 */

export interface RefTarget {
  /** The frame the node lives in (CDP frame id). */
  frameId: string
  backendNodeId: number
  role: string
  name: string
}

export class RefTable {
  private readonly byKey = new Map<string, number>()
  private readonly byRef = new Map<number, RefTarget>()
  private next = 1

  /** The ref of a node: the existing one, or a new one. */
  ref(target: RefTarget): number {
    const key = `${target.frameId}:${target.backendNodeId}`
    const known = this.byKey.get(key)
    if (known !== undefined) {
      this.byRef.set(known, target) // keep role and name fresh
      return known
    }
    const ref = this.next++
    this.byKey.set(key, ref)
    this.byRef.set(ref, target)
    return ref
  }

  get(ref: number): RefTarget | undefined {
    return this.byRef.get(ref)
  }

  get size(): number {
    return this.byRef.size
  }

  /** A navigation invalidates every ref. Numbers are not reused, so an old number can never name a new node. */
  reset(): void {
    this.byKey.clear()
    this.byRef.clear()
  }
}

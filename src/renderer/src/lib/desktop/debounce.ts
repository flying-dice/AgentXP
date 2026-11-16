/** Debounces calls per key; the latest value of a key wins. */
export class KeyedDebouncer<K, V> {
  private readonly timers = new Map<K, ReturnType<typeof setTimeout>>()
  private readonly latest = new Map<K, V>()

  constructor(
    private readonly delay: number,
    private readonly run: (key: K, value: V) => void
  ) {}

  push(key: K, value: V): void {
    this.latest.set(key, value)
    clearTimeout(this.timers.get(key))
    this.timers.set(
      key,
      setTimeout(() => this.fire(key), this.delay)
    )
  }

  /** Runs the pending call of `key` now. */
  flush(key: K): void {
    if (this.timers.has(key)) this.fire(key)
  }

  /** Drops the pending call of `key` (its window closed). */
  cancel(key: K): void {
    clearTimeout(this.timers.get(key))
    this.timers.delete(key)
    this.latest.delete(key)
  }

  flushAll(): void {
    for (const key of [...this.timers.keys()]) this.fire(key)
  }

  dispose(): void {
    for (const t of this.timers.values()) clearTimeout(t)
    this.timers.clear()
    this.latest.clear()
  }

  private fire(key: K): void {
    clearTimeout(this.timers.get(key))
    this.timers.delete(key)
    const value = this.latest.get(key)
    this.latest.delete(key)
    if (value !== undefined) this.run(key, value)
  }
}

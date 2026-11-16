/** An unbounded multi-producer, single-consumer queue that can be iterated asynchronously and closed. */
export class AsyncQueue<T> implements AsyncIterable<T> {
  private readonly items: T[] = []
  private waiting: (() => void) | null = null
  private closed = false

  push(item: T): void {
    if (this.closed) return
    this.items.push(item)
    this.wake()
  }

  /** Items already queued are still delivered; afterwards the iteration ends. */
  close(): void {
    this.closed = true
    this.wake()
  }

  get isClosed(): boolean {
    return this.closed
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<T> {
    for (;;) {
      const next = this.items.shift()
      if (next !== undefined) {
        yield next
      } else if (this.closed) {
        return
      } else {
        await new Promise<void>((resolve) => (this.waiting = resolve))
      }
    }
  }

  private wake(): void {
    const resolve = this.waiting
    this.waiting = null
    resolve?.()
  }
}

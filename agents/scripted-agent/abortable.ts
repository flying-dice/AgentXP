/** Abort-aware waiting helpers shared by the runner and the step actions. */

export class CancelledError extends Error {
  constructor() {
    super('cancelled')
    this.name = 'CancelledError'
  }
}

export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new CancelledError()
}

/** Rejects with CancelledError when `signal` aborts first; the underlying work is not stopped. */
export function abortable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    work.catch(() => undefined)
    return Promise.reject(new CancelledError())
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(new CancelledError())
    signal.addEventListener('abort', onAbort, { once: true })
    work.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}

export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  throwIfAborted(signal)
  if (ms <= 0) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = (): void => {
      clearTimeout(timer)
      reject(new CancelledError())
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

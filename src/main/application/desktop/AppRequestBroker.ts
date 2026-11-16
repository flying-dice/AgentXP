import { randomUUID } from 'node:crypto'
import type { AppResponse } from '@shared/desktop'
import type { Id } from '@shared/models'
import { AppError } from '../errors'
import type { EventPublisher } from '../ports'

export const APP_REQUEST_TIMEOUT_MS = 10_000

interface Pending {
  resolve(result: unknown): void
  reject(error: Error): void
  timer: ReturnType<typeof setTimeout>
}

/**
 * Asks an app window in the renderer something only it knows (paint_read renders the canvas,
 * wordpad_read has the unsaved text). The request is pushed to the window of the desktop as
 * `desktop.appRequest`; the app answers with `desktop.respondAppRequest`.
 */
export class AppRequestBroker {
  private readonly pending = new Map<string, Pending>()

  constructor(
    private readonly events: EventPublisher,
    private readonly newId: () => string = randomUUID
  ) {}

  request(desktopId: Id, windowId: Id, method: string, params: unknown, timeoutMs: number = APP_REQUEST_TIMEOUT_MS): Promise<unknown> {
    const requestId = this.newId()
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId)
        reject(new AppError(`The app (window ${windowId}) did not answer "${method}" within ${Math.round(timeoutMs / 1000)} s. Is the window still open and responsive?`))
      }, timeoutMs)
      this.pending.set(requestId, { resolve, reject, timer })
      this.events.publish('desktop.appRequest', { requestId, desktopId, windowId, method, params })
    })
  }

  /** The app's answer. Late or unknown answers are ignored. */
  respond(response: AppResponse): void {
    const entry = this.pending.get(response.requestId)
    if (!entry) return
    this.pending.delete(response.requestId)
    clearTimeout(entry.timer)
    if (response.ok) entry.resolve(response.result)
    else entry.reject(new AppError(response.error))
  }

  /** Rejects everything still waiting (shutdown). */
  dispose(): void {
    for (const [id, entry] of this.pending) {
      clearTimeout(entry.timer)
      entry.reject(new AppError('Agent7 is shutting down'))
      this.pending.delete(id)
    }
  }
}

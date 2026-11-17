/**
 * App requests: main asks an app of this desktop to do something only the renderer can (render the
 * paint canvas, read unsaved WordPad text). One subscription per desktop page dispatches each
 * `desktop.appRequest` to the handler the target window registered and answers with
 * `desktop.respondAppRequest`.
 */
import type { AgentXPApi } from '@shared/ipc'
import type { Id } from '@shared/models'
import type { AppRequest, AppResponse } from '@shared/desktop'

export type AppRequestHandler = (method: string, params: unknown) => Promise<unknown>

const handlers = new Map<Id, AppRequestHandler>()

/** Registers the handler of a window; returns the unregister function (call it on destroy). */
export function registerAppRequestHandler(windowId: Id, handler: AppRequestHandler): () => void {
  handlers.set(windowId, handler)
  return () => {
    if (handlers.get(windowId) === handler) handlers.delete(windowId)
  }
}

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/** Runs one request against the registered handler. Never throws: failures become `ok: false`. */
export async function handleAppRequest(request: AppRequest): Promise<AppResponse> {
  const handler = handlers.get(request.windowId)
  if (!handler) return { requestId: request.requestId, ok: false, error: `Window ${request.windowId} is not open or does not handle requests.` }
  try {
    return { requestId: request.requestId, ok: true, result: await handler(request.method, request.params) }
  } catch (error) {
    return { requestId: request.requestId, ok: false, error: messageOf(error) }
  }
}

/** Subscribes to `desktop.appRequest` and answers every request. Returns the stop function. */
export function startAppRequests(api: Pick<AgentXPApi, 'on' | 'desktop'>): () => void {
  return api.on('desktop.appRequest', (request) => {
    void handleAppRequest(request).then((response) => api.desktop.respondAppRequest(response)).catch(() => {})
  })
}

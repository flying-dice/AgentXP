import type { AgentIdentity } from '@shared/identity'
import type { Id } from '@shared/models'
import type { ToolHandlers } from './catalog'
import { parseImageDataUrl } from './dataUrl'
import type { AppRequests, DesktopOps } from './ports'
import { attempt, imageResult, textResult } from './types'
import { pickWindow } from './windows'

export interface PaintToolsDeps {
  desktops: Pick<DesktopOps, 'state'>
  requests: AppRequests
  /** Who draws (`agentIdentity`): the Paint window's agent cursor carries the name and colour. */
  identity?: (sessionId: Id) => AgentIdentity
}

/** paint_draw, paint_read, paint_clear, paint_resize: the renderer's Paint window does the drawing (AppRequest). */
export function createPaintTools({ desktops, requests, identity }: PaintToolsDeps): ToolHandlers<'paint_draw' | 'paint_read' | 'paint_clear' | 'paint_resize'> {
  const ask = (desktopId: Id, windowId: number | undefined, method: string, params: unknown): Promise<unknown> => {
    const window = pickWindow(desktops.state(desktopId), 'paint', windowId)
    return requests.request(desktopId, window.id, method, params)
  }

  return {
    paint_draw: ({ ops, windowId }, { desktopId, sessionId }) =>
      attempt(async () => {
        await ask(desktopId, windowId, 'draw', { ops, ...(identity ? { agent: identity(sessionId) } : {}) })
        return textResult(`Drew ${ops.length} operation${ops.length === 1 ? '' : 's'}. Call paint_read to see the result.`)
      }),

    paint_read: ({ windowId }, { desktopId }) =>
      attempt(async () => {
        const { data, mimeType } = parseImageDataUrl(await ask(desktopId, windowId, 'read', {}))
        return imageResult(data, mimeType, 'The Agent Paint canvas.')
      }),

    paint_clear: ({ color, windowId }, { desktopId }) =>
      attempt(async () => {
        await ask(desktopId, windowId, 'draw', { ops: [{ type: 'clear', ...(color ? { color } : {}) }] })
        return textResult('Cleared the canvas.')
      }),

    paint_resize: ({ width, height, windowId }, { desktopId }) =>
      attempt(async () => {
        await ask(desktopId, windowId, 'resize', { width, height })
        return textResult(`The canvas is now ${width}x${height}.`)
      })
  }
}

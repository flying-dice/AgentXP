import type { Message } from '@ag-ui/core'
import { A2UI_ACTIVITY_TYPE, type A2uiSurfaceActivity } from '@shared/agui-state'

/** An A2UI surface as a view of its activity message. */
export interface SurfaceActivity {
  /** The AG-UI activity message id (also the key to place it among the messages). */
  messageId: string
  surfaceId: string
  /** The replayable A2UI server messages that build the surface. */
  messages: A2uiSurfaceActivity['messages']
}

const isSurfaceContent = (content: unknown): content is A2uiSurfaceActivity =>
  typeof content === 'object' &&
  content !== null &&
  typeof (content as A2uiSurfaceActivity).surfaceId === 'string' &&
  Array.isArray((content as A2uiSurfaceActivity).messages)

/** The live A2UI surfaces by surface id, in message order. Deleted surfaces are left out. */
export function surfacesOf(messages: readonly Message[]): Map<string, SurfaceActivity> {
  const surfaces = new Map<string, SurfaceActivity>()
  for (const message of messages) {
    if (message.role !== 'activity' || message.activityType !== A2UI_ACTIVITY_TYPE) continue
    if (!isSurfaceContent(message.content)) continue
    if (message.content.deleted) {
      surfaces.delete(message.content.surfaceId)
      continue
    }
    surfaces.set(message.content.surfaceId, {
      messageId: message.id,
      surfaceId: message.content.surfaceId,
      messages: message.content.messages
    })
  }
  return surfaces
}

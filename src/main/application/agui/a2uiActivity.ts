import { EventType } from '@ag-ui/core'
import type { A2uiSurfaceDto } from '@shared/a2ui'
import { a2uiSurfaceToMessages } from '@shared/a2ui/messages'
import { A2UI_ACTIVITY_TYPE, a2uiActivityMessageId, type A2uiSurfaceActivity } from '@shared/agui-state'
import type { AguiEvent } from './AgentEventTranslator'

/** The content of a surface's activity message: the replayable A2UI messages (see `a2uiSurfaceToMessages`). */
export const a2uiSurfaceContent = (surface: A2uiSurfaceDto): A2uiSurfaceActivity => ({
  surfaceId: surface.surfaceId,
  messages: a2uiSurfaceToMessages(surface)
})

/** ACTIVITY_SNAPSHOT that creates or replaces (in place) the activity message of a surface. */
export const surfaceSnapshotEvent = (surface: A2uiSurfaceDto): AguiEvent => ({
  type: EventType.ACTIVITY_SNAPSHOT,
  messageId: a2uiActivityMessageId(surface.surfaceId),
  activityType: A2UI_ACTIVITY_TYPE,
  content: { ...a2uiSurfaceContent(surface) },
  replace: true
})

/**
 * A removed surface is announced with an ACTIVITY_SNAPSHOT (not a delta) that replaces the content with
 * `{ surfaceId, deleted: true, messages: [] }`; the activity message stays in the list so clients can drop it.
 */
export const surfaceRemovedEvent = (surfaceId: string): AguiEvent => ({
  type: EventType.ACTIVITY_SNAPSHOT,
  messageId: a2uiActivityMessageId(surfaceId),
  activityType: A2UI_ACTIVITY_TYPE,
  content: { surfaceId, deleted: true, messages: [] } satisfies A2uiSurfaceActivity,
  replace: true
})

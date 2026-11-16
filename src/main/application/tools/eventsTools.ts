import type { ProtocolEventDto } from '@shared/desktop'
import type { ProtocolEventLog } from '../events/ProtocolEventLog'
import type { ToolHandlers } from './catalog'
import { textResult } from './types'

export interface EventsToolsDeps {
  log: Pick<ProtocolEventLog, 'query'>
}

const PREVIEW = 120

/** One compact line: `#12 12:00:01 error acp in session/prompt (response) chat 3 {"stopReason":...}`. */
export function formatEvent(e: ProtocolEventDto): string {
  const preview = e.payload.replace(/\s+/g, ' ')
  return `#${e.id} ${e.at.slice(11, 19)} ${e.level} ${e.source} ${e.direction} ${e.name}${e.sessionId === null ? '' : ` chat ${e.sessionId}`} ${preview.length > PREVIEW ? `${preview.slice(0, PREVIEW)}...` : preview}`
}

/** events_query. */
export function createEventsTools({ log }: EventsToolsDeps): ToolHandlers<'events_query'> {
  return {
    events_query: async ({ sessionId, source, level, text, limit }, { desktopId }) => {
      const found = log.query({ desktopId, sessionId, source, level, text, limit: limit ?? 50 })
      return textResult(found.length === 0 ? 'No matching events.' : found.map(formatEvent).join('\n'))
    }
  }
}

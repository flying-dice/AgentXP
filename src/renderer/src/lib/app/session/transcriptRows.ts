import { contentToText, type Message } from '@ag-ui/core'
import { STOP_NOTICE_ACTIVITY_TYPE } from '@shared/agui-state'
import type { SurfaceActivity } from '../../agui/activities'

export type TranscriptRow =
  | { kind: 'user'; id: string; text: string; attachments: string[] }
  | { kind: 'agent'; id: string; text: string }
  | { kind: 'reasoning'; id: string; text: string }
  | { kind: 'tool'; id: string; toolCallId: string; name: string; rawInput: string; result: string | null }
  | { kind: 'surface'; id: string; surfaceId: string }
  | { kind: 'stop'; id: string; reason: string }

const baseName = (path: string): string => path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? path

function fileNameOfUrl(value: string): string {
  try {
    return baseName(decodeURIComponent(value.replace(/^file:\/\//, '')))
  } catch {
    return baseName(value)
  }
}

/** Text and attached file names of a user message (string or AG-UI content parts). */
export function userParts(content: Extract<Message, { role: 'user' }>['content']): { text: string; attachments: string[] } {
  if (typeof content === 'string') return { text: content, attachments: [] }
  const text: string[] = []
  const attachments: string[] = []
  for (const part of content ?? []) {
    if (part.type === 'text') text.push(part.text)
    else if ('source' in part && part.source.type === 'url') attachments.push(fileNameOfUrl(part.source.value))
  }
  return { text: text.join('\n'), attachments }
}

const toolResults = (messages: readonly Message[]): Map<string, string> => {
  const results = new Map<string, string>()
  for (const m of messages) if (m.role === 'tool') results.set(m.toolCallId, contentToText(m.content))
  return results
}

/**
 * Orders AG-UI messages into transcript rows: user and assistant text, reasoning, one row per
 * assistant tool call (carrying its result message), and A2UI surfaces at the place of their
 * (latest) activity message, and stop notices (a turn that ended with a refusal or output limit). Tool, system and other activity messages produce no row of their own.
 */
export function buildTranscriptRows(messages: readonly Message[], surfaces: ReadonlyMap<string, SurfaceActivity>): TranscriptRow[] {
  const results = toolResults(messages)
  const liveSurfaces = new Map([...surfaces.values()].map((s) => [s.messageId, s]))
  const rows: TranscriptRow[] = []
  for (const m of messages) {
    if (m.role === 'user') {
      rows.push({ kind: 'user', id: m.id, ...userParts(m.content) })
    } else if (m.role === 'assistant') {
      if (m.content?.trim()) rows.push({ kind: 'agent', id: m.id, text: m.content })
      for (const call of m.toolCalls ?? []) {
        rows.push({
          kind: 'tool',
          id: `${m.id}:${call.id}`,
          toolCallId: call.id,
          name: call.function.name,
          rawInput: call.function.arguments,
          result: results.get(call.id) ?? null
        })
      }
    } else if (m.role === 'reasoning') {
      if (m.content.trim()) rows.push({ kind: 'reasoning', id: m.id, text: m.content })
    } else if (m.role === 'activity') {
      const surface = liveSurfaces.get(m.id)
      if (surface) rows.push({ kind: 'surface', id: m.id, surfaceId: surface.surfaceId })
      else if (m.activityType === STOP_NOTICE_ACTIVITY_TYPE) {
        const reason = (m.content as { reason?: unknown }).reason
        if (typeof reason === 'string') rows.push({ kind: 'stop', id: m.id, reason })
      }
    }
  }
  return rows
}

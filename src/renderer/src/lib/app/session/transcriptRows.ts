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

/** The rows that fold into an activity group: what the agent did on the way to its answer. */
export type WorkRow = Extract<TranscriptRow, { kind: 'agent' | 'reasoning' | 'tool' }>

export type DisplayItem =
  | { kind: 'row'; row: TranscriptRow }
  /** Everything between a user message (or a surface or notice) and the agent's final answer. */
  | { kind: 'activity'; id: string; rows: WorkRow[] }

/**
 * Folds the work of a turn into one group, so the transcript reads as: your message, one collapsed "Thinking" line,
 * the answer. The work is every agent, reasoning and tool row up to the last reasoning or tool row of the turn; the
 * agent text after it is the answer and stays a plain row, as do user, surface and stop rows (which also end the run).
 * A turn without any reasoning or tool row has no group.
 */
export function groupTranscript(rows: readonly TranscriptRow[]): DisplayItem[] {
  const items: DisplayItem[] = []
  let run: WorkRow[] = []
  const flush = (): void => {
    let last = -1
    run.forEach((row, i) => {
      if (row.kind !== 'agent') last = i
    })
    if (last >= 0) items.push({ kind: 'activity', id: `activity:${run[0]!.id}`, rows: run.slice(0, last + 1) })
    for (const row of run.slice(last + 1)) items.push({ kind: 'row', row })
    run = []
  }
  for (const row of rows) {
    if (row.kind === 'agent' || row.kind === 'reasoning' || row.kind === 'tool') run.push(row)
    else {
      flush()
      items.push({ kind: 'row', row })
    }
  }
  flush()
  return items
}

export interface ActivityStats {
  tools: number
  failed: number
  thought: boolean
}

export const activityStats = (rows: readonly WorkRow[], failed: (toolCallId: string) => boolean): ActivityStats => ({
  tools: rows.filter((r) => r.kind === 'tool').length,
  failed: rows.filter((r) => r.kind === 'tool' && failed(r.toolCallId)).length,
  thought: rows.some((r) => r.kind === 'reasoning' || r.kind === 'agent')
})

/** "Thought and used 4 tools", "Used 1 tool, 1 failed", "Thought". */
export function activitySummary({ tools, failed, thought }: ActivityStats): string {
  const used = tools > 0 ? `used ${tools} ${tools === 1 ? 'tool' : 'tools'}` : ''
  const text = thought ? (used ? `Thought and ${used}` : 'Thought') : used.charAt(0).toUpperCase() + used.slice(1)
  return failed > 0 ? `${text}, ${failed} failed` : text
}

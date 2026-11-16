import type { SessionUpdate, ToolCall, ToolCallContent, ToolCallUpdate } from '@agentclientprotocol/sdk'
import type { ToolCallContentDto, ToolCallStatus, ToolKind } from '@shared/models'
import type { AgentSessionEvent, ToolCallPatch } from '../../domain/agent/AgentSessionEvent'
import { toContentBlockDto } from './contentMapping'

const TOOL_KINDS: readonly ToolKind[] = [
  'read', 'edit', 'delete', 'move', 'search', 'execute', 'think', 'fetch', 'switch_mode', 'other'
]
const TOOL_STATUSES: readonly ToolCallStatus[] = ['pending', 'in_progress', 'completed', 'failed', 'cancelled']

const toToolKind = (kind: string | null | undefined): ToolKind | undefined =>
  kind == null ? undefined : (TOOL_KINDS as readonly string[]).includes(kind) ? (kind as ToolKind) : 'other'

const toStatus = (status: string | null | undefined): ToolCallStatus | undefined =>
  status != null && (TOOL_STATUSES as readonly string[]).includes(status) ? (status as ToolCallStatus) : undefined

/** Raw tool input/output is schemaless: keep strings as they are, JSON-encode the rest. */
export function stringifyRaw(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function toToolCallContentDto(content: ToolCallContent): ToolCallContentDto {
  switch (content.type) {
    case 'content':
      return { kind: 'content', block: toContentBlockDto(content.content) }
    case 'diff':
      return { kind: 'diff', path: content.path, oldText: content.oldText ?? null, newText: content.newText }
    case 'terminal':
      return { kind: 'terminal', terminalId: content.terminalId }
  }
}

/** Maps the changed fields of a tool call; absent/null fields stay absent. */
export function toToolCallPatch(update: ToolCallUpdate | ToolCall): ToolCallPatch {
  const patch: ToolCallPatch = {}
  if (update.title != null) patch.title = update.title
  const toolKind = toToolKind(update.kind)
  if (toolKind) patch.toolKind = toolKind
  const status = toStatus(update.status)
  if (status) patch.status = status
  const rawInput = stringifyRaw(update.rawInput)
  if (rawInput !== undefined) patch.rawInput = rawInput
  const rawOutput = stringifyRaw(update.rawOutput)
  if (rawOutput !== undefined) patch.rawOutput = rawOutput
  if (update.locations) patch.locations = update.locations.map((l) => ({ path: l.path, line: l.line ?? null }))
  if (update.content) patch.contents = update.content.map(toToolCallContentDto)
  return patch
}

function toToolCallCreated(update: ToolCall): AgentSessionEvent {
  const patch = toToolCallPatch(update)
  return {
    type: 'tool_call_created',
    toolCallId: update.toolCallId,
    title: update.title,
    toolKind: patch.toolKind ?? 'other',
    status: patch.status ?? 'pending',
    rawInput: patch.rawInput ?? null,
    rawOutput: patch.rawOutput ?? null,
    locations: patch.locations ?? [],
    contents: patch.contents ?? []
  }
}

/**
 * Normalises one ACP `session/update` payload into a harness event.
 * Returns null for updates the harness does not model (config options,
 * compaction, notices, unknown future variants).
 */
export function mapSessionUpdate(update: SessionUpdate): AgentSessionEvent | null {
  switch (update.sessionUpdate) {
    case 'user_message_chunk':
      return { type: 'message_chunk', role: 'user', block: toContentBlockDto(update.content) }
    case 'agent_message_chunk':
      return { type: 'message_chunk', role: 'agent', block: toContentBlockDto(update.content) }
    case 'agent_thought_chunk':
      return { type: 'message_chunk', role: 'thought', block: toContentBlockDto(update.content) }
    case 'tool_call':
      return toToolCallCreated(update)
    case 'tool_call_update':
      return { type: 'tool_call_updated', toolCallId: update.toolCallId, patch: toToolCallPatch(update) }
    case 'plan':
      return {
        type: 'plan_replaced',
        entries: update.entries.map((e) => ({ content: e.content, priority: e.priority, status: e.status }))
      }
    case 'current_mode_update':
      return { type: 'mode_changed', modeId: update.currentModeId }
    case 'available_commands_update':
      return {
        type: 'commands_updated',
        commands: update.availableCommands.map((c) => ({
          name: c.name,
          description: c.description,
          hint: c.input?.hint ?? null
        }))
      }
    case 'usage_update':
      return { type: 'usage_updated', contextUsed: update.used, contextSize: update.size }
    case 'session_info_update':
      return update.title === undefined ? null : { type: 'session_info_updated', title: update.title }
    default:
      return null
  }
}

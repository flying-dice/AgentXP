import type {
  AvailableCommandDto,
  ContentBlockDto,
  MessageRole,
  TaskPriority,
  TaskStatus,
  ToolCallContentDto,
  ToolCallLocationDto,
  ToolCallStatus,
  ToolKind
} from '@shared/models'

export interface PlanEntry {
  content: string
  priority: TaskPriority
  status: TaskStatus
}

/**
 * The fields of a tool call that can change over its life. Every field is
 * optional: a missing field means "unchanged". Raw input/output are JSON text.
 */
export interface ToolCallPatch {
  title?: string
  toolKind?: ToolKind
  status?: ToolCallStatus
  rawInput?: string
  rawOutput?: string
  locations?: ToolCallLocationDto[]
  contents?: ToolCallContentDto[]
}

export interface MessageChunkEvent {
  type: 'message_chunk'
  role: MessageRole
  block: ContentBlockDto
}

export interface ToolCallCreatedEvent {
  type: 'tool_call_created'
  toolCallId: string
  title: string
  toolKind: ToolKind
  status: ToolCallStatus
  rawInput: string | null
  rawOutput: string | null
  locations: ToolCallLocationDto[]
  contents: ToolCallContentDto[]
}

export interface ToolCallUpdatedEvent {
  type: 'tool_call_updated'
  toolCallId: string
  patch: ToolCallPatch
}

export interface PlanReplacedEvent {
  type: 'plan_replaced'
  entries: PlanEntry[]
}

export interface ModeChangedEvent {
  type: 'mode_changed'
  modeId: string
}

export interface CommandsUpdatedEvent {
  type: 'commands_updated'
  commands: AvailableCommandDto[]
}

export interface UsageUpdatedEvent {
  type: 'usage_updated'
  contextUsed: number
  contextSize: number
}

export interface SessionInfoUpdatedEvent {
  type: 'session_info_updated'
  /** null when the agent cleared the title. Undefined updates are not emitted. */
  title: string | null
}

/** ACP `session/update` notifications, normalised into harness terms. */
export type AgentSessionEvent =
  | MessageChunkEvent
  | ToolCallCreatedEvent
  | ToolCallUpdatedEvent
  | PlanReplacedEvent
  | ModeChangedEvent
  | CommandsUpdatedEvent
  | UsageUpdatedEvent
  | SessionInfoUpdatedEvent

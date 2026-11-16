import type {
  ContentBlockDto,
  Id,
  MessageRole,
  ToolCallContentDto,
  ToolCallLocationDto,
  ToolCallStatus,
  ToolKind,
  TranscriptEntryDto
} from '@shared/models'

export type MessageEntryDto = Extract<TranscriptEntryDto, { kind: 'message' }>
export type ToolCallEntryDto = Extract<TranscriptEntryDto, { kind: 'tool_call' }>

export interface ChunkResult {
  entry: MessageEntryDto
  /** True when a new message entry was started, false when the last one was extended. */
  created: boolean
}

/**
 * Create-or-update payload for a tool call. On create `title`, `toolKind` and
 * `status` default to ''/'other'/'pending'. On update only provided fields change;
 * `locations` and `contents`, when provided, replace the stored lists.
 */
export interface ToolCallUpsert {
  toolCallId: string
  title?: string
  toolKind?: ToolKind
  status?: ToolCallStatus
  rawInput?: string | null
  rawOutput?: string | null
  locations?: ToolCallLocationDto[]
  contents?: ToolCallContentDto[]
}

export interface UpsertResult {
  entry: ToolCallEntryDto
  created: boolean
}

export interface TranscriptRepository {
  /** All entries of the session ordered by `seq`. */
  list(sessionId: Id): TranscriptEntryDto[]
  get(entryId: Id): TranscriptEntryDto | null
  /** Appends a complete message as a new entry. */
  appendMessage(sessionId: Id, role: MessageRole, blocks: ContentBlockDto[]): MessageEntryDto
  /**
   * Streams a chunk: extends the last entry when it is a message of the same role
   * (adjacent text blocks are merged), otherwise starts a new message.
   */
  appendChunk(sessionId: Id, role: MessageRole, block: ContentBlockDto): ChunkResult
  upsertToolCall(sessionId: Id, input: ToolCallUpsert): UpsertResult
  findToolCall(sessionId: Id, toolCallId: string): ToolCallEntryDto | null
  /** Deletes every entry (and their blocks, tool calls, permissions, surfaces) of the session. */
  clear(sessionId: Id): void
}

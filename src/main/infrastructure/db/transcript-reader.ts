import type { Database, Statement } from 'better-sqlite3'
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
import { BLOCK_COLUMNS, rowToBlock, type BlockRow } from './content-block-mapper'
import { PermissionReader } from './permission-reader'
import { groupBy, idsJson } from './sql'

interface EntryRow {
  id: number
  seq: number
  kind: TranscriptEntryDto['kind']
  created_at: string
}
interface MessageRow {
  entry_id: number
  role: MessageRole
}
type OwnedBlockRow = BlockRow & { owner: number }
interface ToolCallRow {
  entry_id: number
  acp_tool_call_id: string
  title: string
  kind: ToolKind
  status: ToolCallStatus
  raw_input: string | null
  raw_output: string | null
}
interface LocationRow {
  tool_call_id: number
  path: string
  line: number | null
}
interface ContentRow {
  id: number
  tool_call_id: number
  kind: ToolCallContentDto['kind']
  path: string | null
  old_text: string | null
  new_text: string | null
  terminal_id: string | null
}
interface SurfaceRow {
  entry_id: number
  surface_id: string
}

const IN_IDS = '(SELECT value FROM json_each(?))'
const TOOL_CONTENT_IDS = `(SELECT id FROM tool_call_contents WHERE tool_call_id IN ${IN_IDS})`

/** Everything needed to turn a set of transcript entry ids into DTOs, batched per table. */
interface Related {
  messages: Map<number, MessageRow[]>
  messageBlocks: Map<number, OwnedBlockRow[]>
  toolCalls: Map<number, ToolCallRow[]>
  locations: Map<number, LocationRow[]>
  contents: Map<number, ContentRow[]>
  contentBlocks: Map<number, OwnedBlockRow[]>
  surfaces: Map<number, SurfaceRow[]>
  permissions: ReturnType<PermissionReader['latestByToolCallEntry']>
}

export class TranscriptReader {
  private readonly entriesBySession: Statement<[Id], { id: number }>
  private readonly entries: Statement<[string], EntryRow>
  private readonly messages: Statement<[string], MessageRow>
  private readonly messageBlocks: Statement<[string], OwnedBlockRow>
  private readonly toolCalls: Statement<[string], ToolCallRow>
  private readonly locations: Statement<[string], LocationRow>
  private readonly contents: Statement<[string], ContentRow>
  private readonly contentBlocks: Statement<[string], OwnedBlockRow>
  private readonly surfaces: Statement<[string], SurfaceRow>
  private readonly permissions: PermissionReader

  constructor(db: Database) {
    this.permissions = new PermissionReader(db)
    this.entriesBySession = db.prepare('SELECT id FROM transcript_entries WHERE session_id = ? ORDER BY seq')
    this.entries = db.prepare(
      `SELECT id, seq, kind, created_at FROM transcript_entries WHERE id IN ${IN_IDS} ORDER BY seq`
    )
    this.messages = db.prepare(`SELECT entry_id, role FROM messages WHERE entry_id IN ${IN_IDS}`)
    this.messageBlocks = db.prepare(
      `SELECT message_id AS owner, ${BLOCK_COLUMNS} FROM content_blocks
       WHERE message_id IN ${IN_IDS} ORDER BY message_id, position`
    )
    this.toolCalls = db.prepare(
      `SELECT entry_id, acp_tool_call_id, title, kind, status, raw_input, raw_output
       FROM tool_calls WHERE entry_id IN ${IN_IDS}`
    )
    this.locations = db.prepare(
      `SELECT tool_call_id, path, line FROM tool_call_locations
       WHERE tool_call_id IN ${IN_IDS} ORDER BY tool_call_id, position`
    )
    this.contents = db.prepare(
      `SELECT id, tool_call_id, kind, path, old_text, new_text, terminal_id FROM tool_call_contents
       WHERE tool_call_id IN ${IN_IDS} ORDER BY tool_call_id, position`
    )
    this.contentBlocks = db.prepare(
      `SELECT tool_content_id AS owner, ${BLOCK_COLUMNS} FROM content_blocks
       WHERE tool_content_id IN ${TOOL_CONTENT_IDS} ORDER BY tool_content_id, position`
    )
    this.surfaces = db.prepare(`SELECT entry_id, surface_id FROM a2ui_surfaces WHERE entry_id IN ${IN_IDS}`)
  }

  listBySession(sessionId: Id): TranscriptEntryDto[] {
    return this.load(this.entriesBySession.all(sessionId).map((r) => r.id))
  }

  /** Loads the given entries, ordered by seq. */
  load(ids: readonly Id[]): TranscriptEntryDto[] {
    if (ids.length === 0) return []
    const json = idsJson(ids)
    const related = this.loadRelated(json, ids)
    return this.entries.all(json).map((row) => this.toDto(row, related))
  }

  private loadRelated(json: string, ids: readonly Id[]): Related {
    return {
      messages: groupBy(this.messages.all(json), (r) => r.entry_id),
      messageBlocks: groupBy(this.messageBlocks.all(json), (r) => r.owner),
      toolCalls: groupBy(this.toolCalls.all(json), (r) => r.entry_id),
      locations: groupBy(this.locations.all(json), (r) => r.tool_call_id),
      contents: groupBy(this.contents.all(json), (r) => r.tool_call_id),
      contentBlocks: groupBy(this.contentBlocks.all(json), (r) => r.owner),
      surfaces: groupBy(this.surfaces.all(json), (r) => r.entry_id),
      permissions: this.permissions.latestByToolCallEntry(ids)
    }
  }

  private toDto(entry: EntryRow, related: Related): TranscriptEntryDto {
    const base = { id: entry.id, seq: entry.seq, createdAt: entry.created_at }
    switch (entry.kind) {
      case 'message':
        return { kind: 'message', ...base, ...this.messageFields(entry.id, related) }
      case 'tool_call':
        return { kind: 'tool_call', ...base, ...this.toolCallFields(entry.id, related) }
      case 'a2ui':
        return { kind: 'a2ui', ...base, surfaceId: related.surfaces.get(entry.id)?.[0]?.surface_id ?? '' }
    }
  }

  private messageFields(id: Id, related: Related): { role: MessageRole; blocks: ContentBlockDto[] } {
    return {
      role: related.messages.get(id)?.[0]?.role ?? 'agent',
      blocks: (related.messageBlocks.get(id) ?? []).map(rowToBlock)
    }
  }

  private toolCallFields(id: Id, related: Related) {
    const row = related.toolCalls.get(id)?.[0]
    return {
      toolCallId: row?.acp_tool_call_id ?? '',
      title: row?.title ?? '',
      toolKind: row?.kind ?? 'other',
      status: row?.status ?? 'pending',
      rawInput: row?.raw_input ?? null,
      rawOutput: row?.raw_output ?? null,
      locations: (related.locations.get(id) ?? []).map((l): ToolCallLocationDto => ({ path: l.path, line: l.line })),
      contents: (related.contents.get(id) ?? []).map((c) => this.contentToDto(c, related)),
      permission: related.permissions.get(id) ?? null
    }
  }

  private contentToDto(row: ContentRow, related: Related): ToolCallContentDto {
    switch (row.kind) {
      case 'diff':
        return { kind: 'diff', path: row.path ?? '', oldText: row.old_text, newText: row.new_text ?? '' }
      case 'terminal':
        return { kind: 'terminal', terminalId: row.terminal_id ?? '' }
      case 'content': {
        const block = related.contentBlocks.get(row.id)?.[0]
        return { kind: 'content', block: block ? rowToBlock(block) : { kind: 'text', text: '' } }
      }
    }
  }
}

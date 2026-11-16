import { prepare, transaction, type Database, type Statement } from './sql'
import type { ContentBlockDto, Id, MessageRole, TranscriptEntryDto } from '@shared/models'
import type {
  ChunkResult,
  MessageEntryDto,
  ToolCallEntryDto,
  ToolCallUpsert,
  TranscriptRepository,
  UpsertResult
} from '../../domain/repositories/transcript-repository'
import { BlockWriter } from './block-writer'
import { ToolCallWriter } from './tool-call-writer'
import { TranscriptEntries } from './transcript-entries'
import { TranscriptReader } from './transcript-reader'

interface LastEntryRow {
  id: number
  kind: TranscriptEntryDto['kind']
  role: MessageRole | null
}

interface LastBlockRow {
  id: number
  position: number
  kind: ContentBlockDto['kind']
}

export class SqliteTranscriptRepository implements TranscriptRepository {
  private readonly entries: TranscriptEntries
  private readonly reader: TranscriptReader
  private readonly blocks: BlockWriter
  private readonly toolCalls: ToolCallWriter
  private readonly selectLast: Statement<[Id], LastEntryRow>
  private readonly selectLastBlock: Statement<[Id], LastBlockRow>
  private readonly insertMessage: Statement<[Id, MessageRole]>
  private readonly extendText: Statement<[string, Id]>
  private readonly selectToolCallEntry: Statement<[Id, string], { entry_id: number }>

  constructor(private readonly db: Database) {
    this.entries = new TranscriptEntries(db)
    this.reader = new TranscriptReader(db)
    this.blocks = new BlockWriter(db)
    this.toolCalls = new ToolCallWriter(db)
    this.selectLast = prepare(db, 
      `SELECT e.id, e.kind, m.role FROM transcript_entries e
       LEFT JOIN messages m ON m.entry_id = e.id
       WHERE e.session_id = ? ORDER BY e.seq DESC LIMIT 1`
    )
    this.selectLastBlock = prepare(db, 
      'SELECT id, position, kind FROM content_blocks WHERE message_id = ? ORDER BY position DESC LIMIT 1'
    )
    this.insertMessage = prepare(db, 'INSERT INTO messages (entry_id, role) VALUES (?, ?)')
    this.extendText = prepare(db, 'UPDATE content_blocks SET text = text || ? WHERE id = ?')
    this.selectToolCallEntry = prepare(db, 'SELECT entry_id FROM tool_calls WHERE session_id = ? AND acp_tool_call_id = ?')
  }

  list(sessionId: Id): TranscriptEntryDto[] {
    return this.reader.listBySession(sessionId)
  }

  get(entryId: Id): TranscriptEntryDto | null {
    return this.reader.load([entryId])[0] ?? null
  }

  appendMessage(sessionId: Id, role: MessageRole, blocks: ContentBlockDto[]): MessageEntryDto {
    const id = transaction(this.db, () => this.createMessage(sessionId, role, blocks))
    return this.requireMessage(id)
  }

  appendChunk(sessionId: Id, role: MessageRole, block: ContentBlockDto): ChunkResult {
    return transaction(this.db, (): ChunkResult => {
      const last = this.selectLast.get(sessionId)
      if (last?.kind === 'message' && last.role === role) {
        this.extendMessage(last.id, block)
        return { entry: this.requireMessage(last.id), created: false }
      }
      return { entry: this.requireMessage(this.createMessage(sessionId, role, [block])), created: true }
    })
  }

  upsertToolCall(sessionId: Id, input: ToolCallUpsert): UpsertResult {
    return transaction(this.db, (): UpsertResult => {
      const existing = this.selectToolCallEntry.get(sessionId, input.toolCallId)
      if (existing) {
        this.toolCalls.update(existing.entry_id, input)
        return { entry: this.requireToolCall(existing.entry_id), created: false }
      }
      const entryId = this.entries.allocate(sessionId, 'tool_call')
      this.toolCalls.insert(entryId, sessionId, input)
      return { entry: this.requireToolCall(entryId), created: true }
    })
  }

  findToolCall(sessionId: Id, toolCallId: string): ToolCallEntryDto | null {
    const row = this.selectToolCallEntry.get(sessionId, toolCallId)
    return row ? this.requireToolCall(row.entry_id) : null
  }

  clear(sessionId: Id): void {
    this.entries.deleteAll(sessionId)
  }

  private createMessage(sessionId: Id, role: MessageRole, blocks: ContentBlockDto[]): Id {
    const id = this.entries.allocate(sessionId, 'message')
    this.insertMessage.run(id, role)
    blocks.forEach((block, position) => this.blocks.write({ messageId: id }, position, block))
    return id
  }

  /** Merges adjacent text chunks into one block; any other block is appended. */
  private extendMessage(messageId: Id, block: ContentBlockDto): void {
    const last = this.selectLastBlock.get(messageId)
    if (last && last.kind === 'text' && block.kind === 'text') {
      this.extendText.run(block.text, last.id)
      return
    }
    this.blocks.write({ messageId }, last ? last.position + 1 : 0, block)
  }

  private requireMessage(id: Id): MessageEntryDto {
    const entry = this.get(id)
    if (entry?.kind !== 'message') throw new Error(`Entry ${id} is not a message`)
    return entry
  }

  private requireToolCall(id: Id): ToolCallEntryDto {
    const entry = this.get(id)
    if (entry?.kind !== 'tool_call') throw new Error(`Entry ${id} is not a tool call`)
    return entry
  }
}

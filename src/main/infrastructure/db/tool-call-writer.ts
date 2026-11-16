import { prepare, type Database, type Statement } from './sql'
import type { Id, ToolCallContentDto, ToolCallLocationDto } from '@shared/models'
import type { ToolCallUpsert } from '../../domain/repositories/transcript-repository'
import { BlockWriter } from './block-writer'

interface UpdateParams {
  id: Id
  title: string | null
  kind: string | null
  status: string | null
  setRawInput: number
  rawInput: string | null
  setRawOutput: number
  rawOutput: string | null
}

interface ContentParams {
  toolCallId: Id
  position: number
  kind: ToolCallContentDto['kind']
  path: string | null
  oldText: string | null
  newText: string | null
  terminalId: string | null
}

function contentParams(toolCallId: Id, position: number, c: ToolCallContentDto): ContentParams {
  const base = { toolCallId, position, kind: c.kind, path: null, oldText: null, newText: null, terminalId: null }
  if (c.kind === 'diff') return { ...base, path: c.path, oldText: c.oldText, newText: c.newText }
  if (c.kind === 'terminal') return { ...base, terminalId: c.terminalId }
  return base
}

/** Writes the tool_calls subtype row and its ordered locations / contents. */
export class ToolCallWriter {
  private readonly insertToolCall: Statement<[Id, Id, string, string, string, string, string | null, string | null]>
  private readonly updateToolCall: Statement<UpdateParams>
  private readonly deleteLocations: Statement<[Id]>
  private readonly insertLocation: Statement<[Id, number, string, number | null]>
  private readonly deleteContents: Statement<[Id]>
  private readonly insertContent: Statement<ContentParams>
  private readonly blocks: BlockWriter

  constructor(db: Database) {
    this.blocks = new BlockWriter(db)
    this.insertToolCall = prepare(db, 
      `INSERT INTO tool_calls (entry_id, session_id, acp_tool_call_id, title, kind, status, raw_input, raw_output)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    this.updateToolCall = prepare(db, 
      `UPDATE tool_calls SET
         title = COALESCE(@title, title),
         kind = COALESCE(@kind, kind),
         status = COALESCE(@status, status),
         raw_input = CASE WHEN @setRawInput = 1 THEN @rawInput ELSE raw_input END,
         raw_output = CASE WHEN @setRawOutput = 1 THEN @rawOutput ELSE raw_output END
       WHERE entry_id = @id`
    )
    this.deleteLocations = prepare(db, 'DELETE FROM tool_call_locations WHERE tool_call_id = ?')
    this.insertLocation = prepare(db, 
      'INSERT INTO tool_call_locations (tool_call_id, position, path, line) VALUES (?, ?, ?, ?)'
    )
    this.deleteContents = prepare(db, 'DELETE FROM tool_call_contents WHERE tool_call_id = ?')
    this.insertContent = prepare(db, 
      `INSERT INTO tool_call_contents (tool_call_id, position, kind, path, old_text, new_text, terminal_id)
       VALUES (@toolCallId, @position, @kind, @path, @oldText, @newText, @terminalId)`
    )
  }

  insert(entryId: Id, sessionId: Id, input: ToolCallUpsert): void {
    this.insertToolCall.run(
      entryId,
      sessionId,
      input.toolCallId,
      input.title ?? '',
      input.toolKind ?? 'other',
      input.status ?? 'pending',
      input.rawInput ?? null,
      input.rawOutput ?? null
    )
    this.writeDetails(entryId, input)
  }

  update(entryId: Id, input: ToolCallUpsert): void {
    this.updateToolCall.run({
      id: entryId,
      title: input.title ?? null,
      kind: input.toolKind ?? null,
      status: input.status ?? null,
      setRawInput: input.rawInput === undefined ? 0 : 1,
      rawInput: input.rawInput ?? null,
      setRawOutput: input.rawOutput === undefined ? 0 : 1,
      rawOutput: input.rawOutput ?? null
    })
    this.writeDetails(entryId, input)
  }

  private writeDetails(entryId: Id, input: ToolCallUpsert): void {
    if (input.locations) this.replaceLocations(entryId, input.locations)
    if (input.contents) this.replaceContents(entryId, input.contents)
  }

  private replaceLocations(entryId: Id, locations: ToolCallLocationDto[]): void {
    this.deleteLocations.run(entryId)
    locations.forEach((l, position) => this.insertLocation.run(entryId, position, l.path, l.line))
  }

  private replaceContents(entryId: Id, contents: ToolCallContentDto[]): void {
    this.deleteContents.run(entryId)
    contents.forEach((content, position) => {
      const id = Number(this.insertContent.run(contentParams(entryId, position, content)).lastInsertRowid)
      if (content.kind === 'content') this.blocks.write({ toolContentId: id }, 0, content.block)
    })
  }
}

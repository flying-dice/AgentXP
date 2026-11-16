import { prepare, type Database, type Statement } from './sql'
import type { Id, PermissionOptionDto, PermissionRequestDto } from '@shared/models'
import { idsJson } from './sql'

interface RequestRow {
  id: number
  entry_id: number
  session_id: number
  acp_tool_call_id: string
  outcome: PermissionRequestDto['outcome']
  selected_option_id: string | null
}

const SELECT = `SELECT pr.id, pr.tool_call_id AS entry_id, tc.session_id, tc.acp_tool_call_id, pr.outcome, pr.selected_option_id
  FROM permission_requests pr JOIN tool_calls tc ON tc.entry_id = pr.tool_call_id`

/** Builds PermissionRequestDto values (request row + ordered options). Shared by transcript and permission repos. */
export class PermissionReader {
  private readonly byId: Statement<[Id], RequestRow>
  private readonly byToolCalls: Statement<[string], RequestRow>
  private readonly pending: Statement<[], RequestRow>
  private readonly pendingBySession: Statement<[Id], RequestRow>
  private readonly options: Statement<[Id], { option_id: string; name: string; kind: PermissionOptionDto['kind'] }>

  constructor(db: Database) {
    this.byId = prepare(db, `${SELECT} WHERE pr.id = ?`)
    this.byToolCalls = prepare(db, `${SELECT} WHERE pr.tool_call_id IN (SELECT value FROM json_each(?)) ORDER BY pr.id`)
    this.pending = prepare(db, `${SELECT} WHERE pr.outcome = 'pending' ORDER BY pr.id`)
    this.pendingBySession = prepare(db, `${SELECT} WHERE pr.outcome = 'pending' AND tc.session_id = ? ORDER BY pr.id`)
    this.options = prepare(db, 
      'SELECT option_id, name, kind FROM permission_options WHERE request_id = ? ORDER BY position'
    )
  }

  get(id: Id): PermissionRequestDto | null {
    const row = this.byId.get(id)
    return row ? this.toDto(row) : null
  }

  listPending(sessionId?: Id): PermissionRequestDto[] {
    const rows = sessionId === undefined ? this.pending.all() : this.pendingBySession.all(sessionId)
    return rows.map((r) => this.toDto(r))
  }

  /** Latest request per tool call entry id (a later request supersedes an earlier one). */
  latestByToolCallEntry(entryIds: readonly Id[]): Map<Id, PermissionRequestDto> {
    const latest = new Map<Id, PermissionRequestDto>()
    for (const row of this.byToolCalls.all(idsJson(entryIds))) latest.set(row.entry_id, this.toDto(row))
    return latest
  }

  private toDto(row: RequestRow): PermissionRequestDto {
    return {
      id: row.id,
      sessionId: row.session_id,
      toolCallId: row.acp_tool_call_id,
      options: this.options.all(row.id).map((o) => ({ optionId: o.option_id, name: o.name, kind: o.kind })),
      outcome: row.outcome,
      selectedOptionId: row.selected_option_id
    }
  }
}

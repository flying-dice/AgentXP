import type { Database, Statement } from 'better-sqlite3'
import type { Id, PermissionOptionDto, PermissionRequestDto } from '@shared/models'
import type { PermissionRepository } from '../../domain/repositories/permission-repository'
import { PermissionReader } from './permission-reader'
import { NOW_SQL } from './sql'

export class SqlitePermissionRepository implements PermissionRepository {
  private readonly reader: PermissionReader
  private readonly selectToolCall: Statement<[Id, string], { entry_id: number }>
  private readonly insertRequest: Statement<[Id]>
  private readonly insertOption: Statement<[Id, number, string, string, string]>
  private readonly hasOption: Statement<[Id, string], { found: number }>
  private readonly select: Statement<[Id], { outcome: string }>
  private readonly markSelected: Statement<[string, Id]>
  private readonly markCancelled: Statement<[Id]>
  private readonly cancelAllPending: Statement<[Id]>

  constructor(private readonly db: Database) {
    this.reader = new PermissionReader(db)
    this.selectToolCall = db.prepare('SELECT entry_id FROM tool_calls WHERE session_id = ? AND acp_tool_call_id = ?')
    this.insertRequest = db.prepare('INSERT INTO permission_requests (tool_call_id) VALUES (?)')
    this.insertOption = db.prepare(
      'INSERT INTO permission_options (request_id, position, option_id, name, kind) VALUES (?, ?, ?, ?, ?)'
    )
    this.hasOption = db.prepare('SELECT 1 AS found FROM permission_options WHERE request_id = ? AND option_id = ?')
    this.select = db.prepare('SELECT outcome FROM permission_requests WHERE id = ?')
    this.markSelected = db.prepare(
      `UPDATE permission_requests SET outcome = 'selected', selected_option_id = ?, resolved_at = ${NOW_SQL} WHERE id = ?`
    )
    this.markCancelled = db.prepare(
      `UPDATE permission_requests SET outcome = 'cancelled', resolved_at = ${NOW_SQL} WHERE id = ?`
    )
    this.cancelAllPending = db.prepare(
      `UPDATE permission_requests SET outcome = 'cancelled', resolved_at = ${NOW_SQL}
       WHERE outcome = 'pending'
         AND tool_call_id IN (SELECT entry_id FROM tool_calls WHERE session_id = ?)`
    )
  }

  create(sessionId: Id, toolCallId: string, options: PermissionOptionDto[]): PermissionRequestDto {
    const id = this.db.transaction(() => {
      const entry = this.selectToolCall.get(sessionId, toolCallId)
      if (!entry) throw new Error(`Unknown tool call ${toolCallId} in session ${sessionId}`)
      const requestId = Number(this.insertRequest.run(entry.entry_id).lastInsertRowid)
      options.forEach((o, position) => this.insertOption.run(requestId, position, o.optionId, o.name, o.kind))
      return requestId
    })()
    return this.require(id)
  }

  get(id: Id): PermissionRequestDto | null {
    return this.reader.get(id)
  }

  listPending(sessionId?: Id): PermissionRequestDto[] {
    return this.reader.listPending(sessionId)
  }

  resolve(id: Id, optionId: string | null): PermissionRequestDto | null {
    return this.db.transaction(() => {
      if (this.select.get(id)?.outcome !== 'pending') return null
      if (optionId === null) this.markCancelled.run(id)
      else if (this.hasOption.get(id, optionId)) this.markSelected.run(optionId, id)
      else return null
      return this.reader.get(id)
    })()
  }

  cancelPending(sessionId: Id): number {
    return this.cancelAllPending.run(sessionId).changes
  }

  private require(id: Id): PermissionRequestDto {
    const request = this.reader.get(id)
    if (!request) throw new Error(`Permission request ${id} vanished after insert`)
    return request
  }
}

import type { Id } from '@shared/models'
import type { SessionScope, SessionScopeRepository } from '../../domain/repositories/session-scope-repository'
import { prepare, transaction, type Database } from './sql'

export class SqliteSessionScopeRepository implements SessionScopeRepository {
  constructor(private readonly db: Database) {}

  get(sessionId: Id): SessionScope | null {
    const row = prepare<[Id], { instructions: string }>(this.db, 'SELECT instructions FROM session_scopes WHERE session_id = ?').get(sessionId)
    if (!row) return null
    return {
      instructions: row.instructions,
      skillIds: prepare<[Id], { skill_id: number }>(this.db, 'SELECT skill_id FROM session_scope_skills WHERE session_id = ? ORDER BY skill_id').all(sessionId).map((r) => r.skill_id),
      serverIds: prepare<[Id], { server_id: number }>(this.db, 'SELECT server_id FROM session_scope_servers WHERE session_id = ? ORDER BY server_id').all(sessionId).map((r) => r.server_id),
      hiddenTools: prepare<[Id], { server_id: number; tool: string }>(this.db, 'SELECT server_id, tool FROM session_scope_hidden_tools WHERE session_id = ? ORDER BY server_id, tool')
        .all(sessionId)
        .map((r) => ({ serverId: r.server_id, tool: r.tool }))
    }
  }

  set(sessionId: Id, scope: SessionScope): void {
    transaction(this.db, () => {
      prepare<[Id]>(this.db, 'DELETE FROM session_scopes WHERE session_id = ?').run(sessionId)
      prepare<[Id, string]>(this.db, 'INSERT INTO session_scopes (session_id, instructions) VALUES (?, ?)').run(sessionId, scope.instructions)
      for (const id of new Set(scope.skillIds)) prepare<[Id, Id]>(this.db, 'INSERT INTO session_scope_skills (session_id, skill_id) VALUES (?, ?)').run(sessionId, id)
      for (const id of new Set(scope.serverIds)) prepare<[Id, Id]>(this.db, 'INSERT INTO session_scope_servers (session_id, server_id) VALUES (?, ?)').run(sessionId, id)
      for (const t of scope.hiddenTools) prepare<[Id, Id, string]>(this.db, 'INSERT OR IGNORE INTO session_scope_hidden_tools (session_id, server_id, tool) VALUES (?, ?, ?)').run(sessionId, t.serverId, t.tool)
    })
  }
}

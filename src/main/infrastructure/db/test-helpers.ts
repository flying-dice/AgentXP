import { prepare, type Database } from './sql'
import { openDatabase } from './open-database'
import { SqliteFolderRepository } from './sqlite-folder-repository'
import { SqliteSessionRepository } from './sqlite-session-repository'
import { SqliteAgentRepository } from './sqlite-agent-repository'

export interface Fixture {
  db: Database
  agentId: number
  folderId: number
  sessionId: number
}

/** In-memory database with the seeded agent, one folder (not linked to anything) and one session without a desktop. */
export function createFixture(): Fixture {
  const db = openDatabase(':memory:')
  const agentId = new SqliteAgentRepository(db).getDefault()?.id ?? 0
  const folderId = new SqliteFolderRepository(db).add('/work/project', 'project').id
  const sessionId = new SqliteSessionRepository(db).create({ agentId, title: 'Session' }).id
  return { db, agentId, folderId, sessionId }
}

/** `_folderId` is unused (chats no longer belong to a folder); kept so existing call sites read the same. */
export function createSession(db: Database, _folderId: number, agentId: number, title = 'Other'): number {
  return new SqliteSessionRepository(db).create({ agentId, title }).id
}

export function count(db: Database, table: string): number {
  return (prepare(db, `SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n
}

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

/** In-memory database with the seeded agent, one folder and one session. */
export function createFixture(): Fixture {
  const db = openDatabase(':memory:')
  const agentId = new SqliteAgentRepository(db).getDefault()?.id ?? 0
  const folderId = new SqliteFolderRepository(db).add('/work/project', 'project').id
  const sessionId = new SqliteSessionRepository(db).create({ folderId, agentId, title: 'Session' }).id
  return { db, agentId, folderId, sessionId }
}

export function createSession(db: Database, folderId: number, agentId: number, title = 'Other'): number {
  return new SqliteSessionRepository(db).create({ folderId, agentId, title }).id
}

export function count(db: Database, table: string): number {
  return (prepare(db, `SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n
}

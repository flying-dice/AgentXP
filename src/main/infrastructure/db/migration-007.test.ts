import { describe, expect, it } from 'vitest'
import { migrate } from './migrate'
import { MIGRATIONS } from './migrations'
import { openRaw } from './sql'
import { SqliteAgentRepository } from './sqlite-agent-repository'

function database(upTo: number) {
  const db = openRaw(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  migrate(db, MIGRATIONS.slice(0, upTo))
  return db
}

/** A desktop with an existing chat, inserted the way the earlier migrations store it. */
function seed(db: ReturnType<typeof openRaw>) {
  const agentId = new SqliteAgentRepository(db).getDefault()!.id
  db.exec(`INSERT INTO desktops (title, is_open, created_at) VALUES ('D', 0, '2026-01-01T00:00:00.000Z')`)
  db.exec(`INSERT INTO sessions (agent_id, desktop_id, title) VALUES (${agentId}, 1, 'old chat')`)
  return agentId
}

describe('migration 007 (code review)', () => {
  it('seeds the code-review app kind, makes existing sessions chats and creates the review tables', () => {
    const db = database(6)
    seed(db)
    expect(migrate(db)).toBe(MIGRATIONS.length)
    expect(MIGRATIONS.at(-1)).toMatchObject({ version: 7, name: 'code_review' })
    expect(db.prepare("SELECT kind FROM app_kinds WHERE kind = 'code-review'").all()).toEqual([{ kind: 'code-review' }])
    expect(db.prepare('SELECT role FROM sessions').all()).toEqual([{ role: 'chat' }])
    const columns = (table: string): string[] => (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((c) => c.name)
    expect(columns('review_comments')).toEqual(['id', 'session_id', 'path', 'line_start', 'line_end', 'side', 'body', 'severity', 'state', 'author', 'parent_id', 'created_at'])
    expect(columns('review_summaries')).toEqual(['session_id', 'verdict', 'body', 'created_at'])
    expect(columns('path_windows')).toContain('base_ref')
  })

  it('is safe on a database that already has the app kind row', () => {
    const db = database(6)
    db.exec("INSERT INTO app_kinds (kind) VALUES ('code-review')")
    expect(() => migrate(db)).not.toThrow()
    expect(db.prepare("SELECT COUNT(*) AS n FROM app_kinds WHERE kind = 'code-review'").get()).toEqual({ n: 1 })
  })

  it('only accepts the three roles', () => {
    const db = database(7)
    const agentId = seed(db)
    for (const role of ['chat', 'review', 'aside']) expect(() => db.exec(`INSERT INTO sessions (agent_id, desktop_id, title, role) VALUES (${agentId}, 1, 'x', '${role}')`)).not.toThrow()
    expect(() => db.exec(`INSERT INTO sessions (agent_id, desktop_id, title, role) VALUES (${agentId}, 1, 'x', 'bogus')`)).toThrow(/CHECK/)
  })

  it('checks comment values, and deleting the session deletes its comments, replies and verdict', () => {
    const db = database(7)
    const agentId = seed(db)
    db.exec(`INSERT INTO sessions (agent_id, desktop_id, title, role) VALUES (${agentId}, 1, 'review', 'review')`)
    const insert = (extra: string): void =>
      db.exec(`INSERT INTO review_comments (session_id, path, line_start, line_end, body, author${extra ? ', ' + extra.split('=')[0] : ''}) VALUES (2, 'a.ts', 3, 3, 'b', 'agent'${extra ? ', ' + extra.split('=')[1] : ''})`)
    insert('')
    expect(() => insert('severity=\'huge\'')).toThrow(/CHECK/)
    expect(() => insert('state=\'closed\'')).toThrow(/CHECK/)
    expect(() => insert('side=\'middle\'')).toThrow(/CHECK/)
    expect(() => db.exec("INSERT INTO review_comments (session_id, path, line_start, line_end, body, author) VALUES (2, 'a.ts', 5, 4, 'b', 'agent')")).toThrow(/CHECK/)
    expect(() => db.exec("INSERT INTO review_comments (session_id, path, line_start, line_end, body, author) VALUES (2, 'a.ts', 0, 0, 'b', 'agent')")).toThrow(/CHECK/)
    expect(() => db.exec("INSERT INTO review_comments (session_id, path, line_start, line_end, body, author) VALUES (2, 'a.ts', 1, 1, 'b', 'robot')")).toThrow(/CHECK/)
    db.exec("INSERT INTO review_comments (session_id, path, line_start, line_end, body, author, parent_id) VALUES (2, 'a.ts', 3, 3, 'reply', 'user', 1)")
    db.exec("INSERT INTO review_summaries (session_id, verdict, body) VALUES (2, 'approve', 'ok')")
    expect(() => db.exec("INSERT INTO review_summaries (session_id, verdict, body) VALUES (2, 'maybe', 'ok')")).toThrow()
    // Deleting the root deletes the reply.
    db.exec('DELETE FROM review_comments WHERE id = 1')
    expect(db.prepare('SELECT COUNT(*) AS n FROM review_comments').get()).toEqual({ n: 0 })
    insert('')
    db.exec('DELETE FROM sessions WHERE id = 2')
    expect(db.prepare('SELECT COUNT(*) AS n FROM review_comments').get()).toEqual({ n: 0 })
    expect(db.prepare('SELECT COUNT(*) AS n FROM review_summaries').get()).toEqual({ n: 0 })
  })
})

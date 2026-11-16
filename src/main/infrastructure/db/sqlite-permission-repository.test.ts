import { describe, expect, it } from 'vitest'
import type { PermissionOptionDto } from '@shared/models'
import { SqlitePermissionRepository } from './sqlite-permission-repository'
import { SqliteTranscriptRepository } from './sqlite-transcript-repository'
import { count, createFixture, createSession } from './test-helpers'

const options: PermissionOptionDto[] = [
  { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
  { optionId: 'always', name: 'Always', kind: 'allow_always' },
  { optionId: 'reject', name: 'Reject', kind: 'reject_once' }
]

function setup() {
  const f = createFixture()
  new SqliteTranscriptRepository(f.db).upsertToolCall(f.sessionId, { toolCallId: 'c1' })
  return { f, repo: new SqlitePermissionRepository(f.db) }
}

describe('SqlitePermissionRepository', () => {
  it('creates a pending request with ordered options', () => {
    const { f, repo } = setup()
    const r = repo.create(f.sessionId, 'c1', options)
    expect(r).toEqual({
      id: r.id,
      sessionId: f.sessionId,
      toolCallId: 'c1',
      options,
      outcome: 'pending',
      selectedOptionId: null
    })
    expect(repo.get(r.id)).toEqual(r)
    expect(repo.get(999)).toBeNull()
  })

  it('rejects requests for unknown tool calls', () => {
    const { f, repo } = setup()
    expect(() => repo.create(f.sessionId, 'missing', options)).toThrow(/Unknown tool call/)
    expect(count(f.db, 'permission_requests')).toBe(0)
  })

  it('resolves with a selected option once', () => {
    const { f, repo } = setup()
    const r = repo.create(f.sessionId, 'c1', options)
    expect(repo.resolve(r.id, 'always')).toMatchObject({ outcome: 'selected', selectedOptionId: 'always' })
    expect(repo.resolve(r.id, 'reject')).toBeNull()
    expect(repo.get(r.id)?.selectedOptionId).toBe('always')
  })

  it('refuses unknown options and missing requests', () => {
    const { f, repo } = setup()
    const r = repo.create(f.sessionId, 'c1', options)
    expect(repo.resolve(r.id, 'bogus')).toBeNull()
    expect(repo.get(r.id)?.outcome).toBe('pending')
    expect(repo.resolve(999, 'allow')).toBeNull()
  })

  it('resolves with null as cancelled', () => {
    const { f, repo } = setup()
    const r = repo.create(f.sessionId, 'c1', options)
    expect(repo.resolve(r.id, null)).toMatchObject({ outcome: 'cancelled', selectedOptionId: null })
  })

  it('lists pending requests optionally by session and cancels them per session', () => {
    const { f, repo } = setup()
    const other = createSession(f.db, f.folderId, f.agentId)
    new SqliteTranscriptRepository(f.db).upsertToolCall(other, { toolCallId: 'c1' })
    const a = repo.create(f.sessionId, 'c1', options)
    const b = repo.create(other, 'c1', options)
    expect(repo.listPending().map((r) => r.id)).toEqual([a.id, b.id])
    expect(repo.listPending(other).map((r) => r.id)).toEqual([b.id])
    expect(repo.cancelPending(f.sessionId)).toBe(1)
    expect(repo.listPending().map((r) => r.id)).toEqual([b.id])
    expect(repo.get(a.id)?.outcome).toBe('cancelled')
  })

  it('enforces that the selected option belongs to the request', () => {
    const { f, repo } = setup()
    const a = repo.create(f.sessionId, 'c1', options)
    expect(() =>
      f.db.prepare("UPDATE permission_requests SET outcome='selected', selected_option_id='nope' WHERE id=?").run(a.id)
    ).toThrow(/FOREIGN KEY/)
  })

  it('cascades options when the tool call goes away', () => {
    const { f, repo } = setup()
    repo.create(f.sessionId, 'c1', options)
    new SqliteTranscriptRepository(f.db).clear(f.sessionId)
    expect(count(f.db, 'permission_requests')).toBe(0)
    expect(count(f.db, 'permission_options')).toBe(0)
  })

  it('cascades after a request has been resolved (circular FK)', () => {
    const { f, repo } = setup()
    const r = repo.create(f.sessionId, 'c1', options)
    repo.resolve(r.id, 'allow')
    f.db.prepare('DELETE FROM sessions').run()
    expect(count(f.db, 'permission_options')).toBe(0)
  })
})

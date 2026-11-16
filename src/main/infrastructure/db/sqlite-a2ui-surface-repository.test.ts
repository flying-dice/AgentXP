import { describe, expect, it } from 'vitest'
import { SqliteA2uiSurfaceRepository } from './sqlite-a2ui-surface-repository'
import { SqliteTranscriptRepository } from './sqlite-transcript-repository'
import { count, createFixture, createSession } from './test-helpers'

const base = { surfaceId: 'form', catalogId: 'https://agent7.dev/a2ui/catalogs/winforms/v1', title: 'Form' }

function setup() {
  const f = createFixture()
  return { f, repo: new SqliteA2uiSurfaceRepository(f.db) }
}

describe('SqliteA2uiSurfaceRepository', () => {
  it('creates a surface and a transcript entry', () => {
    const { f, repo } = setup()
    const s = repo.create(f.sessionId, base)
    expect(s).toEqual({
      surfaceId: 'form',
      sessionId: f.sessionId,
      title: 'Form',
      catalogId: base.catalogId,
      target: 'inline',
      hidden: false,
      components: [],
      dataModel: {}
    })
    const entries = new SqliteTranscriptRepository(f.db).list(f.sessionId)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: 'a2ui', surfaceId: 'form', seq: 1 })
  })

  it('re-creating the same surface updates metadata and keeps one entry', () => {
    const { f, repo } = setup()
    repo.create(f.sessionId, base)
    const again = repo.create(f.sessionId, { ...base, title: null, catalogId: 'other' })
    expect(again).toMatchObject({ title: null, catalogId: 'other' })
    expect(count(f.db, 'transcript_entries')).toBe(1)
    expect(count(f.db, 'a2ui_surfaces')).toBe(1)
  })

  it('scopes surface ids per session', () => {
    const { f, repo } = setup()
    const other = createSession(f.db, f.folderId, f.agentId)
    repo.create(f.sessionId, base)
    repo.create(other, base)
    expect(repo.list(f.sessionId)).toHaveLength(1)
    expect(repo.get(other, 'form')?.sessionId).toBe(other)
    expect(repo.get(f.sessionId, 'nope')).toBeNull()
  })

  it('upserts components keeping insertion order and splitting props', () => {
    const { f, repo } = setup()
    repo.create(f.sessionId, base)
    repo.upsertComponents(f.sessionId, 'form', [
      { id: 'root', component: 'Form', children: ['name', 'ok'] },
      { id: 'name', component: 'TextBox', text: { path: '/name' } },
      { id: 'ok', component: 'Button', text: 'OK' }
    ])
    const updated = repo.upsertComponents(f.sessionId, 'form', [
      { id: 'ok', component: 'Button', text: 'Submit', enabled: true },
      { id: 'extra', component: 'Label', text: 'x' }
    ])!
    expect(updated.components.map((c) => c.id)).toEqual(['root', 'name', 'ok', 'extra'])
    expect(updated.components[0]).toEqual({ id: 'root', component: 'Form', children: ['name', 'ok'] })
    expect(updated.components[2]).toEqual({ id: 'ok', component: 'Button', text: 'Submit', enabled: true })
    expect(count(f.db, 'a2ui_components')).toBe(4)
  })

  it('returns null for unknown surfaces', () => {
    const { f, repo } = setup()
    expect(repo.upsertComponents(f.sessionId, 'x', [])).toBeNull()
    expect(repo.updateDataModel(f.sessionId, 'x', '/a', 1)).toBeNull()
    expect(repo.delete(f.sessionId, 'x')).toBe(false)
  })

  it('updates the data model at pointers and as a whole', () => {
    const { f, repo } = setup()
    repo.create(f.sessionId, base)
    expect(repo.updateDataModel(f.sessionId, 'form', '/user/name', 'Ada')?.dataModel).toEqual({ user: { name: 'Ada' } })
    expect(repo.updateDataModel(f.sessionId, 'form', '/user/age', 36)?.dataModel).toEqual({ user: { name: 'Ada', age: 36 } })
    expect(repo.updateDataModel(f.sessionId, 'form', undefined, { fresh: [1, 2] })?.dataModel).toEqual({ fresh: [1, 2] })
    expect(repo.get(f.sessionId, 'form')?.dataModel).toEqual({ fresh: [1, 2] })
  })

  it('deletes the surface with components and transcript entry', () => {
    const { f, repo } = setup()
    repo.create(f.sessionId, base)
    repo.upsertComponents(f.sessionId, 'form', [{ id: 'root', component: 'Form' }])
    expect(repo.delete(f.sessionId, 'form')).toBe(true)
    expect(count(f.db, 'a2ui_surfaces')).toBe(0)
    expect(count(f.db, 'a2ui_components')).toBe(0)
    expect(count(f.db, 'transcript_entries')).toBe(0)
  })

  it('lists surfaces in transcript order and cascades with the session', () => {
    const { f, repo } = setup()
    repo.create(f.sessionId, { ...base, surfaceId: 'b' })
    repo.create(f.sessionId, { ...base, surfaceId: 'a' })
    expect(repo.list(f.sessionId).map((s) => s.surfaceId)).toEqual(['b', 'a'])
    repo.upsertComponents(f.sessionId, 'a', [{ id: 'root', component: 'Form' }])
    f.db.prepare('DELETE FROM sessions').run()
    expect(count(f.db, 'a2ui_components')).toBe(0)
    expect(count(f.db, 'a2ui_surfaces')).toBe(0)
  })
})

import { describe, expect, it } from 'vitest'
import type { ContentBlockDto } from '@shared/models'
import { SqliteA2uiSurfaceRepository } from './sqlite-a2ui-surface-repository'
import { SqlitePermissionRepository } from './sqlite-permission-repository'
import { SqliteTranscriptRepository } from './sqlite-transcript-repository'
import { count, createFixture, createSession } from './test-helpers'

const text = (t: string): ContentBlockDto => ({ kind: 'text', text: t })

function setup() {
  const f = createFixture()
  return { f, repo: new SqliteTranscriptRepository(f.db) }
}

describe('SqliteTranscriptRepository.removeLastUserMessage', () => {
  it('removes the last user message with its blocks and leaves earlier ones', () => {
    const { f, repo } = setup()
    const first = repo.appendMessage(f.sessionId, 'user', [text('one')])
    repo.appendMessage(f.sessionId, 'user', [text('two')])
    expect(repo.removeLastUserMessage(f.sessionId)).toBe(true)
    expect(repo.list(f.sessionId).map((e) => e.id)).toEqual([first.id])
    expect(count(f.db, 'content_blocks')).toBe(1)
  })
  it('does nothing when there is no user message', () => {
    const { f, repo } = setup()
    repo.appendMessage(f.sessionId, 'agent', [text('hi')])
    expect(repo.removeLastUserMessage(f.sessionId)).toBe(false)
    expect(repo.list(f.sessionId)).toHaveLength(1)
  })
})

describe('SqliteTranscriptRepository messages', () => {
  it('appends messages with increasing seq and returns DTOs', () => {
    const { f, repo } = setup()
    const a = repo.appendMessage(f.sessionId, 'user', [text('hello')])
    const b = repo.appendMessage(f.sessionId, 'agent', [text('hi'), text('there')])
    expect([a.seq, b.seq]).toEqual([1, 2])
    expect(a).toMatchObject({ kind: 'message', role: 'user', blocks: [text('hello')] })
    expect(a.createdAt).toMatch(/Z$/)
    expect(b.blocks).toEqual([text('hi'), text('there')])
    expect(repo.list(f.sessionId).map((e) => e.id)).toEqual([a.id, b.id])
    expect(repo.get(a.id)).toEqual(a)
    expect(repo.get(9999)).toBeNull()
  })

  it('allocates seq per session', () => {
    const { f, repo } = setup()
    const other = createSession(f.db, f.folderId, f.agentId)
    repo.appendMessage(f.sessionId, 'user', [text('a')])
    repo.appendMessage(f.sessionId, 'user', [text('b')])
    expect(repo.appendMessage(other, 'user', [text('c')]).seq).toBe(1)
  })

  it('round-trips every block kind including image bytes', () => {
    const { f, repo } = setup()
    const blocks: ContentBlockDto[] = [
      text('t'),
      { kind: 'image', mimeType: 'image/png', data: Buffer.from([0, 255, 1, 2]).toString('base64'), uri: 'file:///a.png' },
      { kind: 'resource_link', uri: 'file:///a', name: 'a', mimeType: null },
      { kind: 'resource', uri: 'file:///b', mimeType: 'text/plain', text: 'body' }
    ]
    const m = repo.appendMessage(f.sessionId, 'user', blocks)
    expect(m.blocks).toEqual(blocks)
    const blob = f.db.prepare("SELECT data FROM content_blocks WHERE kind = 'image'").get() as { data: Buffer }
    expect([...blob.data]).toEqual([0, 255, 1, 2])
  })

  it('appends chunks to the last message of the same role, merging text', () => {
    const { f, repo } = setup()
    const first = repo.appendChunk(f.sessionId, 'agent', text('Hel'))
    const second = repo.appendChunk(f.sessionId, 'agent', text('lo'))
    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect(second.entry.id).toBe(first.entry.id)
    expect(second.entry.blocks).toEqual([text('Hello')])
    expect(count(f.db, 'transcript_entries')).toBe(1)
  })

  it('starts a new message when the role changes or a tool call intervenes', () => {
    const { f, repo } = setup()
    repo.appendChunk(f.sessionId, 'thought', text('thinking'))
    const agent = repo.appendChunk(f.sessionId, 'agent', text('a'))
    expect(agent.created).toBe(true)
    repo.upsertToolCall(f.sessionId, { toolCallId: 'c1', title: 'Read' })
    const after = repo.appendChunk(f.sessionId, 'agent', text('b'))
    expect(after.created).toBe(true)
    expect(after.entry.blocks).toEqual([text('b')])
    expect(repo.list(f.sessionId).map((e) => e.kind)).toEqual(['message', 'message', 'tool_call', 'message'])
  })

  it('appends non-text chunks as new blocks without merging', () => {
    const { f, repo } = setup()
    repo.appendChunk(f.sessionId, 'agent', text('a'))
    const img: ContentBlockDto = { kind: 'image', mimeType: 'image/png', data: 'AAEC', uri: null }
    repo.appendChunk(f.sessionId, 'agent', img)
    const last = repo.appendChunk(f.sessionId, 'agent', text('b'))
    expect(last.entry.blocks).toEqual([text('a'), img, text('b')])
  })

  it('does not merge a chunk into a user message from another session', () => {
    const { f, repo } = setup()
    const other = createSession(f.db, f.folderId, f.agentId)
    repo.appendChunk(f.sessionId, 'agent', text('x'))
    expect(repo.appendChunk(other, 'agent', text('y')).created).toBe(true)
  })
})

describe('SqliteTranscriptRepository tool calls', () => {
  it('creates a tool call with defaults', () => {
    const { f, repo } = setup()
    const { entry, created } = repo.upsertToolCall(f.sessionId, { toolCallId: 'c1' })
    expect(created).toBe(true)
    expect(entry).toMatchObject({
      kind: 'tool_call',
      toolCallId: 'c1',
      title: '',
      toolKind: 'other',
      status: 'pending',
      rawInput: null,
      rawOutput: null,
      locations: [],
      contents: [],
      permission: null
    })
  })

  it('updates only provided fields and keeps the same entry', () => {
    const { f, repo } = setup()
    const a = repo.upsertToolCall(f.sessionId, {
      toolCallId: 'c1',
      title: 'Edit file',
      toolKind: 'edit',
      rawInput: '{"path":"a"}',
      locations: [{ path: 'a.ts', line: 3 }]
    })
    const b = repo.upsertToolCall(f.sessionId, { toolCallId: 'c1', status: 'in_progress' })
    expect(b.created).toBe(false)
    expect(b.entry.id).toBe(a.entry.id)
    expect(b.entry).toMatchObject({
      title: 'Edit file',
      toolKind: 'edit',
      status: 'in_progress',
      rawInput: '{"path":"a"}',
      locations: [{ path: 'a.ts', line: 3 }]
    })
    const c = repo.upsertToolCall(f.sessionId, { toolCallId: 'c1', status: 'completed', rawOutput: '"ok"', rawInput: null })
    expect(c.entry).toMatchObject({ status: 'completed', rawOutput: '"ok"', rawInput: null })
  })

  it('replaces locations and contents when provided', () => {
    const { f, repo } = setup()
    repo.upsertToolCall(f.sessionId, {
      toolCallId: 'c1',
      locations: [
        { path: 'a', line: null },
        { path: 'b', line: 9 }
      ],
      contents: [
        { kind: 'content', block: text('output') },
        { kind: 'diff', path: 'a', oldText: null, newText: 'new' },
        { kind: 'terminal', terminalId: 'term-1' },
        { kind: 'content', block: { kind: 'resource_link', uri: 'file:///x', name: 'x', mimeType: null } }
      ]
    })
    const { entry } = repo.upsertToolCall(f.sessionId, {
      toolCallId: 'c1',
      contents: [{ kind: 'diff', path: 'z', oldText: 'o', newText: 'n' }]
    })
    if (entry.kind !== 'tool_call') throw new Error('unexpected')
    expect(entry.locations).toHaveLength(2)
    expect(entry.contents).toEqual([{ kind: 'diff', path: 'z', oldText: 'o', newText: 'n' }])
    expect(count(f.db, 'content_blocks')).toBe(0)
    expect(repo.upsertToolCall(f.sessionId, { toolCallId: 'c1', locations: [] }).entry.locations).toEqual([])
  })

  it('preserves content order and block payloads', () => {
    const { f, repo } = setup()
    const contents = [
      { kind: 'content', block: text('first') },
      { kind: 'terminal', terminalId: 't' },
      { kind: 'diff', path: 'p', oldText: 'a', newText: 'b' },
      { kind: 'content', block: text('last') }
    ] as const
    const { entry } = repo.upsertToolCall(f.sessionId, { toolCallId: 'c1', contents: [...contents] })
    expect(entry.contents).toEqual(contents)
  })

  it('keeps tool call ids unique per session only', () => {
    const { f, repo } = setup()
    const other = createSession(f.db, f.folderId, f.agentId)
    const a = repo.upsertToolCall(f.sessionId, { toolCallId: 'c1' }).entry
    const b = repo.upsertToolCall(other, { toolCallId: 'c1' }).entry
    expect(a.id).not.toBe(b.id)
    expect(repo.findToolCall(f.sessionId, 'c1')?.id).toBe(a.id)
    expect(repo.findToolCall(f.sessionId, 'nope')).toBeNull()
  })

  it('shares the seq sequence with messages', () => {
    const { f, repo } = setup()
    repo.appendMessage(f.sessionId, 'user', [text('go')])
    const t = repo.upsertToolCall(f.sessionId, { toolCallId: 'c1' }).entry
    expect(t.seq).toBe(2)
  })

  it('rejects invalid enum values through CHECK constraints', () => {
    const { f, repo } = setup()
    // @ts-expect-error invalid on purpose
    expect(() => repo.upsertToolCall(f.sessionId, { toolCallId: 'c1', status: 'weird' })).toThrow(/CHECK/)
    expect(count(f.db, 'transcript_entries')).toBe(0)
  })

  it('embeds the latest permission request in the tool call entry', () => {
    const { f, repo } = setup()
    repo.upsertToolCall(f.sessionId, { toolCallId: 'c1' })
    const perms = new SqlitePermissionRepository(f.db)
    perms.create(f.sessionId, 'c1', [{ optionId: 'o', name: 'Allow', kind: 'allow_once' }])
    const second = perms.create(f.sessionId, 'c1', [{ optionId: 'p', name: 'Reject', kind: 'reject_once' }])
    const entry = repo.findToolCall(f.sessionId, 'c1')!
    expect(entry.permission).toEqual(second)
  })
})

describe('SqliteTranscriptRepository integrity', () => {
  it('lists mixed entries ordered by seq including a2ui', () => {
    const { f, repo } = setup()
    repo.appendMessage(f.sessionId, 'user', [text('1')])
    new SqliteA2uiSurfaceRepository(f.db).create(f.sessionId, { surfaceId: 's1', catalogId: 'cat', title: null })
    repo.upsertToolCall(f.sessionId, { toolCallId: 'c1' })
    const entries = repo.list(f.sessionId)
    expect(entries.map((e) => [e.seq, e.kind])).toEqual([
      [1, 'message'],
      [2, 'a2ui'],
      [3, 'tool_call']
    ])
    expect(entries[1]).toMatchObject({ kind: 'a2ui', surfaceId: 's1' })
  })

  it('clear removes entries and everything beneath them but keeps the session', () => {
    const { f, repo } = setup()
    repo.appendMessage(f.sessionId, 'user', [text('1')])
    repo.upsertToolCall(f.sessionId, {
      toolCallId: 'c1',
      locations: [{ path: 'a', line: 1 }],
      contents: [{ kind: 'content', block: text('x') }]
    })
    new SqlitePermissionRepository(f.db).create(f.sessionId, 'c1', [{ optionId: 'o', name: 'Allow', kind: 'allow_once' }])
    new SqliteA2uiSurfaceRepository(f.db).create(f.sessionId, { surfaceId: 's', catalogId: 'c', title: null })
    repo.clear(f.sessionId)
    for (const t of [
      'transcript_entries', 'messages', 'content_blocks', 'tool_calls', 'tool_call_locations',
      'tool_call_contents', 'permission_requests', 'permission_options', 'a2ui_surfaces'
    ]) {
      expect(count(f.db, t), t).toBe(0)
    }
    expect(count(f.db, 'sessions')).toBe(1)
    expect(repo.appendMessage(f.sessionId, 'user', [text('again')]).seq).toBe(1)
  })

  it('prevents a subtype row from pointing at an entry of another kind', () => {
    const { f, repo } = setup()
    const m = repo.appendMessage(f.sessionId, 'user', [text('1')])
    expect(() =>
      f.db
        .prepare("INSERT INTO tool_calls (entry_id, session_id, acp_tool_call_id, title) VALUES (?, ?, 'x', 't')")
        .run(m.id, f.sessionId)
    ).toThrow(/FOREIGN KEY/)
  })

  it('requires exactly one owner for a content block', () => {
    const { f } = setup()
    expect(() =>
      f.db.prepare("INSERT INTO content_blocks (position, kind, text) VALUES (0, 'text', 'x')").run()
    ).toThrow(/CHECK/)
  })

  it('cascades the whole transcript when the session is deleted', () => {
    const { f, repo } = setup()
    repo.appendMessage(f.sessionId, 'user', [text('1')])
    repo.upsertToolCall(f.sessionId, { toolCallId: 'c1', contents: [{ kind: 'content', block: text('x') }] })
    f.db.prepare('DELETE FROM sessions').run()
    for (const t of ['transcript_entries', 'messages', 'tool_calls', 'tool_call_contents', 'content_blocks']) {
      expect(count(f.db, t), t).toBe(0)
    }
  })
})

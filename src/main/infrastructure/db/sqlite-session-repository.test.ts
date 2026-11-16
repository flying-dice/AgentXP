import { describe, expect, it } from 'vitest'
import { SqliteDesktopRepository } from './sqlite-desktop-repository'
import { SqliteSessionRepository } from './sqlite-session-repository'
import { SqliteTranscriptRepository } from './sqlite-transcript-repository'
import { SqliteTaskRepository } from './sqlite-task-repository'
import { count, createFixture } from './test-helpers'

describe('SqliteSessionRepository', () => {
  it('creates a session with defaults', () => {
    const f = createFixture()
    const s = new SqliteSessionRepository(f.db).get(f.sessionId)
    expect(s).toMatchObject({
      cwd: 'C:\\Users\\Agent',
      agentId: f.agentId,
      title: 'Session',
      status: 'idle',
      acpSessionId: null,
      currentModeId: null,
      currentModelId: null,
      modes: [],
      models: [],
      commands: [],
      contextUsed: 0,
      contextSize: 0
    })
    expect(s?.createdAt).toMatch(/Z$/)
  })

  it('updates scalar fields and bumps updatedAt', async () => {
    const f = createFixture()
    const repo = new SqliteSessionRepository(f.db)
    const before = repo.get(f.sessionId)!.updatedAt
    await new Promise((r) => setTimeout(r, 5))
    repo.rename(f.sessionId, 'Renamed')
    repo.setStatus(f.sessionId, 'working')
    repo.setAcpSessionId(f.sessionId, 'acp-1')
    repo.setCurrentMode(f.sessionId, 'plan')
    repo.setCurrentModel(f.sessionId, 'opus')
    repo.setUsage(f.sessionId, 120, 200000)
    const s = repo.get(f.sessionId)!
    expect(s).toMatchObject({
      title: 'Renamed',
      status: 'working',
      acpSessionId: 'acp-1',
      currentModeId: 'plan',
      currentModelId: 'opus',
      contextUsed: 120,
      contextSize: 200000
    })
    expect(s.updatedAt > before).toBe(true)
    expect(repo.getByAcpSessionId(f.agentId, 'acp-1')?.id).toBe(f.sessionId)
    expect(repo.getByAcpSessionId(f.agentId, 'nope')).toBeNull()
    repo.setCurrentMode(f.sessionId, null)
    expect(repo.get(f.sessionId)!.currentModeId).toBeNull()
  })

  it('rejects invalid status through the CHECK constraint', () => {
    const f = createFixture()
    expect(() => f.db.prepare("UPDATE sessions SET status = 'bogus'").run()).toThrow(/CHECK/)
  })

  it('replaces modes, models and commands preserving order', () => {
    const f = createFixture()
    const repo = new SqliteSessionRepository(f.db)
    repo.replaceModes(f.sessionId, [
      { id: 'default', name: 'Default', description: null },
      { id: 'plan', name: 'Plan', description: 'Plan first' }
    ])
    repo.replaceModels(f.sessionId, [{ id: 'm1', name: 'M1', description: 'd' }])
    repo.replaceCommands(f.sessionId, [
      { name: 'b', description: 'B', hint: null },
      { name: 'a', description: 'A', hint: 'arg' }
    ])
    let s = repo.get(f.sessionId)!
    expect(s.modes.map((m) => m.id)).toEqual(['default', 'plan'])
    expect(s.modes[1].description).toBe('Plan first')
    expect(s.models).toEqual([{ id: 'm1', name: 'M1', description: 'd' }])
    expect(s.commands.map((c) => c.name)).toEqual(['b', 'a'])
    expect(s.commands[1].hint).toBe('arg')

    repo.replaceModes(f.sessionId, [{ id: 'x', name: 'X', description: null }])
    repo.replaceCommands(f.sessionId, [])
    s = repo.get(f.sessionId)!
    expect(s.modes.map((m) => m.id)).toEqual(['x'])
    expect(s.commands).toEqual([])
  })

  it('lists newest activity first and filters by desktop; the working directory defaults to the agent home', () => {
    const f = createFixture()
    const desktop = new SqliteDesktopRepository(f.db).create({ agentId: f.agentId, title: 'd', isOpen: false })
    const repo = new SqliteSessionRepository(f.db)
    const s2 = repo.create({ agentId: f.agentId, desktopId: desktop.id, cwd: 'E:\\src', title: 'two' })
    expect(repo.list().map((s) => s.id)).toEqual([s2.id, f.sessionId])
    expect(repo.list(desktop.id).map((s) => s.id)).toEqual([s2.id])
    expect(repo.get(f.sessionId)?.cwd).toBe('C:\\Users\\Agent')
    expect(s2.cwd).toBe('E:\\src')
  })

  it('enforces unique acp session id per agent', () => {
    const f = createFixture()
    const repo = new SqliteSessionRepository(f.db)
    const s2 = repo.create({ agentId: f.agentId, title: 'two' })
    repo.setAcpSessionId(f.sessionId, 'same')
    expect(() => repo.setAcpSessionId(s2.id, 'same')).toThrow(/UNIQUE/)
  })

  it('cascades all child data on delete', () => {
    const f = createFixture()
    const repo = new SqliteSessionRepository(f.db)
    repo.replaceModes(f.sessionId, [{ id: 'a', name: 'A', description: null }])
    repo.replaceModels(f.sessionId, [{ id: 'a', name: 'A', description: null }])
    repo.replaceCommands(f.sessionId, [{ name: 'c', description: 'd', hint: null }])
    new SqliteTranscriptRepository(f.db).appendMessage(f.sessionId, 'user', [{ kind: 'text', text: 'hi' }])
    new SqliteTaskRepository(f.db).replace(f.sessionId, [{ content: 't', priority: 'low', status: 'pending' }])
    expect(repo.remove(f.sessionId)).toBe(true)
    expect(repo.remove(f.sessionId)).toBe(false)
    for (const t of ['session_modes', 'session_models', 'session_commands', 'transcript_entries', 'messages', 'content_blocks', 'tasks']) {
      expect(count(f.db, t), t).toBe(0)
    }
  })
})

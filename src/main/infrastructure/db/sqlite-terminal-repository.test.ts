import { describe, expect, it } from 'vitest'
import { SqliteTerminalRepository } from './sqlite-terminal-repository'
import { count, createFixture, createSession } from './test-helpers'

const input = (sessionId: number, terminalId = 't1') => ({
  sessionId,
  terminalId,
  command: 'npm',
  args: ['run', 'test'],
  cwd: '/work'
})

describe('SqliteTerminalRepository', () => {
  it('creates a terminal with ordered args', () => {
    const f = createFixture()
    const repo = new SqliteTerminalRepository(f.db)
    const t = repo.create(input(f.sessionId))
    expect(t).toMatchObject({
      sessionId: f.sessionId,
      terminalId: 't1',
      command: 'npm',
      args: ['run', 'test'],
      cwd: '/work',
      output: '',
      exitCode: null,
      signal: null
    })
    expect(repo.get(f.sessionId, 't1')).toEqual(t)
    expect(repo.get(f.sessionId, 'nope')).toBeNull()
  })

  it('rejects duplicate terminal ids per session but allows them across sessions', () => {
    const f = createFixture()
    const repo = new SqliteTerminalRepository(f.db)
    repo.create(input(f.sessionId))
    expect(() => repo.create(input(f.sessionId))).toThrow(/UNIQUE/)
    expect(count(f.db, 'terminals')).toBe(1)
    repo.create(input(createSession(f.db, f.folderId, f.agentId)))
    expect(count(f.db, 'terminals')).toBe(2)
  })

  it('appends output and caps it to the last N characters', () => {
    const f = createFixture()
    const repo = new SqliteTerminalRepository(f.db)
    repo.create(input(f.sessionId))
    expect(repo.appendOutput(f.sessionId, 't1', 'hello ')?.output).toBe('hello ')
    expect(repo.appendOutput(f.sessionId, 't1', 'world')?.output).toBe('hello world')
    expect(repo.appendOutput(f.sessionId, 't1', '12345', 8)?.output).toBe('rld12345'.slice(-8))
    expect(repo.appendOutput(f.sessionId, 't1', '!', 3)?.output).toBe('45!')
    expect(repo.appendOutput(f.sessionId, 'missing', 'x')).toBeNull()
  })

  it('records exit code and signal', () => {
    const f = createFixture()
    const repo = new SqliteTerminalRepository(f.db)
    repo.create(input(f.sessionId))
    expect(repo.setExit(f.sessionId, 't1', 0, null)).toMatchObject({ exitCode: 0, signal: null })
    expect(repo.setExit(f.sessionId, 't1', null, 'SIGTERM')).toMatchObject({ exitCode: null, signal: 'SIGTERM' })
    expect(repo.list(f.sessionId)).toHaveLength(1)
  })

  it('cascades args with the session', () => {
    const f = createFixture()
    new SqliteTerminalRepository(f.db).create(input(f.sessionId))
    f.db.prepare('DELETE FROM sessions').run()
    expect(count(f.db, 'terminals')).toBe(0)
    expect(count(f.db, 'terminal_args')).toBe(0)
  })
})

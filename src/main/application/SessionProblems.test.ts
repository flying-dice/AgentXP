import { beforeEach, describe, expect, it } from 'vitest'
import { createFixture } from '../infrastructure/db/test-helpers'
import { SqliteSessionRepository } from '../infrastructure/db/sqlite-session-repository'
import { stoppedUnexpectedly } from './agentProblems'
import { ProblemAwareSessions, SessionProblems } from './SessionProblems'

const problem = { kind: 'start-failed', message: 'The agent could not start.', detail: 'x' } as const
let f: ReturnType<typeof createFixture>
let problems: SessionProblems
let sessions: ProblemAwareSessions

beforeEach(() => {
  f = createFixture()
  problems = new SessionProblems()
  sessions = new ProblemAwareSessions(new SqliteSessionRepository(f.db), problems)
})

describe('one crash mid-turn', () => {
  it('is reported by the closed connection and by the failed turn but counts once, so the first-crash buttons (Restart and send again) show', () => {
    problems.set(f.sessionId, stoppedUnexpectedly(new Error('ACP connection closed')))
    problems.set(f.sessionId, stoppedUnexpectedly(new Error('ACP connection closed')))
    const crash = problems.get(f.sessionId)!
    expect(crash.failures).toBe(1)
  })
  it('a second crash after a restart is the second failure', () => {
    problems.set(f.sessionId, stoppedUnexpectedly(new Error('x')))
    problems.clear(f.sessionId)
    problems.set(f.sessionId, stoppedUnexpectedly(new Error('x')))
    expect(problems.get(f.sessionId)?.failures).toBe(2)
  })
})

describe('ProblemAwareSessions', () => {
  it('attaches the problem to the row and takes it away when cleared', () => {
    expect(sessions.get(f.sessionId)?.problem).toBeUndefined()
    problems.set(f.sessionId, problem)
    expect(sessions.get(f.sessionId)?.problem).toEqual({ ...problem, failures: 1 })
    expect(sessions.list().find((s) => s.id === f.sessionId)?.problem).toEqual({ ...problem, failures: 1 })
    problems.clear(f.sessionId)
    expect(sessions.get(f.sessionId)?.problem).toBeUndefined()
  })
  it('counts failures in a row; clear keeps the count, recovered resets it', () => {
    problems.set(f.sessionId, problem)
    problems.clear(f.sessionId)
    problems.set(f.sessionId, problem)
    expect(problems.get(f.sessionId)?.failures).toBe(2)
    problems.recovered(f.sessionId)
    expect(problems.get(f.sessionId)).toBeNull()
    problems.set(f.sessionId, problem)
    expect(problems.get(f.sessionId)?.failures).toBe(1)
  })
  it('forgets the problem of a removed session', () => {
    problems.set(f.sessionId, problem)
    sessions.remove(f.sessionId)
    expect(problems.get(f.sessionId)).toBeNull()
  })
})

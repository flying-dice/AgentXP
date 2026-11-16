import { beforeEach, describe, expect, it } from 'vitest'
import { createFixture } from '../infrastructure/db/test-helpers'
import { SqliteSessionRepository } from '../infrastructure/db/sqlite-session-repository'
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

describe('ProblemAwareSessions', () => {
  it('attaches the problem to the row and takes it away when cleared', () => {
    expect(sessions.get(f.sessionId)?.problem).toBeUndefined()
    problems.set(f.sessionId, problem)
    expect(sessions.get(f.sessionId)?.problem).toEqual(problem)
    expect(sessions.list().find((s) => s.id === f.sessionId)?.problem).toEqual(problem)
    problems.clear(f.sessionId)
    expect(sessions.get(f.sessionId)?.problem).toBeUndefined()
  })
  it('forgets the problem of a removed session', () => {
    problems.set(f.sessionId, problem)
    sessions.remove(f.sessionId)
    expect(problems.get(f.sessionId)).toBeNull()
  })
})

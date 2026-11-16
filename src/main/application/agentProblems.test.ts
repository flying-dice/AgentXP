import { describe, expect, it } from 'vitest'
import { AppError } from './errors'
import { endedByUser, isConnectionLoss, startFailure, stoppedUnexpectedly } from './agentProblems'

const agent = { name: 'Claude Code', command: 'C:\\tools\\not-a-real-command.exe' }

describe('startFailure', () => {
  it('names the program (without its folder) when it was not found, and keeps the raw error as detail', () => {
    const problem = startFailure(new Error('spawn C:\\tools\\not-a-real-command.exe ENOENT'), agent)
    expect(problem.kind).toBe('start-failed')
    expect(problem.message).toBe("The agent could not start. The program 'not-a-real-command.exe' was not found.")
    expect(problem.detail).toContain('ENOENT')
  })
  it('explains a refused program and any other stop in plain words', () => {
    expect(startFailure(new Error('spawn EACCES'), agent).message).toContain('did not allow it')
    expect(startFailure(new Error('exit code 1'), agent).message).toContain('stopped before it was ready')
  })
  it('uses the message of our own errors', () => {
    expect(startFailure(new AppError('The drive E: was removed.'), agent).message).toBe('The agent could not start. The drive E: was removed.')
  })
})

describe('other problems', () => {
  it('describes an agent that stopped and one that Task Manager ended', () => {
    expect(stoppedUnexpectedly(new Error('ACP connection closed'))).toMatchObject({ kind: 'agent-stopped', detail: 'ACP connection closed' })
    expect(endedByUser()).toMatchObject({ kind: 'agent-ended', message: 'The agent program was stopped.' })
  })
  it('tells a lost connection from an error the agent reported', () => {
    expect(isConnectionLoss(new Error('ACP connection closed'))).toBe(true)
    expect(isConnectionLoss(new Error('Rate limit'))).toBe(false)
  })
})

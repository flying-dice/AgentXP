import { describe, expect, it } from 'vitest'
import { describeProblem, logLines, problemDetails, sendStateOf } from './chatProblem'

const stopped = { kind: 'agent-stopped', message: 'The agent stopped unexpectedly. Your request was not finished.', detail: 'ACP connection closed' } as const
const notFound = { kind: 'start-failed', message: "The agent could not start. The program 'not-a-real-command' was not found.", detail: 'spawn not-a-real-command ENOENT' } as const

describe('describeProblem', () => {
  it('says nothing when nothing is wrong', () => {
    expect(describeProblem({ error: null, problem: null, failed: null })).toBeNull()
  })

  it('an agent that stopped mid-turn: plain words, Restart and send again, the technical text only behind Details', () => {
    const result = describeProblem({ error: 'ACP connection closed', problem: stopped, failed: { unanswered: true } })!
    expect(result.text).toBe('The agent stopped unexpectedly. Your request was not finished.')
    expect(result.text).not.toMatch(/ACP/)
    expect(result.actions.map((a) => a.label)).toEqual(['Restart and send again', 'Details...', 'Show in Event Viewer'])
    expect(result.detail).toBe('ACP connection closed')
  })

  it('an agent that stopped with nothing to send again offers Restart', () => {
    expect(describeProblem({ error: null, problem: stopped, failed: null })!.actions[0]).toEqual({ id: 'restart', label: 'Restart' })
  })

  it('an agent that cannot start names the program and keeps the message to send again', () => {
    const result = describeProblem({ error: 'spawn x ENOENT', problem: notFound, failed: { unanswered: true } })!
    expect(result.text).toContain("'not-a-real-command' was not found")
    expect(result.text).toContain('Your message was not sent.')
    expect(result.actions.map((a) => a.id)).toEqual(['send-again', 'details'])
  })

  it('an agent ended from Task Manager says so and offers Restart', () => {
    const ended = { kind: 'agent-ended', message: 'The agent program was stopped.', detail: 'x' } as const
    expect(describeProblem({ error: null, problem: ended, failed: null })).toMatchObject({ text: 'The agent program was stopped.', actions: [{ id: 'restart', label: 'Restart' }] })
  })

  it('a dropped connection without a known problem is a failed send with Send again', () => {
    const result = describeProblem({ error: 'ACP connection closed', problem: null, failed: { unanswered: true } })!
    expect(result.text).toBe('Your message could not be sent because the connection to the agent dropped.')
    expect(result.actions.map((a) => a.id)).toEqual(['send-again', 'details'])
  })

  it('an error the agent reported itself is shown as it came, with Send again when nothing was answered', () => {
    expect(describeProblem({ error: 'Rate limit', problem: null, failed: null })).toEqual({ text: 'Rate limit', detail: null, actions: [] })
    expect(describeProblem({ error: 'Rate limit', problem: null, failed: { unanswered: true } })).toEqual({ text: 'Rate limit', detail: null, actions: [{ id: 'send-again', label: 'Send again' }] })
  })
})

describe('sendStateOf', () => {
  const failed = { messageId: 'm1', unanswered: true }
  it('marks the failed message Not sent, or Stopped when the agent had started on it', () => {
    expect(sendStateOf('m1', failed, true)).toBe('not-sent')
    expect(sendStateOf('m1', { ...failed, unanswered: false }, true)).toBe('stopped')
  })
  it('leaves other messages and failures without a known problem alone', () => {
    expect(sendStateOf('m2', failed, true)).toBe('sent')
    expect(sendStateOf('m1', failed, false)).toBe('sent')
    expect(sendStateOf('m1', null, true)).toBe('sent')
  })
})

describe('problemDetails and logLines', () => {
  it('appends the last log lines to the technical text', () => {
    expect(problemDetails('ACP connection closed', ['10:42:07 ACP session/prompt'])).toBe('ACP connection closed\n\nLast lines of the log:\n10:42:07 ACP session/prompt')
    expect(problemDetails(null, [])).toBe('There is nothing more to show.')
  })

  it('formats the newest events, oldest first', () => {
    const events = ['a', 'b', 'c'].map((name, i) => ({ at: `2026-11-16T10:42:0${i}.000Z`, source: 'acp' as const, name, level: i === 2 ? ('error' as const) : ('info' as const) }))
    expect(logLines(events, 2)).toEqual(['10:42:01 ACP b', '10:42:02 ACP c (error)'])
  })
})

import { describe, expect, it } from 'vitest'
import { describeProblem, logLines, plainError, problemDetails, sendStateOf } from './chatProblem'

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
    expect(result.actions.map((a) => a.id)).toEqual(['send-again', 'open-agents', 'choose-agent', 'details'])
  })

  it('an agent that cannot start offers Try again, Open Agents and Choose another agent, and names the new default agent', () => {
    expect(describeProblem({ error: null, problem: notFound, failed: null })!.actions.map((a) => a.label)).toEqual(['Try again', 'Open Agents', 'Choose another agent', 'Details...'])
    expect(describeProblem({ error: null, problem: notFound, failed: null, newDefaultAgent: 'Claude Code' })!.actions[0]).toEqual({ id: 'restart', label: 'Try again with Claude Code' })
  })

  it('a second failure in a row adds the cause and swaps Restart and send again for Start a new chat', () => {
    const again = { ...stopped, failures: 2, cause: 'The agent program closed the connection.' }
    const result = describeProblem({ error: null, problem: again, failed: { unanswered: true } })!
    expect(result.text).toBe('The agent stopped unexpectedly. Your request was not finished.\nIt stopped again: the agent program closed the connection. Show in Event Viewer shows the details.')
    expect(result.actions.map((a) => a.label)).toEqual(['Restart', 'Start a new chat (your text is kept in the box)', 'Details...', 'Show in Event Viewer'])
    expect(describeProblem({ error: null, problem: again, failed: null })!.actions.map((a) => a.label)).toContain('Start a new chat')
    const first = describeProblem({ error: null, problem: { ...again, failures: 1 }, failed: { unanswered: true } })!
    expect(first.text).not.toMatch(/stopped again/)
    expect(first.actions[0].label).toBe('Restart and send again')
  })

  it('a second start failure names the plain cause and offers a new chat', () => {
    const result = describeProblem({ error: null, problem: { ...notFound, failures: 2, cause: "The program 'x' was not found." }, failed: null })!
    expect(result.text).toContain("It stopped again: the program 'x' was not found. Show in Event Viewer")
    expect(result.actions.map((a) => a.id)).toEqual(['restart', 'open-agents', 'choose-agent', 'new-chat', 'event-viewer', 'details'])
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
    expect(describeProblem({ error: 'Rate limit', problem: null, failed: null })).toEqual({ text: 'Rate limit', detail: null, actions: [], status: 'Rate limit' })
    expect(describeProblem({ error: 'Rate limit', problem: null, failed: { unanswered: true } })).toEqual({ text: 'Rate limit', detail: null, actions: [{ id: 'send-again', label: 'Send again' }], status: 'Rate limit' })
  })

  it('the status bar gets one plain sentence and a next step, never the connection text (ACP closed)', () => {
    const closed = describeProblem({ error: 'ACP connection closed', problem: stopped, failed: null })!
    expect(closed.status).toBe('The agent stopped. Click Restart, then send your message again.')
    expect(describeProblem({ error: 'ACP connection closed', problem: stopped, failed: { unanswered: true } })!.status).toBe('The agent stopped. Click Restart and send again.')
    expect(describeProblem({ error: null, problem: { ...stopped, failures: 2 }, failed: null })!.status).toBe('The agent stopped again. Click Restart, or start a new chat.')
    for (const text of [closed.status, describeProblem({ error: 'ACP connection closed', problem: null, failed: null })!.status]) expect(text).not.toMatch(/ACP|connection closed/)
  })

  it('a program that does not start (spawn error) says so with the next step', () => {
    const result = describeProblem({ error: null, problem: notFound, failed: null })!
    expect(result.status).toBe("The agent could not start. The program 'not-a-real-command' was not found. Click Try again, or open Agents to change the command.")
    const raw = describeProblem({ error: 'spawn x ENOENT', problem: null, failed: null })!
    expect(raw).toMatchObject({ text: 'The agent could not start.', detail: 'spawn x ENOENT', status: 'The agent could not start. Open Agents to check its command.' })
  })

  it('names the agent in the start failure: "My assistant could not start: the program x was not found."', () => {
    const result = describeProblem({ error: null, problem: notFound, failed: null, agentName: 'My assistant' })!
    expect(result.text).toBe("My assistant could not start: the program 'not-a-real-command' was not found.")
    expect(result.status).toBe("My assistant could not start: the program 'not-a-real-command' was not found. Click Try again, or open Agents to change the command.")
    expect(describeProblem({ error: null, problem: notFound, failed: { unanswered: true }, agentName: 'My assistant' })!.text).toBe("My assistant could not start: the program 'not-a-real-command' was not found. Your message was not sent.")
    expect(`${result.text} ${result.status}`).not.toMatch(/ERR_|ENOENT/)
  })

  it('a timeout is plain too, with Send again for a message nobody answered', () => {
    const result = describeProblem({ error: 'Request timed out after 60000ms', problem: null, failed: { unanswered: true } })!
    expect(result).toMatchObject({ text: 'The agent did not answer in time.', status: 'The agent did not answer in time. Click Send again to try again.' })
    expect(result.actions.map((a) => a.id)).toEqual(['send-again', 'details'])
  })

  it('keeps the sentence of the agent when one is left after the protocol words', () => {
    expect(describeProblem({ error: 'Internal error: Scripted expectation failed', problem: null, failed: null })?.text).toBe('Internal error: Scripted expectation failed')
    expect(describeProblem({ error: 'JSON-RPC error -32603: Scripted expectation failed', problem: null, failed: null })?.text).toBe('Scripted expectation failed')
  })

  it('other technical text is replaced by one sentence and kept behind Details', () => {
    expect(describeProblem({ error: 'JSON-RPC error -32603', problem: null, failed: null })).toMatchObject({ text: 'Something went wrong while the agent worked.', detail: 'JSON-RPC error -32603' })
  })
})

describe('plainError', () => {
  it('keeps the agent words and says nothing about plain text', () => {
    expect(plainError('Rate limit', false)).toBeNull()
    expect(plainError('ACP connection closed', false)?.text).toBe('The agent stopped before it finished.')
  })
})

describe('a first crash (failures 1, as main records one crash)', () => {
  it('offers Restart and send again and does not say it stopped again', () => {
    const shown = describeProblem({ error: 'ACP connection closed', problem: { ...stopped, failures: 1 }, failed: { unanswered: true } })!
    expect(shown.actions.map((a) => a.label)).toEqual(['Restart and send again', 'Details...', 'Show in Event Viewer'])
    expect(shown.text).not.toMatch(/stopped again/)
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

import { describe, expect, it } from 'vitest'
import { ENDED_TEXT, TECHNICAL_HEADING, chooseAgentFirst, defaultActionId, describeProblem, detailWithLead, startNextStep, logLines, plainError, problemDetails, sendStateOf } from './chatProblem'

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
    expect(result.actions.map((a) => a.label)).toEqual(['Restart and send again', 'Details...', 'Event Viewer'])
    expect(result.detail).toBe('The agent stopped unexpectedly. Your request was not finished.\n\n------------------------------\nTechnical details\nACP connection closed')
  })

  it('an agent that stopped with nothing to send again offers Restart', () => {
    expect(describeProblem({ error: null, problem: stopped, failed: null })!.actions[0]).toEqual({ id: 'restart', label: 'Restart' })
  })

  it('an agent that cannot start names the program and keeps the message to send again', () => {
    const result = describeProblem({ error: 'spawn x ENOENT', problem: notFound, failed: { unanswered: true } })!
    expect(result.text).toContain("'not-a-real-command' was not found")
    expect(result.text).toContain('Your message was not sent.')
    expect(result.actions.map((a) => a.id)).toEqual(['choose-agent', 'send-again', 'open-agents', 'details'])
  })

  it('a program that is not there offers Choose another agent first (highlighted), then Try again, and names the new default agent', () => {
    expect(describeProblem({ error: null, problem: notFound, failed: null })!.actions.map((a) => a.label)).toEqual(['Choose another agent', 'Try again', 'Open Agents', 'Details...'])
    expect(describeProblem({ error: null, problem: notFound, failed: null, newDefaultAgent: 'Claude Code' })!.actions[1]).toEqual({ id: 'restart', label: 'Try again with Claude Code' })
  })

  it('a program that stops at once keeps Try again first until the second failure', () => {
    const early = { kind: 'start-failed', message: "The agent could not start. The program 'npx' stopped before it was ready.", detail: 'Query closed before response received', cause: "The program 'npx' stopped before it was ready." } as const
    expect(describeProblem({ error: null, problem: early, failed: null })!.actions.map((a) => a.id)).toEqual(['restart', 'open-agents', 'choose-agent', 'details'])
    expect(describeProblem({ error: null, problem: { ...early, failures: 2 }, failed: null })!.actions.map((a) => a.id)).toEqual(['choose-agent', 'restart', 'open-agents', 'new-chat', 'event-viewer', 'details'])
  })

  it('names the next step by cause, and Details starts with the plain sentence, never Internal error (UX-174)', () => {
    const early = { kind: 'start-failed', message: "The agent could not start. The program 'npx' stopped before it was ready.", detail: 'Internal error\nQuery closed before response received', cause: "The program 'npx' stopped before it was ready." } as const
    expect(describeProblem({ error: null, problem: notFound, failed: null })!.text).toBe("The agent could not start. The program 'not-a-real-command' was not found. Check the command in Agents, or choose another agent.")
    const shown = describeProblem({ error: null, problem: early, failed: null })!
    expect(shown.text).toBe("The agent could not start. The program 'npx' stopped before it was ready. Check that it is installed, or choose another agent.")
    expect(shown.detail?.startsWith('The agent could not start.')).toBe(true)
    expect(shown.detail).toContain('Internal error')
    expect(shown.detail).not.toMatch(/^Internal error/)
    // UX-196: the sentence, then what to do, then the protocol lines under "Technical details".
    const lines = shown.detail!.split('\n')
    expect(lines[0]).toBe(shown.text)
    expect(lines[1]).toBe('What to do: open Agents and choose another agent.')
    expect(lines.indexOf(TECHNICAL_HEADING)).toBeGreaterThan(1)
    expect(lines.indexOf('Internal error')).toBeGreaterThan(lines.indexOf(TECHNICAL_HEADING))
    // Even with no technical text at all, Details are the plain sentence and what to do, never empty or "Internal error".
    expect(describeProblem({ error: null, problem: { ...early, detail: '' }, failed: null })!.detail).toBe(`${shown.text}\nWhat to do: open Agents and choose another agent.`)
    expect(startNextStep({ message: 'The agent could not start. The folder is gone.' })).toBe('')
  })

  it('after the default agent changed the box says so and keeps Choose another agent highlighted', () => {
    const changed = { ...notFound, kind: 'start-failed', message: "The agent could not start. The program 'npx' stopped before it was ready.", cause: "The program 'npx' stopped before it was ready.", failures: 2, agentName: 'Claude Code', agentChanged: true } as const
    const shown = describeProblem({ error: null, problem: changed, failed: null, agentName: 'Claude Code' })!
    expect(shown.text).toBe("The default agent is now Claude Code. It could not start either. The program 'npx' stopped before it was ready. Check that it is installed, or choose another agent.")
    expect(defaultActionId(shown.actions)).toBe('choose-agent')
  })

  it('a second failure in a row adds the cause and swaps Restart and send again for Start a new chat', () => {
    const again = { ...stopped, failures: 2, cause: 'The agent program closed the connection.' }
    const result = describeProblem({ error: null, problem: again, failed: { unanswered: true } })!
    expect(result.text).toBe('The agent stopped unexpectedly. Your request was not finished.\nIt stopped again: the agent program closed the connection.')
    expect(result.actions.map((a) => a.label)).toEqual(['Restart', 'Start a new chat with your text', 'Details...', 'Event Viewer'])
    expect(describeProblem({ error: null, problem: again, failed: null })!.actions.map((a) => a.label)).toContain('Start a new chat')
    const first = describeProblem({ error: null, problem: { ...again, failures: 1 }, failed: { unanswered: true } })!
    expect(first.text).not.toMatch(/stopped again/)
    expect(first.actions[0].label).toBe('Restart and send again')
  })

  it('a second start failure names the plain cause and offers a new chat', () => {
    const result = describeProblem({ error: null, problem: { ...notFound, failures: 2, cause: "The program 'x' was not found." }, failed: null })!
    expect(result.text).toContain("It stopped again: the program 'x' was not found.")
    expect(result.actions.map((a) => a.id)).toEqual(['choose-agent', 'restart', 'open-agents', 'new-chat', 'event-viewer', 'details'])
  })

  it('an agent ended from Task Manager says so and offers Restart', () => {
    const ended = { kind: 'agent-ended', message: 'The agent program was stopped.', detail: 'x' } as const
    expect(describeProblem({ error: null, problem: ended, failed: null })).toMatchObject({ text: ENDED_TEXT, notice: true, actions: [{ id: 'restart', label: 'Restart' }] })
  })

  it('after the user ended the program, Restart only starts it: nothing is sent again, also with a failed message (UX-201)', () => {
    const ended = { kind: 'agent-ended', message: 'The agent program was stopped.', detail: 'x' } as const
    const shown = describeProblem({ error: null, problem: ended, failed: { unanswered: false } })!
    expect(shown.actions.map((a) => a.id)).toEqual(['restart'])
    expect(shown.text).toBe('You ended the agent program. Click Restart to use the chat again.')
    expect(shown.status).toBe('You ended the agent program. Click Restart.')
  })

  it('a dropped connection without a known problem is a failed send with Send again', () => {
    const result = describeProblem({ error: 'ACP connection closed', problem: null, failed: { unanswered: true } })!
    expect(result.text).toBe('Your message could not be sent because the connection to the agent dropped. Click Send again to try again.')
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
    expect(result.status).toBe("The agent could not start. The program 'not-a-real-command' was not found. Check the command in Agents, or choose another agent.")
    const raw = describeProblem({ error: 'spawn x ENOENT', problem: null, failed: null })!
    expect(raw).toMatchObject({ text: 'The agent could not start.', detail: 'The agent could not start.\n\n------------------------------\nTechnical details\nspawn x ENOENT', status: 'The agent could not start. Open Agents to check its command.' })
  })

  it('names the agent in the start failure: "My assistant could not start: the program x was not found."', () => {
    const result = describeProblem({ error: null, problem: notFound, failed: null, agentName: 'My assistant' })!
    expect(result.text).toBe("My assistant could not start: the program 'not-a-real-command' was not found. Check the command in Agents, or choose another agent.")
    expect(result.status).toBe("My assistant could not start: the program 'not-a-real-command' was not found. Check the command in Agents, or choose another agent.")
    expect(describeProblem({ error: null, problem: notFound, failed: { unanswered: true }, agentName: 'My assistant' })!.text).toBe("My assistant could not start: the program 'not-a-real-command' was not found. Check the command in Agents, or choose another agent. Your message was not sent.")
    expect(`${result.text} ${result.status}`).not.toMatch(/ERR_|ENOENT/)
  })

  it('a timeout is plain too, with Send again for a message nobody answered', () => {
    const result = describeProblem({ error: 'Request timed out after 60000ms', problem: null, failed: { unanswered: true } })!
    expect(result).toMatchObject({ text: 'The agent did not answer in time. Click Send again to try again.', status: 'No answer in time. Click Send again.' })
    expect(result.actions.map((a) => a.id)).toEqual(['send-again', 'details'])
  })

  it('a step that timed out inside the agent work is not "the agent did not answer" (UX-195)', () => {
    const error = 'Timed out after 5183 ms waiting for "Standup notes"'
    const result = describeProblem({ error, problem: null, failed: { unanswered: false } })!
    expect(result.text).toBe('A step took too long (waiting for the page). Click Send again to try again.')
    expect(result.status).toBe('A step took too long. Click Send again.')
    expect(result.actions.map((a) => a.id)).toEqual(['send-again', 'details'])
    expect(defaultActionId(result.actions)).toBe('send-again')
    expect(result.detail?.startsWith('A step took too long')).toBe(true)
  })

  it('a message that was answered with steps and then timed out stopped before it finished, and offers Send again (UX-195)', () => {
    const result = describeProblem({ error: 'Request timed out after 60000ms', problem: null, failed: { unanswered: false } })!
    expect(result.text).toBe('The agent stopped before it finished. Click Send again to try again.')
    expect(result.actions[0]).toEqual({ id: 'send-again', label: 'Send again' })
  })

  it('every status line of a failed turn fits the status field (40 letters)', () => {
    for (const error of ['Request timed out after 60000ms', 'Timed out after 5183 ms waiting for "x"', 'ACP connection closed', 'JSON-RPC error -32603'])
      for (const unanswered of [true, false]) expect(describeProblem({ error, problem: null, failed: { unanswered } })!.status.length).toBeLessThanOrEqual(40)
  })

  it('keeps the sentence of the agent when one is left after the protocol words', () => {
    expect(describeProblem({ error: 'Internal error: Scripted expectation failed', problem: null, failed: null })?.text).toBe('Internal error: Scripted expectation failed')
    expect(describeProblem({ error: 'JSON-RPC error -32603: Scripted expectation failed', problem: null, failed: null })?.text).toBe('Scripted expectation failed')
  })

  it('other technical text is replaced by one sentence and kept behind Details', () => {
    expect(describeProblem({ error: 'JSON-RPC error -32603', problem: null, failed: null })).toMatchObject({ text: 'Something went wrong while the agent worked.', detail: 'Something went wrong while the agent worked.\n\n------------------------------\nTechnical details\nJSON-RPC error -32603' })
  })
})

describe('plainError', () => {
  it('keeps the agent words and says nothing about plain text', () => {
    expect(plainError('Rate limit', false)).toBeNull()
    expect(plainError('ACP connection closed', false)?.text).toBe('The agent stopped before it finished.')
    expect(plainError('ACP connection closed', false, true)?.text).toBe('The agent stopped before it finished. Click Send again to try again.')
  })
})

describe('a first crash (failures 1, as main records one crash)', () => {
  it('offers Restart and send again and does not say it stopped again', () => {
    const shown = describeProblem({ error: 'ACP connection closed', problem: { ...stopped, failures: 1 }, failed: { unanswered: true } })!
    expect(shown.actions.map((a) => a.label)).toEqual(['Restart and send again', 'Details...', 'Event Viewer'])
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
  it('marks a cut-off message Stopped once and its repeat Sent again (UX-201)', () => {
    const marks = { stoppedIds: new Set(['m1']), resentIds: new Set(['m2']) }
    expect(sendStateOf('m1', null, false, marks)).toBe('stopped')
    expect(sendStateOf('m2', null, false, marks)).toBe('sent-again')
    expect(sendStateOf('m3', null, false, marks)).toBe('sent')
    // A repeat that failed again is the failed one: it reads Stopped, not Sent again.
    expect(sendStateOf('m2', { messageId: 'm2', unanswered: false }, true, marks)).toBe('stopped')
  })
})

describe('problemDetails and logLines', () => {
  it('appends the last log lines to the technical text', () => {
    expect(problemDetails('ACP connection closed', ['10:42:07 ACP session/prompt'])).toBe('ACP connection closed\n\n------------------------------\nTechnical details\nLast lines of the log:\n10:42:07 ACP session/prompt')
    // A text that already has the heading gets the log under it, without a second heading.
    const detail = detailWithLead('One.', 'tech')
    expect(problemDetails(detail, ['a'])).toBe(`${detail}\n\nLast lines of the log:\na`)
    expect(problemDetails(null, [])).toBe('There is nothing more to show.')
  })

  it('formats the newest events, oldest first', () => {
    const events = ['a', 'b', 'c'].map((name, i) => ({ at: `2026-11-16T10:42:0${i}.000Z`, source: 'acp' as const, name, level: i === 2 ? ('error' as const) : ('info' as const) }))
    expect(logLines(events, 2)).toEqual(['10:42:01 ACP b', '10:42:02 ACP c (error)'])
  })
})

describe('defaultActionId (UX-160)', () => {
  const id = (input: Parameters<typeof describeProblem>[0]): string | null => defaultActionId(describeProblem(input)!.actions)

  it('is the recovery that works, never Details or Event Viewer', () => {
    expect(id({ error: null, problem: stopped, failed: null })).toBe('restart')
    expect(id({ error: null, problem: stopped, failed: { unanswered: true } })).toBe('restart-send')
    expect(id({ error: null, problem: { ...stopped, failures: 2 }, failed: { unanswered: true } })).toBe('restart')
    expect(id({ error: null, problem: { ...stopped, kind: 'agent-ended', failures: 2 }, failed: null })).toBe('restart')
    expect(id({ error: 'Request timed out', problem: null, failed: { unanswered: true } })).toBe('send-again')
  })
  it('is Choose another agent for a program that is not there, and for any start that failed twice (UX-174)', () => {
    expect(id({ error: null, problem: notFound, failed: null })).toBe('choose-agent')
    expect(id({ error: null, problem: { ...notFound, failures: 1 }, failed: { unanswered: true } })).toBe('choose-agent')
    const early = { kind: 'start-failed', message: "The agent could not start. The program 'npx' stopped before it was ready.", detail: 'x' } as const
    expect(id({ error: null, problem: early, failed: null })).toBe('restart')
    expect(id({ error: null, problem: { ...early, failures: 2 }, failed: null })).toBe('choose-agent')
    expect(chooseAgentFirst({ message: 'The agent could not start. The folder is gone.', failures: 3 })).toBe(true)
    expect(detailWithLead('One.\nTwo.', 'tech')).toBe('One.\n\n------------------------------\nTechnical details\ntech')
    expect(detailWithLead('One.', null)).toBe('One.')
    expect(detailWithLead('One.', 'tech', 'Do this.')).toBe('One.\nDo this.\n\n------------------------------\nTechnical details\ntech')
  })
  it('is none when there is nothing to retry', () => {
    expect(id({ error: 'Rate limit', problem: null, failed: null })).toBeNull()
    expect(defaultActionId([{ id: 'details', label: 'Details...' }])).toBeNull()
  })
})

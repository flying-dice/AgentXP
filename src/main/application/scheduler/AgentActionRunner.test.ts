import { describe, expect, it } from 'vitest'
import type { AgentDto, Id, SessionDto } from '@shared/models'
import { newAgentAction, type AgentActionDto } from '@shared/scheduler'
import type { PromptTurnInput } from '../SessionService'
import type { StopReason } from '../ports'
import { AgentActionRunner, scheduledChatTitle, type ActionChats } from './AgentActionRunner'
import type { ActionRunInput } from './ports'

const agent = (id: number): AgentDto => ({ id, name: `Agent ${id}`, command: 'x', args: [], env: {}, isDefault: id === 1, defaultModeId: null })
const session = (id: Id, over: Partial<SessionDto> = {}): SessionDto =>
  ({ id, agentId: 1, role: 'chat', desktopId: 5, cwd: 'E:\\', title: 'New chat', status: 'idle', acpSessionId: null, currentModeId: null, currentModelId: null, modes: [], models: [], commands: [], contextUsed: 0, contextSize: 0, createdAt: '', updatedAt: '', ...over }) as SessionDto

function setup(options: { reason?: StopReason | Error; hold?: boolean; sessions?: SessionDto[] } = {}) {
  const calls: string[] = []
  const prompts: PromptTurnInput[] = []
  let release: (reason: StopReason) => void = () => {}
  const chats: ActionChats = {
    create: async (desktopId, agentId, cwd) => {
      calls.push(`create ${desktopId} ${agentId} ${cwd}`)
      return session(42, { agentId })
    },
    rename: (id, title) => void calls.push(`rename ${id} ${title}`),
    promptTurn: async (input) => {
      prompts.push(input)
      if (options.reason instanceof Error) throw options.reason
      if (options.hold) return new Promise<StopReason>((resolve) => (release = resolve))
      return options.reason ?? 'end_turn'
    },
    cancel: async (id) => {
      calls.push(`cancel ${id}`)
      release('cancelled')
    }
  }
  const known = options.sessions ?? [session(7)]
  const runner = new AgentActionRunner({ chats, sessions: { get: (id) => known.find((s) => s.id === id) ?? null }, agents: { get: (id) => (id === 1 || id === 2 ? agent(id) : null), getDefault: () => agent(1) } })
  const controller = new AbortController()
  const seen: Id[] = []
  const input = (action: AgentActionDto): ActionRunInput => ({ desktopId: 5, taskName: 'Nightly review', action, signal: controller.signal, startedAt: new Date(2026, 10, 17, 9, 5), onSession: (id) => void seen.push(id) })
  return { runner, calls, prompts, controller, seen, input, release: (r: StopReason) => release(r) }
}

const action = (over: Partial<AgentActionDto> = {}): AgentActionDto => ({ ...newAgentAction('E:\\'), prompt: 'Review the changes.', ...over })

describe('AgentActionRunner', () => {
  it('starts a chat in the project, names it after the task and sends the prompt', async () => {
    const t = setup()
    const result = await t.runner.run(t.input(action({ agentId: 2 })))
    expect(result).toEqual({ result: 'success', message: 'The agent finished its turn.', sessionId: 42 })
    expect(t.calls).toEqual(['create 5 2 E:\\', 'rename 42 Nightly review - 11/17 09:05'])
    expect(t.prompts).toEqual([{ sessionId: 42, text: 'Review the changes.', attachments: [] }])
    expect(t.seen).toEqual([42])
  })

  it('uses the default agent when the action names none', async () => {
    const t = setup()
    await t.runner.run(t.input(action()))
    expect(t.calls[0]).toBe('create 5 1 E:\\')
  })

  it('sends the prompt to an existing chat of the desktop without starting one', async () => {
    const t = setup()
    const result = await t.runner.run(t.input(action({ session: 'existing', sessionId: 7 })))
    expect(result).toMatchObject({ result: 'success', sessionId: 7 })
    expect(t.calls).toEqual([])
    expect(t.prompts[0].sessionId).toBe(7)
  })

  it('fails with a sentence when the chat is gone, on another desktop or busy', async () => {
    const gone = setup()
    expect(await gone.runner.run(gone.input(action({ session: 'existing', sessionId: 99 })))).toMatchObject({ result: 'failed', message: 'The chat of this task no longer exists.' })
    const other = setup({ sessions: [session(7, { desktopId: 6 })] })
    expect(await other.runner.run(other.input(action({ session: 'existing', sessionId: 7 })))).toMatchObject({ result: 'failed', message: 'The chat of this task no longer exists.' })
    const unlinked = setup()
    expect(await unlinked.runner.run(unlinked.input(action({ session: 'existing', sessionId: null })))).toMatchObject({ result: 'failed' })
    const busy = setup({ sessions: [session(7, { status: 'working' })] })
    expect(await busy.runner.run(busy.input(action({ session: 'existing', sessionId: 7 })))).toMatchObject({ result: 'failed', message: 'The chat is busy with another message.' })
  })

  it('fails with a sentence when the agent does not exist', async () => {
    const t = setup()
    expect(await t.runner.run(t.input(action({ agentId: 9 })))).toMatchObject({ result: 'failed', message: 'The agent of this task no longer exists.' })
    expect(t.calls).toEqual([])
  })

  it('fails when the chat cannot start or the turn throws, with the message of the error', async () => {
    const t = setup({ reason: new Error('The agent program stopped.') })
    expect(await t.runner.run(t.input(action()))).toEqual({ result: 'failed', message: 'The agent program stopped.', sessionId: 42 })
  })

  it('says why an agent stopped before it finished', async () => {
    for (const [reason, text] of [
      ['max_tokens', 'too long'],
      ['max_turn_requests', 'limit of steps'],
      ['refusal', 'refused']
    ] as const) {
      const t = setup({ reason })
      const result = await t.runner.run(t.input(action()))
      expect(result.result).toBe('failed')
      expect(result.message).toContain(text)
    }
  })

  it('cancels the turn of the chat when the run is aborted, and reports it as stopped', async () => {
    const t = setup({ hold: true })
    const done = t.runner.run(t.input(action()))
    await Promise.resolve()
    await new Promise((resolve) => setImmediate(resolve))
    t.controller.abort()
    expect(await done).toMatchObject({ result: 'stopped', sessionId: 42 })
    expect(t.calls).toContain('cancel 42')
  })

  it('does nothing when it is aborted before it starts', async () => {
    const t = setup()
    t.controller.abort()
    expect(await t.runner.run(t.input(action()))).toEqual({ result: 'stopped', message: 'The agent was stopped before it finished.', sessionId: null })
    expect(t.calls).toEqual([])
  })

  it('treats a cancelled turn as stopped even when nobody aborted', async () => {
    const t = setup({ reason: 'cancelled' })
    expect((await t.runner.run(t.input(action()))).result).toBe('stopped')
  })
})

describe('scheduledChatTitle', () => {
  it('names the task and the time', () => {
    expect(scheduledChatTitle('Review', new Date(2026, 0, 5, 7, 3))).toBe('Review - 1/5 07:03')
  })
})

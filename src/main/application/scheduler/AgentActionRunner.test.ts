import { describe, expect, it, vi } from 'vitest'
import type { AgentDto, Id, SessionDto } from '@shared/models'
import { newAgentAction, type AgentActionDto } from '@shared/scheduler'
import type { McpServerDto, ProfileDto, SkillDto, TeamDto } from '@shared/teams'
import type { SessionScope } from '../../domain/repositories/session-scope-repository'
import type { PromptTurnInput } from '../SessionService'
import type { StopReason } from '../ports'
import { AgentActionRunner, scheduledChatTitle, type ActionChats } from './AgentActionRunner'
import type { ActionRunInput } from './ports'

const agent = (id: number): AgentDto => ({ id, name: `Agent ${id}`, command: 'x', args: [], env: {}, isDefault: id === 1, defaultModeId: null })
const session = (id: Id, over: Partial<SessionDto> = {}): SessionDto =>
  ({ id, agentId: 1, role: 'chat', desktopId: 5, cwd: 'E:\\', title: 'New chat', status: 'idle', acpSessionId: null, currentModeId: null, currentModelId: null, modes: [], models: [], commands: [], contextUsed: 0, contextSize: 0, createdAt: '', updatedAt: '', ...over }) as SessionDto

const skill = (id: number, over: Partial<SkillDto> = {}): SkillDto => ({ id, name: `skill${id}`, description: '', path: `/s/${id}`, enabled: true, installedAt: '', ...over })
const server = (id: number, over: Partial<McpServerDto> = {}): McpServerDto => ({ id, name: `server${id}`, transport: 'stdio', command: 'x', args: [], url: '', vars: [], enabled: true, tools: [], lastTest: null, ...over })
const profile = (id: number, over: Partial<ProfileDto> = {}): ProfileDto => ({ id, name: `Profile ${id}`, instructions: '', agentId: null, model: null, skillIds: [], mcpServerIds: [], color: '#000', ...over })
const team = (id: number, over: Partial<TeamDto> = {}): TeamDto => ({ id, name: `Team ${id}`, instructions: '', skillIds: [], memberIds: [], boardRef: null, ...over })

interface Registry {
  skills?: SkillDto[]
  servers?: McpServerDto[]
  profiles?: ProfileDto[]
  teams?: TeamDto[]
}

function setup(options: { ignoreCancels?: number; reason?: StopReason | Error; hold?: boolean; sessions?: SessionDto[]; registry?: Registry; models?: { id: string; name: string }[] } = {}) {
  const calls: string[] = []
  const scopes: [number, SessionScope][] = []
  let chatRow: SessionDto | null = null
  const prompts: PromptTurnInput[] = []
  let release: (reason: StopReason) => void = () => {}
  const chats: ActionChats = {
    create: async (desktopId, agentId, cwd, _role, createOptions) => {
      calls.push(`create ${desktopId} ${agentId} ${cwd}`)
      const created = session(42, { agentId, models: (options.models ?? []).map((m) => ({ ...m, description: null })) as never, currentModelId: options.models?.[0]?.id ?? null })
      chatRow = created
      createOptions?.onCreated?.(created)
      calls.push('connected')
      return created
    },
    setModel: async (id, modelId) => void calls.push(`model ${id} ${modelId}`),
    rename: (id, title) => void calls.push(`rename ${id} ${title}`),
    promptTurn: async (input) => {
      prompts.push(input)
      if (options.reason instanceof Error) throw options.reason
      if (options.hold) return new Promise<StopReason>((resolve) => (release = resolve))
      return options.reason ?? 'end_turn'
    },
    cancel: async (id) => {
      calls.push(`cancel ${id}`)
      // A cancel that comes too early does nothing: the turn is not far enough along.
      if (calls.filter((c) => c.startsWith('cancel')).length > (options.ignoreCancels ?? 0)) release('cancelled')
    }
  }
  const known = options.sessions ?? [session(7)]
  const reg = options.registry ?? {}
  const registry = {
    skills: { get: (id: number) => reg.skills?.find((x) => x.id === id) ?? null },
    servers: { get: (id: number) => reg.servers?.find((x) => x.id === id) ?? null },
    profiles: { get: (id: number) => reg.profiles?.find((x) => x.id === id) ?? null },
    teams: { get: (id: number) => reg.teams?.find((x) => x.id === id) ?? null }
  }
  const runner = new AgentActionRunner({ chats, registry, scopes: { set: (id, scope) => void (scopes.push([id, scope]), calls.push(`scope ${id}`)) }, sessions: { get: (id) => (id === 42 ? chatRow : known.find((s) => s.id === id) ?? null) }, agents: { get: (id) => (id === 1 || id === 2 ? agent(id) : null), getDefault: () => agent(1) } })
  const controller = new AbortController()
  const seen: Id[] = []
  const input = (action: AgentActionDto): ActionRunInput => ({ desktopId: 5, taskName: 'Nightly review', action, signal: controller.signal, startedAt: new Date(2026, 10, 17, 9, 5), onSession: (id) => void seen.push(id) })
  return { runner, calls, scopes, prompts, controller, seen, input, release: (r: StopReason) => release(r) }
}

const action = (over: Partial<AgentActionDto> = {}): AgentActionDto => ({ ...newAgentAction('E:\\'), prompt: 'Review the changes.', ...over })

describe('AgentActionRunner', () => {
  it('starts a chat in the project, names it after the task and sends the prompt', async () => {
    const t = setup()
    const result = await t.runner.run(t.input(action({ agentId: 2 })))
    expect(result).toEqual({ result: 'success', message: 'The agent finished its turn.', sessionId: 42 })
    expect(t.calls).toEqual(['create 5 2 E:\\', 'connected', 'rename 42 Nightly review - 11/17 09:05'])
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

  it('asks again to cancel while the turn goes on, so that End is not lost when it comes too early', async () => {
    vi.useFakeTimers()
    try {
      const t = setup({ hold: true, ignoreCancels: 1 })
      const done = t.runner.run(t.input(action()))
      await vi.advanceTimersByTimeAsync(0)
      t.controller.abort()
      await vi.advanceTimersByTimeAsync(1200)
      expect(await done).toMatchObject({ result: 'stopped', sessionId: 42 })
      expect(t.calls.filter((c) => c === 'cancel 42').length).toBeGreaterThanOrEqual(2)
    } finally {
      vi.useRealTimers()
    }
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

  describe('skills and tools', () => {
    const custom = (over: Partial<AgentActionDto['capabilities']> = {}): AgentActionDto => action({ capabilities: { mode: 'custom', profileId: null, teamId: null, skills: [], servers: [], hiddenTools: [], ...over } })

    it('a plain action stores no scope', async () => {
      const t = setup()
      await t.runner.run(t.input(action()))
      expect(t.scopes).toEqual([])
    })

    it('stores exactly the chosen skills, servers and hidden tools before the agent connects', async () => {
      const t = setup({ registry: { skills: [skill(1), skill(2)], servers: [server(3)] } })
      const result = await t.runner.run(t.input(custom({ skills: [{ id: 2, name: 'skill2' }], servers: [{ id: 3, name: 'server3' }], hiddenTools: [{ serverId: 3, tool: 'delete' }, { serverId: 9, tool: 'other' }] })))
      expect(result.result).toBe('success')
      expect(t.scopes).toEqual([[42, { instructions: '', skillIds: [2], serverIds: [3], hiddenTools: [{ serverId: 3, tool: 'delete' }] }]])
      expect(t.calls.indexOf('scope 42')).toBeLessThan(t.calls.indexOf('connected'))
    })

    it('a profile gives its skills, servers, instructions, agent and model', async () => {
      const t = setup({ models: [{ id: 'm1', name: 'One' }, { id: 'm2', name: 'Two' }], registry: { profiles: [profile(4, { instructions: ' Review. ', skillIds: [1], mcpServerIds: [3], agentId: 2, model: 'two' })] } })
      await t.runner.run(t.input(action({ capabilities: { mode: 'profile', profileId: 4, teamId: null, skills: [], servers: [], hiddenTools: [] } })))
      expect(t.calls[0]).toBe('create 5 2 E:\\')
      expect(t.scopes[0][1]).toEqual({ instructions: 'Review.', skillIds: [1], serverIds: [3], hiddenTools: [] })
      expect(t.calls).toContain('model 42 m2')
    })

    it('the agent of the action wins over the agent of the profile', async () => {
      const t = setup({ registry: { profiles: [profile(4, { agentId: 2 })] } })
      await t.runner.run(t.input(action({ agentId: 1, capabilities: { mode: 'profile', profileId: 4, teamId: null, skills: [], servers: [], hiddenTools: [] } })))
      expect(t.calls[0]).toBe('create 5 1 E:\\')
    })

    it('a team runs as its first member with the skills of the team and the instructions of both', async () => {
      const t = setup({ registry: { profiles: [profile(4, { name: 'Lead', instructions: 'Lead the work.', skillIds: [1], mcpServerIds: [3] }), profile(5)], teams: [team(6, { name: 'Core', instructions: 'Be kind.', skillIds: [2], memberIds: [4, 5] })] } })
      await t.runner.run(t.input(action({ capabilities: { mode: 'team', profileId: null, teamId: 6, skills: [], servers: [], hiddenTools: [] } })))
      const scope = t.scopes[0][1]
      expect(scope).toMatchObject({ skillIds: [1, 2], serverIds: [3] })
      expect(scope.instructions).toContain('You are Lead, the first member of the team "Core".')
      expect(scope.instructions).toContain('Be kind.')
      expect(scope.instructions).toContain('Lead the work.')
    })

    it.each([
      ['a removed skill', custom({ skills: [{ id: null, name: 'pdf' }] }), {}, 'The skill "pdf" is no longer installed.'],
      ['a skill that is gone from the registry', custom({ skills: [{ id: 8, name: 'pdf' }] }), {}, 'The skill "pdf" is no longer installed.'],
      ['a skill that is switched off', custom({ skills: [{ id: 1, name: 'pdf' }] }), { skills: [skill(1, { name: 'pdf', enabled: false })] }, 'The skill "pdf" is switched off in Control Center.'],
      ['a removed server', custom({ servers: [{ id: null, name: 'github' }] }), {}, 'The MCP server "github" no longer exists.'],
      ['a server that is switched off', custom({ servers: [{ id: 3, name: 'github' }] }), { servers: [server(3, { name: 'github', enabled: false })] }, 'The MCP server "github" is switched off in Control Center.'],
      ['a removed profile', action({ capabilities: { mode: 'profile', profileId: null, teamId: null, skills: [], servers: [], hiddenTools: [] } }), {}, 'The profile of this task no longer exists.'],
      ['a removed team', action({ capabilities: { mode: 'team', profileId: null, teamId: null, skills: [], servers: [], hiddenTools: [] } }), {}, 'The team of this task no longer exists.'],
      ['a team without members', action({ capabilities: { mode: 'team', profileId: null, teamId: 6, skills: [], servers: [], hiddenTools: [] } }), { teams: [team(6, { name: 'Core' })] }, 'The team "Core" has no members.']
    ] as [string, AgentActionDto, Registry, string][])('fails with a sentence, and starts no chat, for %s', async (_name, act, registry, message) => {
      const t = setup({ registry })
      const result = await t.runner.run(t.input(act))
      expect(result.result).toBe('failed')
      expect(result.message).toContain(message)
      expect(t.calls).toEqual([])
      expect(t.prompts).toEqual([])
      expect(t.scopes).toEqual([])
    })

    it('an existing chat keeps its own skills and tools', async () => {
      const t = setup()
      await t.runner.run(t.input(action({ session: 'existing', sessionId: 7, capabilities: { mode: 'profile', profileId: 4, teamId: null, skills: [], servers: [], hiddenTools: [] } })))
      expect(t.scopes).toEqual([])
    })
  })
})

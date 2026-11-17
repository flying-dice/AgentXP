import { describe, expect, it } from 'vitest'
import { INHERIT_CAPABILITIES, newAgentAction, newTaskInput, type AgentActionDto, type ScheduledTaskInput } from '@shared/scheduler'
import { SqliteAgentRepository } from '../../infrastructure/db/sqlite-agent-repository'
import { SqliteMcpServerRepository } from '../../infrastructure/db/sqlite-mcp-server-repository'
import { SqliteSkillRepository } from '../../infrastructure/db/sqlite-skill-repository'
import { SqliteProfileRepository, SqliteTeamRepository } from '../../infrastructure/db/sqlite-team-repositories'
import type { AppEventName, AppEvents } from '../ports'
import { SchedulerService } from './SchedulerService'
import { at, setupScheduler, settle } from './test-helpers'

function setup() {
  const s = setupScheduler()
  const registry = { skills: new SqliteSkillRepository(s.db), servers: new SqliteMcpServerRepository(s.db), profiles: new SqliteProfileRepository(s.db), teams: new SqliteTeamRepository(s.db) }
  const published: { name: AppEventName; payload: AppEvents[AppEventName] }[] = []
  const service = new SchedulerService({
    tasks: s.tasks,
    runs: s.runs,
    engine: s.engine,
    desktops: { get: (id) => (id === s.desktop.id ? ({ id } as never) : null) },
    agents: new SqliteAgentRepository(s.db),
    sessions: s.sessions,
    registry,
    events: { publish: (name, payload) => void published.push({ name, payload }) },
    log: s.log,
    clock: s.time
  })
  const input = (over: Partial<ScheduledTaskInput> = {}): ScheduledTaskInput => ({
    ...newTaskInput('E:\\', [s.daily('2026-11-17T09:00')]),
    name: '  Nightly review  ',
    actions: [{ ...newAgentAction('e:/src'), prompt: 'Review.' }],
    ...over
  })
  const events = (): string[] => published.map((p) => p.name)
  return { ...s, service, input, published, events, registry }
}

describe('SchedulerService', () => {
  it('saves a task trimmed and with a normalized project path, and tells the window', () => {
    const t = setup()
    const task = t.service.create(t.desktop.id, t.input())
    expect(task).toMatchObject({ name: 'Nightly review', status: 'ready', queued: 0, nextRunAt: new Date(at('2026-11-17T09:00')).toISOString(), lastRun: null })
    expect(task.actions[0].cwd).toBe('E:\\src')
    expect(t.service.list(t.desktop.id)).toEqual([task])
    expect(t.events()).toEqual(['scheduler.changed'])
    expect(t.log.names).toEqual(['task/created'])
  })

  it('refuses a task that is not valid with the plain sentence', () => {
    const t = setup()
    expect(() => t.service.create(t.desktop.id, t.input({ name: ' ' }))).toThrow('Type a name for the task.')
    expect(() => t.service.create(t.desktop.id, t.input({ actions: [] }))).toThrow('Add at least one action.')
    expect(() => t.service.create(999, t.input())).toThrow(/Desktop not found/)
  })

  it('refuses an agent or a chat that does not exist or belongs to another desktop', () => {
    const t = setup()
    const bad = (a: Partial<ScheduledTaskInput['actions'][number]>): ScheduledTaskInput => t.input({ actions: [{ ...newAgentAction('E:\\'), prompt: 'x', ...a }] })
    expect(() => t.service.create(t.desktop.id, bad({ agentId: 999 }))).toThrow('Choose an agent that exists.')
    expect(() => t.service.create(t.desktop.id, bad({ session: 'existing', sessionId: 999 }))).toThrow('Choose a chat of this desktop.')
    const foreign = t.sessions.create({ agentId: t.agentId, desktopId: t.other.id, title: 'x' })
    expect(() => t.service.create(t.desktop.id, bad({ session: 'existing', sessionId: foreign.id }))).toThrow('Choose a chat of this desktop.')
    const own = t.sessions.create({ agentId: t.agentId, desktopId: t.desktop.id, title: 'x' })
    expect(t.service.create(t.desktop.id, bad({ session: 'existing', sessionId: own.id })).actions[0].sessionId).toBe(own.id)
  })

  it('changes a task and restarts the clock of its triggers', () => {
    const t = setup()
    const task = t.service.create(t.desktop.id, t.input())
    t.time.advanceTo(at('2026-11-19T00:00'))
    const updated = t.service.update(task.id, t.input({ name: 'Renamed' }))
    expect(updated.name).toBe('Renamed')
    expect(t.tasks.get(task.id)?.handledUntil).toBe(at('2026-11-19T00:00'))
    expect(t.log.names).toEqual(['task/created', 'task/updated'])
    expect(() => t.service.update(999, t.input())).toThrow(/Task not found/)
  })

  it('enables and disables, with no next run while disabled', () => {
    const t = setup()
    const task = t.service.create(t.desktop.id, t.input())
    const off = t.service.setEnabled(task.id, false)
    expect(off).toMatchObject({ enabled: false, status: 'disabled', nextRunAt: null })
    expect(t.service.setEnabled(task.id, false).status).toBe('disabled')
    expect(t.service.setEnabled(task.id, true)).toMatchObject({ status: 'ready' })
    expect(t.log.names).toEqual(['task/created', 'task/disabled', 'task/enabled'])
  })

  it('shows a running task as running, and its last run', async () => {
    const t = setup()
    const task = t.service.create(t.desktop.id, t.input())
    t.service.run(task.id)
    expect(t.service.list(t.desktop.id)[0]).toMatchObject({ status: 'running', lastRun: { result: 'running', startedBy: 'manual' } })
    t.runner.last.finish('success')
    await settle()
    expect(t.service.list(t.desktop.id)[0]).toMatchObject({ status: 'ready', lastRun: { result: 'success' } })
    expect(t.service.history(task.id)).toHaveLength(1)
    t.service.clearHistory(task.id)
    expect(t.service.history(task.id)).toEqual([])
    expect(t.service.list(t.desktop.id)[0].lastRun).toBeNull()
  })

  it('tells the window when a run starts and ends', async () => {
    const t = setup()
    const task = t.service.create(t.desktop.id, t.input())
    t.published.length = 0
    t.service.run(task.id)
    t.runner.last.finish('success')
    await settle()
    expect(new Set(t.events())).toEqual(new Set(['scheduler.changed']))
    expect(t.published.length).toBeGreaterThanOrEqual(2)
    const last = t.published.at(-1)!.payload as AppEvents['scheduler.changed']
    expect(last).toMatchObject({ desktopId: t.desktop.id })
    expect(last.tasks[0].status).toBe('ready')
  })

  it('ends a run and deletes a task with its runs', async () => {
    const t = setup()
    const task = t.service.create(t.desktop.id, t.input())
    t.service.run(task.id)
    t.service.end(task.id)
    await settle()
    expect(t.service.history(task.id)[0].result).toBe('stopped')
    t.service.remove(task.id)
    expect(t.service.list(t.desktop.id)).toEqual([])
    expect(() => t.service.history(task.id)).toThrow(/Task not found/)
    expect(t.log.names.at(-1)).toBe('task/deleted')
  })

  describe('skills and tools of an action', () => {
    const withCapabilities = (t: ReturnType<typeof setup>, capabilities: AgentActionDto['capabilities']): ScheduledTaskInput => t.input({ actions: [{ ...newAgentAction('E:\\'), prompt: 'Go.', capabilities }] })

    it('saves a custom choice with the names of the registry, and drops hidden tools of servers that are not chosen', () => {
      const t = setup()
      const skill = t.registry.skills.add({ name: 'pdf', description: '', path: '/s/pdf' })
      const server = t.registry.servers.create({ name: 'github', transport: 'stdio', command: 'x', args: [], url: '', vars: [] })
      const task = t.service.create(t.desktop.id, withCapabilities(t, { mode: 'custom', profileId: null, teamId: null, skills: [{ id: skill.id, name: 'old name' }], servers: [{ id: server.id, name: 'old' }], hiddenTools: [{ serverId: server.id, tool: 'delete' }, { serverId: 999, tool: 'x' }] }))
      expect(task.actions[0].capabilities).toEqual({ mode: 'custom', profileId: null, teamId: null, skills: [{ id: skill.id, name: 'pdf' }], servers: [{ id: server.id, name: 'github' }], hiddenTools: [{ serverId: server.id, tool: 'delete' }] })
    })

    it('saves a profile and a team, and clears what the mode does not use', () => {
      const t = setup()
      const profile = t.registry.profiles.create({ name: 'Reviewer', instructions: '', agentId: null, model: null, skillIds: [], mcpServerIds: [], color: '#000' })
      const team = t.registry.teams.create({ name: 'Core', instructions: '', skillIds: [], memberIds: [profile.id], boardRef: null })
      const a = t.service.create(t.desktop.id, withCapabilities(t, { ...INHERIT_CAPABILITIES, mode: 'profile', profileId: profile.id, teamId: team.id }))
      expect(a.actions[0].capabilities).toMatchObject({ mode: 'profile', profileId: profile.id, teamId: null })
      const b = t.service.create(t.desktop.id, withCapabilities(t, { ...INHERIT_CAPABILITIES, mode: 'team', teamId: team.id }))
      expect(b.actions[0].capabilities).toMatchObject({ mode: 'team', teamId: team.id, profileId: null })
    })

    it('refuses what does not exist or does not apply', () => {
      const t = setup()
      const refuse = (c: AgentActionDto['capabilities']): string => {
        try {
          t.service.create(t.desktop.id, withCapabilities(t, c))
          return ''
        } catch (e) {
          return (e as Error).message
        }
      }
      expect(refuse({ ...INHERIT_CAPABILITIES, mode: 'profile', profileId: null })).toBe('Choose the profile for the run.')
      expect(refuse({ ...INHERIT_CAPABILITIES, mode: 'profile', profileId: 99 })).toBe('Choose a profile that exists.')
      expect(refuse({ ...INHERIT_CAPABILITIES, mode: 'team', teamId: 99 })).toBe('Choose a team that exists.')
      expect(refuse({ ...INHERIT_CAPABILITIES, mode: 'custom', skills: [{ id: 99, name: 'x' }] })).toBe('Choose skills that are installed.')
      expect(refuse({ ...INHERIT_CAPABILITIES, mode: 'custom', servers: [{ id: 99, name: 'x' }] })).toBe('Choose MCP servers that exist.')
      expect(refuse({ ...INHERIT_CAPABILITIES, mode: 'custom', skills: [{ id: null, name: 'gone' }] })).toContain('no longer exists')
      const chat = t.sessions.create({ agentId: t.agentId, desktopId: t.desktop.id, title: 'c' })
      const existing = t.input({ actions: [{ ...newAgentAction('E:\\'), prompt: 'Go.', session: 'existing', sessionId: chat.id, capabilities: { ...INHERIT_CAPABILITIES, mode: 'custom' } }] })
      expect(() => t.service.create(t.desktop.id, existing)).toThrow('An existing chat keeps its own skills and tools.')
    })
  })
})

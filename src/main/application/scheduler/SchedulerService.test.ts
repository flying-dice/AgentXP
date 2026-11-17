import { describe, expect, it } from 'vitest'
import { newAgentAction, newTaskInput, type ScheduledTaskInput } from '@shared/scheduler'
import { SqliteAgentRepository } from '../../infrastructure/db/sqlite-agent-repository'
import type { AppEventName, AppEvents } from '../ports'
import { SchedulerService } from './SchedulerService'
import { at, setupScheduler, settle } from './test-helpers'

function setup() {
  const s = setupScheduler()
  const published: { name: AppEventName; payload: AppEvents[AppEventName] }[] = []
  const service = new SchedulerService({
    tasks: s.tasks,
    runs: s.runs,
    engine: s.engine,
    desktops: { get: (id) => (id === s.desktop.id ? ({ id } as never) : null) },
    agents: new SqliteAgentRepository(s.db),
    sessions: s.sessions,
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
  return { ...s, service, input, published, events }
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
})

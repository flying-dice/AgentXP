import { describe, expect, it } from 'vitest'
import { newTrigger, type TriggerDto } from '@shared/schedule'
import { newAgentAction, newTaskInput, type ScheduledTaskInput } from '@shared/scheduler'
import { SqliteAppWindowRepository } from './sqlite-app-window-repository'
import { SqliteDesktopRepository } from './sqlite-desktop-repository'
import { SqliteScheduledTaskRepository, fromMask, toMask } from './sqlite-scheduled-task-repository'
import { SqliteSessionRepository } from './sqlite-session-repository'
import { SqliteTaskRunRepository } from './sqlite-task-run-repository'
import { count, createFixture } from './test-helpers'
import { SqliteAgentRepository } from './sqlite-agent-repository'

function setup() {
  const f = createFixture()
  const desktops = new SqliteDesktopRepository(f.db)
  const desktop = desktops.create({ agentId: f.agentId, title: 'project', isOpen: true })
  const other = desktops.create({ agentId: f.agentId, title: 'other', isOpen: true })
  const sessions = new SqliteSessionRepository(f.db)
  return { ...f, desktops, desktop, other, sessions, tasks: new SqliteScheduledTaskRepository(f.db), runs: new SqliteTaskRunRepository(f.db) }
}

const input = (over: Partial<ScheduledTaskInput> = {}): ScheduledTaskInput => ({
  ...newTaskInput('E:\\'),
  name: 'Nightly review',
  actions: [{ ...newAgentAction('E:\\'), prompt: 'Review the changes.' }],
  ...over
})

const allTriggers: TriggerDto[] = [
  { kind: 'once', enabled: true, startAt: '2026-11-17T09:00', expiresAt: null },
  { kind: 'daily', enabled: false, startAt: '2026-11-17T09:30', expiresAt: '2027-01-01T00:00', everyDays: 3 },
  { kind: 'weekly', enabled: true, startAt: '2026-11-17T10:00', expiresAt: null, everyWeeks: 2, daysOfWeek: [1, 3, 5] },
  { kind: 'monthly', enabled: true, startAt: '2026-11-17T11:00', expiresAt: null, months: [1, 6, 12], daysOfMonth: [1, 15, 31], lastDay: true },
  { kind: 'startup', enabled: true, delayMinutes: 2 }
]

describe('bit sets', () => {
  it('round-trips days of the week, months and days of the month', () => {
    expect(fromMask(toMask([0, 6], 0), 0, 7)).toEqual([0, 6])
    expect(fromMask(toMask([1, 6, 12], 1), 1, 12)).toEqual([1, 6, 12])
    const all = Array.from({ length: 31 }, (_, i) => i + 1)
    expect(toMask(all, 1)).toBe(2 ** 31 - 1)
    expect(fromMask(toMask(all, 1), 1, 31)).toEqual(all)
  })

  it('ignores duplicates and values out of range', () => {
    expect(toMask([3, 3, 3], 1)).toBe(4)
    expect(toMask([0, 32, -1], 1)).toBe(0)
  })
})

describe('migration 015', () => {
  it('lets the Task Scheduler have a window row', () => {
    const { db, desktop } = setup()
    const windows = new SqliteAppWindowRepository(db)
    expect(windows.create({ desktopId: desktop.id, app: 'task-scheduler', bounds: { x: 1, y: 1, width: 600, height: 400 }, windowState: 'normal', openedBy: 'user' }).app).toBe('task-scheduler')
  })
})

describe('SqliteScheduledTaskRepository', () => {
  it('saves a task with every kind of trigger and reads it back unchanged', () => {
    const { tasks, desktop } = setup()
    const saved = tasks.create(desktop.id, input({ triggers: allTriggers, description: 'Every night.' }), 1000)
    expect(saved).toMatchObject({ desktopId: desktop.id, name: 'Nightly review', description: 'Every night.', enabled: true, handledUntil: 1000 })
    expect(saved.triggers).toEqual(allTriggers)
    expect(tasks.get(saved.id)).toEqual(saved)
  })

  it('keeps the actions, the conditions and the settings', () => {
    const { tasks, desktop, agentId, sessions } = setup()
    const chat = sessions.create({ agentId, desktopId: desktop.id, title: 'chat' })
    const task = input({
      actions: [
        { kind: 'agent', agentId, cwd: 'E:\\', session: 'existing', sessionId: chat.id, prompt: 'One' },
        { kind: 'agent', agentId: null, cwd: 'C:\\Users\\Agent', session: 'new', sessionId: null, prompt: 'Two' }
      ],
      conditions: { onlyIfNoOtherTaskRuns: true, onlyIfAgentIdle: true, onlyIfNotPaused: false },
      settings: { allowOnDemand: false, runMissed: true, stopIfRunsLonger: false, stopAfterMinutes: 30, restartOnFailure: true, restartIntervalMinutes: 10, restartAttempts: 4, ifRunning: 'queue' }
    })
    const saved = tasks.create(desktop.id, task, 0)
    expect(saved.actions).toEqual(task.actions)
    expect(saved.conditions).toEqual(task.conditions)
    expect(saved.settings).toEqual(task.settings)
  })

  it('lists the tasks of one desktop, or all, oldest first', () => {
    const { tasks, desktop, other } = setup()
    const a = tasks.create(desktop.id, input({ name: 'A' }), 0)
    const b = tasks.create(other.id, input({ name: 'B' }), 0)
    const c = tasks.create(desktop.id, input({ name: 'C' }), 0)
    expect(tasks.list(desktop.id).map((t) => t.id)).toEqual([a.id, c.id])
    expect(tasks.listAll().map((t) => t.id)).toEqual([a.id, b.id, c.id])
  })

  it('replaces the triggers and the actions on update', () => {
    const { tasks, desktop } = setup()
    const saved = tasks.create(desktop.id, input({ triggers: allTriggers }), 0)
    const updated = tasks.update(saved.id, input({ name: 'Renamed', enabled: false, triggers: [newTrigger('startup', '')] }), 55)
    expect(updated).toMatchObject({ name: 'Renamed', enabled: false, handledUntil: 55 })
    expect(updated?.triggers).toEqual([{ kind: 'startup', enabled: true, delayMinutes: 0 }])
    expect(tasks.update(999, input(), 0)).toBeNull()
  })

  it('only keeps the chat of an action that sends to an existing chat', () => {
    const { tasks, desktop, agentId, sessions } = setup()
    const chat = sessions.create({ agentId, desktopId: desktop.id, title: 'chat' })
    const saved = tasks.create(desktop.id, input({ actions: [{ ...newAgentAction('E:\\'), prompt: 'x', session: 'new', sessionId: chat.id }] }), 0)
    expect(saved.actions[0].sessionId).toBeNull()
  })

  it('enables, disables and stamps what the scheduler handled', () => {
    const { tasks, desktop } = setup()
    const saved = tasks.create(desktop.id, input(), 1)
    expect(tasks.setEnabled(saved.id, false, 5)).toBe(true)
    expect(tasks.get(saved.id)).toMatchObject({ enabled: false, handledUntil: 5 })
    tasks.setHandledUntil(saved.id, 9)
    expect(tasks.get(saved.id)?.handledUntil).toBe(9)
    expect(tasks.setEnabled(999, true, 0)).toBe(false)
  })

  it('refuses values outside its checks', () => {
    const { tasks, desktop } = setup()
    expect(() => tasks.create(desktop.id, input({ name: '' }), 0)).toThrow()
    expect(() => tasks.create(desktop.id, input({ settings: { ...input().settings, ifRunning: 'wait' as never } }), 0)).toThrow()
  })

  it('goes with its desktop, with triggers, actions and runs (cascade)', () => {
    const { db, tasks, runs, desktops, desktop } = setup()
    const saved = tasks.create(desktop.id, input({ triggers: allTriggers }), 0)
    runs.start({ taskId: saved.id, startedAt: '2026-11-17T09:00:00.000Z', startedBy: 'schedule', attempt: 1 })
    desktops.remove(desktop.id)
    for (const table of ['scheduled_tasks', 'scheduled_task_triggers', 'scheduled_task_actions', 'scheduled_task_runs']) expect(count(db, table)).toBe(0)
  })

  it('unlinks a deleted agent and a deleted chat from an action', () => {
    const { db, tasks, desktop, sessions, agentId } = setup()
    const chat = sessions.create({ agentId, desktopId: desktop.id, title: 'chat' })
    const saved = tasks.create(desktop.id, input({ actions: [{ kind: 'agent', agentId, cwd: 'E:\\', session: 'existing', sessionId: chat.id, prompt: 'x' }] }), 0)
    sessions.remove(chat.id)
    expect(tasks.get(saved.id)?.actions[0]).toMatchObject({ sessionId: null, session: 'existing' })
    const agents = new SqliteAgentRepository(db)
    const removable = agents.create({ name: 'Other', command: 'x', args: [], env: {} })
    const second = tasks.create(desktop.id, input({ actions: [{ ...newAgentAction('E:\\'), agentId: removable.id, prompt: 'x' }] }), 0)
    agents.remove(removable.id)
    expect(tasks.get(second.id)?.actions[0].agentId).toBeNull()
  })
})

describe('SqliteTaskRunRepository', () => {
  it('starts a run, finishes it and lists newest first', () => {
    const { tasks, runs, desktop } = setup()
    const task = tasks.create(desktop.id, input(), 0)
    const first = runs.start({ taskId: task.id, startedAt: '2026-11-17T09:00:00.000Z', startedBy: 'schedule', attempt: 1 })
    expect(first).toMatchObject({ result: 'running', endedAt: null, message: '', sessionId: null, startedBy: 'schedule', attempt: 1 })
    const second = runs.start({ taskId: task.id, startedAt: '2026-11-17T10:00:00.000Z', startedBy: 'manual', attempt: 1 })
    expect(runs.finish(first.id, { endedAt: '2026-11-17T09:05:00.000Z', result: 'success', message: 'The agent finished.', sessionId: null })).toMatchObject({ result: 'success', endedAt: '2026-11-17T09:05:00.000Z' })
    expect(runs.list(task.id).map((r) => r.id)).toEqual([second.id, first.id])
  })

  it('stores a run that never started as finished', () => {
    const { tasks, runs, desktop } = setup()
    const task = tasks.create(desktop.id, input(), 0)
    const skipped = runs.start({ taskId: task.id, startedAt: '2026-11-17T09:00:00.000Z', startedBy: 'schedule', attempt: 1, finished: { endedAt: '2026-11-17T09:00:00.000Z', result: 'skipped', message: 'Another task ran.' } })
    expect(skipped).toMatchObject({ result: 'skipped', message: 'Another task ran.', endedAt: '2026-11-17T09:00:00.000Z' })
  })

  it('keeps the chat of a run, and the last chat when finishing without one', () => {
    const { tasks, runs, desktop, sessions, agentId } = setup()
    const chat = sessions.create({ agentId, desktopId: desktop.id, title: 'chat' })
    const task = tasks.create(desktop.id, input(), 0)
    const run = runs.start({ taskId: task.id, startedAt: '2026-11-17T09:00:00.000Z', startedBy: 'schedule', attempt: 1 })
    runs.setSession(run.id, chat.id)
    expect(runs.finish(run.id, { endedAt: '2026-11-17T09:01:00.000Z', result: 'failed', message: 'x', sessionId: null })?.sessionId).toBe(chat.id)
    sessions.remove(chat.id)
    expect(runs.list(task.id)[0].sessionId).toBeNull()
  })

  it('finds the newest run of each task', () => {
    const { tasks, runs, desktop } = setup()
    const a = tasks.create(desktop.id, input({ name: 'A' }), 0)
    const b = tasks.create(desktop.id, input({ name: 'B' }), 0)
    const c = tasks.create(desktop.id, input({ name: 'C' }), 0)
    runs.start({ taskId: a.id, startedAt: '2026-11-17T09:00:00.000Z', startedBy: 'schedule', attempt: 1 })
    const newestA = runs.start({ taskId: a.id, startedAt: '2026-11-17T10:00:00.000Z', startedBy: 'schedule', attempt: 1 })
    const onlyB = runs.start({ taskId: b.id, startedAt: '2026-11-17T09:30:00.000Z', startedBy: 'manual', attempt: 1 })
    const last = runs.lastRuns([a.id, b.id, c.id])
    expect(last.get(a.id)?.id).toBe(newestA.id)
    expect(last.get(b.id)?.id).toBe(onlyB.id)
    expect(last.has(c.id)).toBe(false)
    expect(runs.lastRuns([])).toEqual(new Map())
  })

  it('prunes to the newest runs and clears a task', () => {
    const { tasks, runs, desktop } = setup()
    const task = tasks.create(desktop.id, input(), 0)
    const ids = Array.from({ length: 5 }, (_, i) => runs.start({ taskId: task.id, startedAt: `2026-11-17T0${i}:00:00.000Z`, startedBy: 'schedule', attempt: 1 }).id)
    runs.prune(task.id, 2)
    expect(runs.list(task.id).map((r) => r.id)).toEqual([ids[4], ids[3]])
    runs.clear(task.id)
    expect(runs.list(task.id)).toEqual([])
  })

  it('fails the runs that Agent7 left running', () => {
    const { tasks, runs, desktop } = setup()
    const task = tasks.create(desktop.id, input(), 0)
    const open = runs.start({ taskId: task.id, startedAt: '2026-11-17T09:00:00.000Z', startedBy: 'schedule', attempt: 1 })
    const done = runs.start({ taskId: task.id, startedAt: '2026-11-17T08:00:00.000Z', startedBy: 'schedule', attempt: 1, finished: { endedAt: '2026-11-17T08:01:00.000Z', result: 'success', message: '' } })
    expect(runs.failUnfinished('2026-11-18T00:00:00.000Z', 'Agent7 closed.')).toBe(1)
    expect(runs.list(task.id).find((r) => r.id === open.id)).toMatchObject({ result: 'failed', message: 'Agent7 closed.', endedAt: '2026-11-18T00:00:00.000Z' })
    expect(runs.list(task.id).find((r) => r.id === done.id)?.result).toBe('success')
  })
})

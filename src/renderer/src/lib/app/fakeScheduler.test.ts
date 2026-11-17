import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { newTaskInput } from '@shared/scheduler'
import type { ScheduledTaskDto, SchedulerEvents } from '@shared/scheduler'
import { createFakeScheduler, SAMPLE_NOW } from './fakeScheduler'

function setup(options: { runMs?: number } = {}) {
  const changes: SchedulerEvents['scheduler.changed'][] = []
  const api = createFakeScheduler({ emit: (_event, payload) => void changes.push(payload as SchedulerEvents['scheduler.changed']), runMs: options.runMs ?? 100 })
  return { api, changes }
}

describe('the fake scheduler', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('starts with the sample tasks of the desktop and none for another desktop', async () => {
    const { api } = setup()
    expect((await api.list(1)).map((t) => t.name)).toEqual(['Morning review', 'Dependency check', 'Start of day', 'Month-end report'])
    expect(await api.list(2)).toEqual([])
  })

  it('computes the next run with the real trigger logic and none for a disabled task', async () => {
    const { api } = setup()
    const tasks = await api.list(1)
    expect(tasks[0].nextRunAt).toBe(new Date(SAMPLE_NOW + 23.5 * 3_600_000).toISOString())
    expect(tasks[3]).toMatchObject({ status: 'disabled', nextRunAt: null })
    expect(tasks[2].nextRunAt).toBeNull()
  })

  it('creates, updates and removes a task and tells the window each time', async () => {
    const { api, changes } = setup()
    const created = await api.create(1, { ...newTaskInput('E:\\'), name: 'Check' })
    expect(created).toMatchObject({ name: 'Check', status: 'ready', lastRun: null })
    expect(created.nextRunAt).toBeNull()
    const updated = await api.update(created.id, { ...newTaskInput('E:\\'), name: 'Check 2' })
    expect(updated.name).toBe('Check 2')
    await api.remove(created.id)
    expect((await api.list(1)).some((t) => t.id === created.id)).toBe(false)
    expect(changes.length).toBe(3)
    expect(changes.at(-1)?.tasks.length).toBe(4)
  })

  it('enables and disables', async () => {
    const { api } = setup()
    expect((await api.setEnabled(1, false)).status).toBe('disabled')
    expect((await api.setEnabled(1, true)).status).toBe('ready')
  })

  it('runs a task: Running, then Completed with a history row', async () => {
    const { api, changes } = setup()
    await api.run(1)
    expect(changes.at(-1)?.tasks.find((t) => t.id === 1)).toMatchObject({ status: 'running', lastRun: { result: 'running' } })
    await vi.advanceTimersByTimeAsync(100)
    const task = (await api.list(1)).find((t) => t.id === 1) as ScheduledTaskDto
    expect(task).toMatchObject({ status: 'ready', lastRun: { result: 'success', startedBy: 'manual' } })
    expect((await api.history(1))[0]).toMatchObject({ result: 'success' })
  })

  it('ends a running task as Stopped and keeps it from completing later', async () => {
    const { api } = setup()
    await api.run(1)
    await api.end(1)
    await vi.advanceTimersByTimeAsync(500)
    expect((await api.history(1))[0]).toMatchObject({ result: 'stopped' })
  })

  it('refuses Run for a task that does not allow it', async () => {
    const { api } = setup()
    const input = { ...newTaskInput('E:\\'), name: 'No run', settings: { ...newTaskInput('E:\\').settings, allowOnDemand: false } }
    const task = await api.create(1, input)
    await expect(api.run(task.id)).rejects.toThrow(/does not allow/)
  })

  it('clears the history', async () => {
    const { api } = setup()
    expect((await api.history(1)).length).toBe(2)
    await api.clearHistory(1)
    expect(await api.history(1)).toEqual([])
  })
})

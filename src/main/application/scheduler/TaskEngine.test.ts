import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/scheduler'
import { MAX_QUEUED, MAX_TICK_MS, MISSED_GRACE_MS } from './TaskEngine'
import { at, setupScheduler, settle } from './test-helpers'

const MINUTE = 60_000

describe('due times', () => {
  it('starts a task at the time of its trigger and writes the result of the run', async () => {
    const s = setupScheduler()
    const task = s.addTask({ triggers: [s.daily('2026-11-17T09:00')] })
    s.engine.start()
    s.time.advanceTo(at('2026-11-17T08:59'))
    expect(s.runner.calls).toHaveLength(0)
    s.time.advanceTo(at('2026-11-17T09:00'))
    expect(s.runner.calls).toHaveLength(1)
    expect(s.engine.isRunning(task.id)).toBe(true)
    expect(s.runs.list(task.id)[0]).toMatchObject({ result: 'running', startedBy: 'schedule', attempt: 1 })
    s.time.advance(5 * MINUTE)
    s.runner.last.finish('success')
    await settle()
    expect(s.engine.isRunning(task.id)).toBe(false)
    expect(s.runs.list(task.id)[0]).toMatchObject({ result: 'success', message: 'The agent finished its turn.', endedAt: new Date(at('2026-11-17T09:05')).toISOString() })
    expect(s.log.names).toEqual(['task/started', 'task/completed'])
  })

  it('starts the task again on the next day', async () => {
    const s = setupScheduler()
    s.addTask({ triggers: [s.daily('2026-11-17T09:00')] })
    s.engine.start()
    s.time.advanceTo(at('2026-11-17T09:00'))
    s.runner.last.finish('success')
    await settle()
    s.time.advanceTo(at('2026-11-18T09:00'))
    expect(s.runner.calls).toHaveLength(2)
  })

  it('never starts a disabled task, and starts it after it is enabled', () => {
    const s = setupScheduler()
    const task = s.addTask({ enabled: false, triggers: [s.daily('2026-11-17T09:00')] })
    s.engine.start()
    s.time.advanceTo(at('2026-11-17T10:00'))
    expect(s.runner.calls).toHaveLength(0)
    s.tasks.setEnabled(task.id, true, s.time.now())
    s.engine.changed()
    s.time.advanceTo(at('2026-11-18T09:00'))
    expect(s.runner.calls).toHaveLength(1)
  })

  it('sees a task that is added while it runs', () => {
    const s = setupScheduler()
    s.engine.start()
    expect(s.time.pending).toBe(0)
    s.addTask({ triggers: [s.daily('2026-11-17T09:00')] })
    s.engine.changed()
    s.time.advanceTo(at('2026-11-17T09:00'))
    expect(s.runner.calls).toHaveLength(1)
  })

  it('wakes up at least once a minute to look at the clock again', () => {
    const s = setupScheduler()
    s.addTask({ triggers: [s.daily('2026-11-20T09:00')] })
    s.engine.start()
    expect(s.time.pending).toBe(1)
    s.time.advance(MAX_TICK_MS)
    expect(s.time.pending).toBe(1)
  })

  it('starts a task that is due when the computer wakes up late, once, as scheduled', () => {
    const s = setupScheduler()
    s.addTask({ triggers: [s.daily('2026-11-17T09:00')] })
    s.engine.start()
    // The clock jumps over the due time by less than the grace time (sleep, a slow timer).
    s.time.advanceTo(at('2026-11-17T09:00') + MISSED_GRACE_MS)
    expect(s.runner.calls).toHaveLength(1)
    expect(s.runs.list(s.tasks.listAll()[0].id)[0].startedBy).toBe('schedule')
  })

  it('counts many due times as one', () => {
    const s = setupScheduler()
    const task = s.addTask({ settings: { ...DEFAULT_SETTINGS, runMissed: true }, triggers: [s.daily('2026-11-17T09:00')] })
    s.engine.start()
    s.time.advanceTo(at('2026-11-20T12:00'))
    // The timer ran once a minute, so the first due time started the task at 09:00; the run is still going.
    expect(s.runs.list(task.id).filter((r) => r.result === 'running')).toHaveLength(1)
  })
})

describe('missed due times', () => {
  const downtime = (settings: Partial<typeof DEFAULT_SETTINGS>, triggers = [{ kind: 'daily', enabled: true, startAt: '2026-11-17T09:00', expiresAt: null, everyDays: 1 } as const]) => {
    const s = setupScheduler('2026-11-17T08:00')
    const task = s.addTask({ settings: { ...DEFAULT_SETTINGS, ...settings }, triggers: [...triggers] })
    // Agent7 is closed from 08:00 until 11:30.
    s.time.advanceTo(at('2026-11-17T11:30'))
    return { s, task }
  }

  it('records a missed row and does not start the task', () => {
    const { s, task } = downtime({})
    s.engine.start()
    expect(s.runner.calls).toHaveLength(0)
    expect(s.runs.list(task.id)[0]).toMatchObject({ result: 'missed', startedBy: 'missed' })
    expect(s.log.names).toEqual(['task/missed'])
    expect(s.log.records[0].level).toBe('warning')
  })

  it('starts the task once, as soon as possible, with "run missed"', () => {
    const { s, task } = downtime({ runMissed: true })
    s.engine.start()
    expect(s.runner.calls).toHaveLength(1)
    expect(s.runs.list(task.id)[0]).toMatchObject({ result: 'running', startedBy: 'missed' })
  })

  it('does not count a time that it already handled, nor the days a task was off', () => {
    const { s, task } = downtime({ runMissed: true })
    s.tasks.setHandledUntil(task.id, at('2026-11-17T10:00'))
    s.engine.start()
    expect(s.runner.calls).toHaveLength(0)
    const off = setupScheduler()
    const disabled = off.addTask({ enabled: false, settings: { ...DEFAULT_SETTINGS, runMissed: true }, triggers: [off.daily()] })
    off.time.advanceTo(at('2026-11-20T00:00'))
    off.tasks.setEnabled(disabled.id, true, off.time.now())
    off.engine.start()
    expect(off.runner.calls).toHaveLength(0)
    expect(off.runs.list(disabled.id)).toHaveLength(0)
  })

  it('starts a task with a start-up trigger once even when it also missed a time', () => {
    const { s } = downtime({ runMissed: true }, [{ kind: 'daily', enabled: true, startAt: '2026-11-17T09:00', expiresAt: null, everyDays: 1 }, { kind: 'startup', enabled: true, delayMinutes: 0 } as never])
    s.engine.start()
    s.time.advance(0)
    expect(s.runner.calls).toHaveLength(1)
  })

  it('fails the runs that a closed Agent7 left open', () => {
    const s = setupScheduler()
    const task = s.addTask({})
    s.runs.start({ taskId: task.id, startedAt: new Date(at('2026-11-17T07:00')).toISOString(), startedBy: 'schedule', attempt: 1 })
    s.engine.start()
    expect(s.runs.list(task.id)[0]).toMatchObject({ result: 'failed', message: 'Agent7 closed while the task was running.' })
  })
})

describe('start-up triggers', () => {
  it('starts the task after its delay when Agent7 starts', () => {
    const s = setupScheduler()
    const task = s.addTask({ triggers: [{ kind: 'startup', enabled: true, delayMinutes: 2 }] })
    s.engine.start()
    s.time.advance(MINUTE)
    expect(s.runner.calls).toHaveLength(0)
    s.time.advance(MINUTE)
    expect(s.runner.calls).toHaveLength(1)
    expect(s.runs.list(task.id)[0].startedBy).toBe('startup')
  })

  it('does not start a disabled task or a disabled trigger', () => {
    const s = setupScheduler()
    s.addTask({ enabled: false, triggers: [{ kind: 'startup', enabled: true, delayMinutes: 0 }] })
    s.addTask({ triggers: [{ kind: 'startup', enabled: false, delayMinutes: 0 }] })
    s.engine.start()
    s.time.advance(MINUTE)
    expect(s.runner.calls).toHaveLength(0)
  })

  it('starts only at Agent7 startup, not each time the task is saved', () => {
    const s = setupScheduler()
    s.engine.start()
    s.addTask({ triggers: [{ kind: 'startup', enabled: true, delayMinutes: 0 }] })
    s.engine.changed()
    s.time.advance(10 * MINUTE)
    expect(s.runner.calls).toHaveLength(0)
  })
})

describe('conditions', () => {
  const due = (s: ReturnType<typeof setupScheduler>): void => {
    s.engine.start()
    s.time.advanceTo(at('2026-11-17T09:00'))
  }

  it('skips the run while the desktop is paused, and says why', () => {
    const s = setupScheduler()
    const task = s.addTask({ triggers: [s.daily()] })
    s.world.paused.add(s.desktop.id)
    due(s)
    expect(s.runner.calls).toHaveLength(0)
    expect(s.runs.list(task.id)[0]).toMatchObject({ result: 'skipped', message: 'The task did not start because the desktop is paused.' })
  })

  it('starts while the desktop is paused when the condition is off', () => {
    const s = setupScheduler()
    s.addTask({ triggers: [s.daily()], conditions: { onlyIfNoOtherTaskRuns: false, onlyIfAgentIdle: false, onlyIfNotPaused: false } })
    s.world.paused.add(s.desktop.id)
    due(s)
    expect(s.runner.calls).toHaveLength(1)
  })

  it('skips the run while a chat of the desktop is busy', () => {
    const s = setupScheduler()
    const task = s.addTask({ triggers: [s.daily()], conditions: { onlyIfNoOtherTaskRuns: false, onlyIfAgentIdle: true, onlyIfNotPaused: true } })
    s.world.busy.add(s.desktop.id)
    due(s)
    expect(s.runs.list(task.id)[0]).toMatchObject({ result: 'skipped', message: 'The task did not start because the agent is busy with a chat.' })
  })

  it('skips the run while another task of the desktop runs, but not one of another desktop', () => {
    const s = setupScheduler()
    const first = s.addTask({ name: 'First', triggers: [s.daily()] })
    const second = s.addTask({ name: 'Second', triggers: [s.daily()], conditions: { onlyIfNoOtherTaskRuns: true, onlyIfAgentIdle: false, onlyIfNotPaused: true } })
    due(s)
    expect(s.engine.isRunning(first.id)).toBe(true)
    expect(s.runs.list(second.id)[0]).toMatchObject({ result: 'skipped', message: 'The task did not start because the task "First" is running.' })

    const t = setupScheduler()
    t.addTask({ name: 'Elsewhere', triggers: [t.daily()] }, t.other.id)
    t.addTask({ name: 'Here', triggers: [t.daily()], conditions: { onlyIfNoOtherTaskRuns: true, onlyIfAgentIdle: false, onlyIfNotPaused: true } })
    due(t)
    expect(t.runner.calls).toHaveLength(2)
  })

  it('ignores the conditions for Run', () => {
    const s = setupScheduler()
    const task = s.addTask({ conditions: { onlyIfNoOtherTaskRuns: true, onlyIfAgentIdle: true, onlyIfNotPaused: true } })
    s.world.paused.add(s.desktop.id)
    s.world.busy.add(s.desktop.id)
    s.engine.run(task.id)
    expect(s.runs.list(task.id)[0]).toMatchObject({ result: 'running', startedBy: 'manual' })
  })
})

describe('Run and End', () => {
  it('refuses Run when the task does not allow it, or is disabled, or is gone', () => {
    const s = setupScheduler()
    const locked = s.addTask({ settings: { ...DEFAULT_SETTINGS, allowOnDemand: false } })
    const off = s.addTask({ enabled: false })
    expect(() => s.engine.run(locked.id)).toThrow(/does not allow Run/)
    expect(() => s.engine.run(off.id)).toThrow(/Enable the task/)
    expect(() => s.engine.run(999)).toThrow(/not found/)
  })

  it('ends a running task and writes it as stopped by the user', async () => {
    const s = setupScheduler()
    const task = s.addTask({})
    s.engine.run(task.id)
    s.engine.end(task.id)
    expect(s.runner.last.input.signal.aborted).toBe(true)
    await settle()
    expect(s.engine.isRunning(task.id)).toBe(false)
    expect(s.runs.list(task.id)[0]).toMatchObject({ result: 'stopped', message: 'The task was ended by the user.' })
    expect(s.log.records.at(-1)).toMatchObject({ name: 'task/stopped', level: 'warning' })
  })

  it('says so when End has nothing to end', () => {
    const s = setupScheduler()
    const task = s.addTask({})
    expect(() => s.engine.end(task.id)).toThrow(/not running/)
  })

  it('drops the queued runs with End', async () => {
    const s = setupScheduler()
    const task = s.addTask({ settings: { ...DEFAULT_SETTINGS, ifRunning: 'queue' } })
    s.engine.run(task.id)
    s.engine.run(task.id)
    expect(s.engine.queued(task.id)).toBe(1)
    s.engine.end(task.id)
    await settle()
    expect(s.engine.queued(task.id)).toBe(0)
    expect(s.runner.calls).toHaveLength(1)
  })

  it('gives the chat of the run to the history while the run goes on', () => {
    const s = setupScheduler()
    const chat = s.sessions.create({ agentId: s.agentId, desktopId: s.desktop.id, title: 'c' })
    const task = s.addTask({})
    s.engine.run(task.id)
    s.runner.last.input.onSession(chat.id)
    expect(s.runs.list(task.id)[0].sessionId).toBe(chat.id)
  })
})

describe('a task that is already running', () => {
  it('ignore: skips the new run', () => {
    const s = setupScheduler()
    const task = s.addTask({ settings: { ...DEFAULT_SETTINGS, ifRunning: 'ignore' } })
    s.engine.run(task.id)
    s.engine.run(task.id)
    expect(s.runner.calls).toHaveLength(1)
    expect(s.runs.list(task.id)[0]).toMatchObject({ result: 'skipped', message: 'The task did not start because an earlier run of it is still going.' })
  })

  it('queue: starts the new run when the running one ends, in order', async () => {
    const s = setupScheduler()
    const task = s.addTask({ settings: { ...DEFAULT_SETTINGS, ifRunning: 'queue' } })
    s.engine.run(task.id)
    s.engine.run(task.id)
    s.engine.run(task.id)
    expect(s.engine.queued(task.id)).toBe(2)
    s.runner.calls[0].finish('success')
    await settle()
    expect(s.runner.calls).toHaveLength(2)
    expect(s.engine.queued(task.id)).toBe(1)
    s.runner.calls[1].finish('success')
    await settle()
    expect(s.runner.calls).toHaveLength(3)
    s.runner.calls[2].finish('success')
    await settle()
    expect(s.runs.list(task.id).map((r) => r.result)).toEqual(['success', 'success', 'success'])
  })

  it('queue: holds a limited number of runs', () => {
    const s = setupScheduler()
    const task = s.addTask({ settings: { ...DEFAULT_SETTINGS, ifRunning: 'queue' } })
    for (let i = 0; i < MAX_QUEUED + 3; i++) s.engine.run(task.id)
    expect(s.engine.queued(task.id)).toBe(MAX_QUEUED)
    expect(s.runs.list(task.id).filter((r) => r.result === 'skipped')).toHaveLength(2)
  })

  it('stop the existing instance: stops it and starts the new run at once', async () => {
    const s = setupScheduler()
    const task = s.addTask({ settings: { ...DEFAULT_SETTINGS, ifRunning: 'stop-existing' } })
    s.engine.run(task.id)
    s.engine.run(task.id)
    expect(s.runner.calls[0].input.signal.aborted).toBe(true)
    await settle()
    expect(s.runner.calls).toHaveLength(2)
    const runs = s.runs.list(task.id)
    expect(runs[1]).toMatchObject({ result: 'stopped', message: 'Agent7 stopped the task to start a new instance.' })
    expect(runs[0].result).toBe('running')
  })

  it('does not start a queued run for a task that was disabled meanwhile', async () => {
    const s = setupScheduler()
    const task = s.addTask({ settings: { ...DEFAULT_SETTINGS, ifRunning: 'queue' } })
    s.engine.run(task.id)
    s.engine.run(task.id)
    s.tasks.setEnabled(task.id, false, s.time.now())
    s.engine.disabled(task.id)
    s.runner.calls[0].finish('success')
    await settle()
    expect(s.runner.calls).toHaveLength(1)
  })
})

describe('stop if the task runs longer', () => {
  it('stops the run after the time and says so', async () => {
    const s = setupScheduler()
    const task = s.addTask({ settings: { ...DEFAULT_SETTINGS, stopIfRunsLonger: true, stopAfterMinutes: 30 } })
    s.engine.run(task.id)
    s.time.advance(29 * MINUTE)
    expect(s.runner.last.input.signal.aborted).toBe(false)
    s.time.advance(MINUTE)
    expect(s.runner.last.input.signal.aborted).toBe(true)
    await settle()
    expect(s.runs.list(task.id)[0]).toMatchObject({ result: 'stopped', message: 'The task ran longer than 30 minutes and Agent7 stopped it.' })
  })

  it('has no limit when the setting is off, and cancels its timer when the run ends early', async () => {
    const s = setupScheduler()
    const free = s.addTask({ settings: { ...DEFAULT_SETTINGS, stopIfRunsLonger: false } })
    s.engine.run(free.id)
    s.time.advance(24 * 60 * MINUTE)
    expect(s.runner.last.input.signal.aborted).toBe(false)
    s.runner.last.finish('success')
    await settle()

    const limited = s.addTask({ settings: { ...DEFAULT_SETTINGS, stopAfterMinutes: 5 } })
    s.engine.run(limited.id)
    s.runner.last.finish('success')
    await settle()
    expect(s.time.pending).toBe(0)
  })
})

describe('restart on failure', () => {
  const settings = { ...DEFAULT_SETTINGS, restartOnFailure: true, restartIntervalMinutes: 10, restartAttempts: 2 }

  it('starts the task again after the interval, as often as the settings say, then gives up', async () => {
    const s = setupScheduler()
    const task = s.addTask({ settings })
    s.engine.run(task.id)
    s.runner.calls[0].finish('failed', 'The agent crashed.')
    await settle()
    expect(s.log.names).toContain('task/restart-scheduled')
    s.time.advance(9 * MINUTE)
    expect(s.runner.calls).toHaveLength(1)
    s.time.advance(MINUTE)
    expect(s.runner.calls).toHaveLength(2)
    expect(s.runs.list(task.id)[0]).toMatchObject({ startedBy: 'retry', attempt: 2, result: 'running' })
    s.runner.calls[1].finish('failed', 'Again.')
    await settle()
    s.time.advance(10 * MINUTE)
    expect(s.runner.calls).toHaveLength(3)
    expect(s.runs.list(task.id)[0].attempt).toBe(3)
    s.runner.calls[2].finish('failed', 'Still.')
    await settle()
    s.time.advance(60 * MINUTE)
    expect(s.runner.calls).toHaveLength(3)
    expect(s.runs.list(task.id).map((r) => r.result)).toEqual(['failed', 'failed', 'failed'])
  })

  it('stops restarting after a success', async () => {
    const s = setupScheduler()
    const task = s.addTask({ settings })
    s.engine.run(task.id)
    s.runner.calls[0].finish('failed')
    await settle()
    s.time.advance(10 * MINUTE)
    s.runner.calls[1].finish('success')
    await settle()
    s.time.advance(60 * MINUTE)
    expect(s.runner.calls).toHaveLength(2)
  })

  it('does not restart a task that was stopped, or that End ended, or that is off', async () => {
    const s = setupScheduler()
    const stopped = s.addTask({ settings })
    s.engine.run(stopped.id)
    s.runner.last.finish('stopped')
    await settle()
    s.time.advance(60 * MINUTE)
    expect(s.runner.calls).toHaveLength(1)

    const off = s.addTask({ settings })
    s.engine.run(off.id)
    s.runner.last.finish('failed')
    await settle()
    s.tasks.setEnabled(off.id, false, s.time.now())
    s.engine.disabled(off.id)
    s.time.advance(60 * MINUTE)
    expect(s.runner.calls).toHaveLength(2)
  })

  it('does not restart when the setting is off', async () => {
    const s = setupScheduler()
    const task = s.addTask({})
    s.engine.run(task.id)
    s.runner.last.finish('failed')
    await settle()
    s.time.advance(60 * MINUTE)
    expect(s.runner.calls).toHaveLength(1)
    expect(s.runs.list(task.id)[0].result).toBe('failed')
  })
})

describe('shutdown and removal', () => {
  it('writes the runs that go on as failed when Agent7 closes, and stops the timers', async () => {
    const s = setupScheduler()
    const task = s.addTask({ triggers: [s.daily()] })
    s.engine.start()
    s.engine.run(task.id)
    s.engine.stop()
    expect(s.runs.list(task.id)[0]).toMatchObject({ result: 'failed', message: 'Agent7 closed while the task was running.' })
    expect(s.time.pending).toBe(0)
    s.runner.last.finish('success')
    await settle()
    expect(s.runs.list(task.id)[0].result).toBe('failed')
  })

  it('aborts the run of a task that is deleted', async () => {
    const s = setupScheduler()
    const task = s.addTask({})
    s.engine.run(task.id)
    s.tasks.remove(task.id)
    s.engine.forget(task.id)
    expect(s.runner.last.input.signal.aborted).toBe(true)
    await settle()
    expect(s.engine.isRunning(task.id)).toBe(false)
  })

  it('keeps only the newest runs in the history', async () => {
    const s = setupScheduler()
    const task = s.addTask({})
    for (let i = 0; i < 105; i++) {
      s.engine.run(task.id)
      s.runner.last.finish('success')
      await settle()
    }
    expect(s.runs.list(task.id)).toHaveLength(100)
  })
})

describe('the next run', () => {
  it('is the earliest enabled trigger, null for a disabled task or one with start-up triggers only', () => {
    const s = setupScheduler()
    const task = s.addTask({ triggers: [s.daily('2026-11-18T09:00'), s.daily('2026-11-17T10:30')] })
    expect(s.engine.nextRunAt(task)).toBe(at('2026-11-17T10:30'))
    expect(s.engine.nextRunAt({ ...task, enabled: false })).toBeNull()
    expect(s.engine.nextRunAt({ ...task, triggers: [{ kind: 'startup', enabled: true, delayMinutes: 0 }] })).toBeNull()
  })

  it('tells the observers which desktop changed', () => {
    const s = setupScheduler()
    const task = s.addTask({})
    s.engine.run(task.id)
    expect(s.changes).toContain(s.desktop.id)
  })
})

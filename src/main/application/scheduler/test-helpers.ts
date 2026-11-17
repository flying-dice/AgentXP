import type { Id } from '@shared/models'
import { epochOfLocal, fixedZone, type TriggerDto } from '@shared/schedule'
import { newAgentAction, newTaskInput, type ScheduledTaskInput } from '@shared/scheduler'
import { SqliteSessionRepository } from '../../infrastructure/db/sqlite-session-repository'
import { SqliteDesktopRepository } from '../../infrastructure/db/sqlite-desktop-repository'
import { SqliteScheduledTaskRepository } from '../../infrastructure/db/sqlite-scheduled-task-repository'
import { SqliteTaskRunRepository } from '../../infrastructure/db/sqlite-task-run-repository'
import { createFixture } from '../../infrastructure/db/test-helpers'
import type { ActionRunInput, ActionRunResult, ActionRunner, SchedulerClock, SchedulerLog, SchedulerLogRecord, SchedulerTimers, SchedulerWorld } from './ports'
import { TaskEngine } from './TaskEngine'

export const utc = fixedZone(0)
/** The instant of a wall-clock time in UTC. */
export const at = (local: string): number => epochOfLocal(utc, local) ?? NaN

/** Time by hand: `advance` moves the clock and runs the timers that fall due, in order. */
export class FakeTime implements SchedulerClock, SchedulerTimers {
  private clock: number
  private nextHandle = 1
  private readonly timers = new Map<number, { at: number; callback: () => void }>()

  constructor(start: number) {
    this.clock = start
  }

  now(): number {
    return this.clock
  }

  set(callback: () => void, ms: number): unknown {
    const handle = this.nextHandle++
    this.timers.set(handle, { at: this.clock + ms, callback })
    return handle
  }

  clear(handle: unknown): void {
    this.timers.delete(handle as number)
  }

  /** Timers that wait. */
  get pending(): number {
    return this.timers.size
  }

  advance(ms: number): void {
    this.advanceTo(this.clock + ms)
  }

  advanceTo(target: number): void {
    for (;;) {
      const due = [...this.timers.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0]
      if (!due) break
      this.timers.delete(due[0])
      this.clock = Math.max(this.clock, due[1].at)
      due[1].callback()
    }
    this.clock = target
  }
}

interface Call {
  input: ActionRunInput
  finish(result: ActionRunResult['result'], message?: string): void
}

/** An action runner that waits for the test: each run stays open until `finish` or an abort. */
export class FakeRunner implements ActionRunner {
  readonly calls: Call[] = []

  run(input: ActionRunInput): Promise<ActionRunResult> {
    return new Promise((resolve) => {
      const finish = (result: ActionRunResult['result'], message = result === 'success' ? 'The agent finished its turn.' : result): void => resolve({ result, message, sessionId: null })
      this.calls.push({ input, finish })
      input.signal.addEventListener('abort', () => finish('stopped'), { once: true })
    })
  }

  get last(): Call {
    return this.calls[this.calls.length - 1]
  }
}

export class FakeWorld implements SchedulerWorld {
  paused = new Set<Id>()
  busy = new Set<Id>()
  isPaused = (desktopId: Id): boolean => this.paused.has(desktopId)
  agentBusy = (desktopId: Id): boolean => this.busy.has(desktopId)
}

export class RecordingLog implements SchedulerLog {
  readonly records: SchedulerLogRecord[] = []
  record(record: SchedulerLogRecord): void {
    this.records.push(record)
  }

  get names(): string[] {
    return this.records.map((r) => r.name)
  }
}

/** Lets the promise callbacks of a finished run happen. */
export const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve))

export function setupScheduler(startLocal = '2026-11-17T08:00') {
  const f = createFixture()
  const desktop = new SqliteDesktopRepository(f.db).create({ agentId: f.agentId, title: 'project', isOpen: true })
  const other = new SqliteDesktopRepository(f.db).create({ agentId: f.agentId, title: 'other', isOpen: true })
  const time = new FakeTime(at(startLocal))
  const tasks = new SqliteScheduledTaskRepository(f.db)
  const runs = new SqliteTaskRunRepository(f.db)
  const runner = new FakeRunner()
  const world = new FakeWorld()
  const log = new RecordingLog()
  const engine = new TaskEngine({ tasks, runs, runner, world, log, clock: time, timers: time, zone: utc })
  const changes: Id[] = []
  engine.observe((id) => changes.push(id))
  /** Saves a task that was created at the current fake time. */
  const addTask = (over: Partial<ScheduledTaskInput> = {}, desktopId = desktop.id) =>
    tasks.create(desktopId, { ...newTaskInput('E:\\'), name: 'Review', actions: [{ ...newAgentAction('E:\\'), prompt: 'Review.' }], ...over }, time.now())
  const daily = (startAt = '2026-11-17T09:00'): TriggerDto => ({ kind: 'daily', enabled: true, startAt, expiresAt: null, everyDays: 1 })
  return { ...f, desktop, other, sessions: new SqliteSessionRepository(f.db), time, tasks, runs, runner, world, log, engine, changes, addTask, daily }
}

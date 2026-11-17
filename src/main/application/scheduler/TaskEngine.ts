import type { Id } from '@shared/models'
import { localZone, nextRunOfTriggers, type Zone } from '@shared/schedule'
import { HISTORY_KEPT, type TaskRunDto, type TaskRunResult, type TaskRunStart } from '@shared/scheduler'
import type { ScheduledTaskRecord, ScheduledTaskRepository } from '../../domain/repositories/scheduled-task-repository'
import type { TaskRunRepository } from '../../domain/repositories/task-run-repository'
import { AppError } from '../errors'
import type { ActionRunner, SchedulerClock, SchedulerLog, SchedulerTimers, SchedulerWorld } from './ports'

export interface TaskEngineDeps {
  tasks: ScheduledTaskRepository
  runs: TaskRunRepository
  runner: ActionRunner
  world: SchedulerWorld
  log: SchedulerLog
  clock?: SchedulerClock
  timers?: SchedulerTimers
  zone?: Zone
}

/** The longest sleep of the timer: it wakes up this often to look at the clock again (sleep and wake, a changed clock). */
export const MAX_TICK_MS = 60_000
/** A due time that is older than this when the scheduler sees it counts as missed (Agent7 was closed or the computer slept). */
export const MISSED_GRACE_MS = 2 * 60_000
/** Instances that wait for the running one, per task ("Queue a new instance"). */
export const MAX_QUEUED = 10

const MINUTE = 60_000

const realClock: SchedulerClock = { now: () => Date.now() }
const realTimers: SchedulerTimers = {
  set: (callback, ms) => {
    const handle = setTimeout(callback, ms)
    handle.unref?.()
    return handle
  },
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>)
}

type StopReason = 'ended' | 'timeout' | 'replaced'

interface ActiveRun {
  run: TaskRunDto
  controller: AbortController
  stopTimer: unknown
  /** Why the run was aborted, once it was. */
  reason: StopReason | null
}

/** How a run ended. */
interface Outcome {
  result: Exclude<TaskRunResult, 'running'>
  message: string
  sessionId: Id | null
}

const START_TEXT: Record<TaskRunStart, string> = {
  manual: 'run by the user',
  schedule: 'by its schedule',
  startup: 'at Agent7 startup',
  retry: 'a restart after a failure',
  missed: 'a missed run'
}

interface Waiting {
  by: TaskRunStart
  attempt: number
}

/**
 * The runtime of the Task Scheduler: it owns the timers, decides when a task is due, applies the conditions and the "if the
 * task is already running" rule, starts and ends runs, and keeps the history. It does not know what an action does: the
 * `ActionRunner` runs it. Time (`clock`, `timers`) and the zone are injected, so a test moves time by hand.
 *
 * - One timer sleeps until the earliest due time of any task (at most `MAX_TICK_MS`). When it wakes, every task whose due time
 *   passed since `handledUntil` starts once, however many due times passed.
 * - A due time that is older than `MISSED_GRACE_MS` was missed: the task starts only with "run missed tasks", else the history
 *   gets a "Missed" row.
 * - Run on demand ignores the conditions; every start honors the rule "if the task is already running".
 */
export class TaskEngine {
  private readonly clock: SchedulerClock
  private readonly timers: SchedulerTimers
  private readonly zone: Zone
  private readonly active = new Map<Id, ActiveRun>()
  private readonly waiting = new Map<Id, Waiting[]>()
  private readonly retries = new Map<Id, unknown>()
  private readonly startups = new Map<Id, unknown>()
  private readonly listeners = new Set<(desktopId: Id) => void>()
  private tick: unknown = null
  private started = false

  constructor(private readonly deps: TaskEngineDeps) {
    this.clock = deps.clock ?? realClock
    this.timers = deps.timers ?? realTimers
    this.zone = deps.zone ?? localZone
  }

  /** Called with the desktop whenever a run starts, ends or waits. */
  observe(listener: (desktopId: Id) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // ---- life cycle --------------------------------------------------------------------------------

  /**
   * Agent7 started: runs that a previous Agent7 left open are failed, tasks with a start-up trigger start (after their
   * delay), due times that passed while Agent7 was closed are missed, and the timer starts.
   */
  start(): void {
    if (this.started) return
    this.started = true
    const now = this.clock.now()
    this.deps.runs.failUnfinished(new Date(now).toISOString(), 'Agent7 closed while the task was running.')
    for (const task of this.deps.tasks.listAll()) {
      if (!task.enabled) continue
      const startup = this.startupDelay(task)
      this.catchUp(task, now, startup !== null)
      if (startup !== null) this.startups.set(task.id, this.timers.set(() => this.runStartup(task.id), startup * MINUTE))
    }
    this.arm()
  }

  /** Agent7 closes: timers stop and the runs that go on are written as failed. */
  stop(): void {
    this.started = false
    this.clearTimer()
    for (const handle of [...this.retries.values(), ...this.startups.values()]) this.timers.clear(handle)
    this.retries.clear()
    this.startups.clear()
    const endedAt = new Date(this.clock.now()).toISOString()
    for (const [taskId, active] of this.active) {
      this.timers.clear(active.stopTimer)
      active.controller.abort()
      this.deps.runs.finish(active.run.id, { endedAt, result: 'failed', message: 'Agent7 closed while the task was running.', sessionId: null })
      this.active.delete(taskId)
    }
    this.waiting.clear()
  }

  /** A task was saved, enabled, disabled or removed: look at the due times again. */
  changed(): void {
    if (this.started) this.arm()
  }

  /** The task is gone: its run ends, its waiting starts and its timers stop. */
  forget(taskId: Id): void {
    this.waiting.delete(taskId)
    this.dropTimer(this.retries, taskId)
    this.dropTimer(this.startups, taskId)
    this.active.get(taskId)?.controller.abort()
    this.active.delete(taskId)
    this.changed()
  }

  /** The desktop is being deleted: every task of it is forgotten (call it while the tasks still exist). */
  forgetDesktop(desktopId: Id): void {
    for (const task of this.deps.tasks.list(desktopId)) this.forget(task.id)
  }

  /** The task was disabled: waiting starts and restarts are dropped. A run that goes on is left alone, like in Windows. */
  disabled(taskId: Id): void {
    this.waiting.delete(taskId)
    this.dropTimer(this.retries, taskId)
    this.dropTimer(this.startups, taskId)
  }

  // ---- questions ---------------------------------------------------------------------------------

  isRunning(taskId: Id): boolean {
    return this.active.has(taskId)
  }

  queued(taskId: Id): number {
    return this.waiting.get(taskId)?.length ?? 0
  }

  /** The next time any enabled trigger of the task fires after now; null when none does (or only start-up triggers). */
  nextRunAt(task: ScheduledTaskRecord): number | null {
    return task.enabled ? nextRunOfTriggers(task.triggers, this.clock.now(), this.zone) : null
  }

  // ---- commands ----------------------------------------------------------------------------------

  /** "Run": starts the task now. The conditions do not apply; the rule for a running task does. */
  run(taskId: Id): void {
    const task = this.requireTask(taskId)
    if (!task.settings.allowOnDemand) throw new AppError('This task does not allow Run. Select "Allow task to be run on demand" in its settings.')
    if (!task.enabled) throw new AppError('Enable the task before you run it.')
    this.begin(task, 'manual', 1)
  }

  /** "End": stops the running instance and drops the waiting ones and the restarts. */
  end(taskId: Id): void {
    const task = this.requireTask(taskId)
    this.waiting.delete(taskId)
    this.dropTimer(this.retries, taskId)
    const active = this.active.get(taskId)
    if (!active) throw new AppError('The task is not running.')
    this.abort(active, 'ended')
    this.notify(task.desktopId)
  }

  // ---- due times ---------------------------------------------------------------------------------

  private onTick(): void {
    this.tick = null
    if (!this.started) return
    const now = this.clock.now()
    for (const task of this.deps.tasks.listAll()) {
      if (task.enabled) this.catchUp(task, now, false)
    }
    this.arm()
  }

  /**
   * Starts the task when a due time lies between `handledUntil` and `now`. Many due times count once. `covered`: the task
   * starts for another reason right now (a start-up trigger), so a missed time needs no second run.
   */
  private catchUp(task: ScheduledTaskRecord, now: number, covered: boolean): void {
    const due = nextRunOfTriggers(task.triggers, task.handledUntil, this.zone)
    if (due === null || due > now) return
    this.deps.tasks.setHandledUntil(task.id, now)
    const fresh = this.deps.tasks.get(task.id) ?? task
    if (now - due <= MISSED_GRACE_MS) return void this.fire(fresh, 'schedule')
    if (fresh.settings.runMissed && !covered) return void this.fire(fresh, 'missed')
    this.record(fresh, 'missed', 'missed', 'Agent7 was not running at the scheduled time, so the task did not start.')
  }

  /** Sleeps until the earliest due time, at most `MAX_TICK_MS`. */
  private arm(): void {
    this.clearTimer()
    if (!this.started) return
    const now = this.clock.now()
    let next: number | null = null
    for (const task of this.deps.tasks.listAll()) {
      if (!task.enabled) continue
      const due = nextRunOfTriggers(task.triggers, task.handledUntil, this.zone)
      if (due !== null && (next === null || due < next)) next = due
    }
    // Nothing is due ever again (or only start-up triggers): `changed()` arms the timer when a task changes.
    if (next === null) return
    this.tick = this.timers.set(() => this.onTick(), Math.min(MAX_TICK_MS, Math.max(0, next - now)))
  }

  private clearTimer(): void {
    if (this.tick !== null) this.timers.clear(this.tick)
    this.tick = null
  }

  private startupDelay(task: ScheduledTaskRecord): number | null {
    const delays = task.triggers.flatMap((t) => (t.kind === 'startup' && t.enabled ? [t.delayMinutes] : []))
    return delays.length === 0 ? null : Math.min(...delays)
  }

  private runStartup(taskId: Id): void {
    this.startups.delete(taskId)
    const task = this.deps.tasks.get(taskId)
    if (task?.enabled) this.fire(task, 'startup')
  }

  // ---- starting ----------------------------------------------------------------------------------

  /** A start that the schedule asked for: the conditions come first. */
  private fire(task: ScheduledTaskRecord, by: TaskRunStart): void {
    const problem = this.conditionProblem(task)
    if (problem) return this.record(task, 'skipped', by, problem)
    this.begin(task, by, 1)
  }

  private conditionProblem(task: ScheduledTaskRecord): string | null {
    const { conditions, desktopId } = task
    if (conditions.onlyIfNotPaused && this.deps.world.isPaused(desktopId)) return 'The task did not start because the desktop is paused.'
    if (conditions.onlyIfNoOtherTaskRuns) {
      const other = [...this.active.keys()].map((id) => this.deps.tasks.get(id)).find((t) => t && t.id !== task.id && t.desktopId === desktopId)
      if (other) return `The task did not start because the task "${other.name}" is running.`
    }
    if (conditions.onlyIfAgentIdle && this.deps.world.agentBusy(desktopId)) return 'The task did not start because the agent is busy with a chat.'
    return null
  }

  /** Starts a run, or does what "if the task is already running" says. */
  private begin(task: ScheduledTaskRecord, by: TaskRunStart, attempt: number): void {
    const active = this.active.get(task.id)
    if (!active) return this.launch(task, by, attempt)
    switch (task.settings.ifRunning) {
      case 'ignore':
        return this.record(task, 'skipped', by, 'The task did not start because an earlier run of it is still going.')
      case 'queue': {
        const queue = this.waiting.get(task.id) ?? []
        if (queue.length >= MAX_QUEUED) return this.record(task, 'skipped', by, `The task did not start because ${MAX_QUEUED} runs of it already wait.`)
        this.waiting.set(task.id, [...queue, { by, attempt }])
        return this.notify(task.desktopId)
      }
      case 'stop-existing':
        this.waiting.set(task.id, [{ by, attempt }, ...(this.waiting.get(task.id) ?? [])])
        this.abort(active, 'replaced')
        return this.notify(task.desktopId)
    }
  }

  private launch(task: ScheduledTaskRecord, by: TaskRunStart, attempt: number): void {
    const startedAt = new Date(this.clock.now())
    const run = this.deps.runs.start({ taskId: task.id, startedAt: startedAt.toISOString(), startedBy: by, attempt })
    const active: ActiveRun = { run, controller: new AbortController(), stopTimer: null, reason: null }
    if (task.settings.stopIfRunsLonger) active.stopTimer = this.timers.set(() => this.abort(active, 'timeout'), task.settings.stopAfterMinutes * MINUTE)
    this.active.set(task.id, active)
    this.log(task, 'info', 'task/started', `The task "${task.name}" started (${START_TEXT[by]}).`, { startedBy: by, attempt })
    this.notify(task.desktopId)
    void this.execute(task, active, startedAt)
      .catch((error: unknown): Outcome => ({ result: 'failed', message: error instanceof Error ? error.message : String(error), sessionId: null }))
      .then((outcome) => this.finish(task, active, outcome))
  }

  /** Runs the actions in order until one does not succeed. */
  private async execute(task: ScheduledTaskRecord, active: ActiveRun, startedAt: Date): Promise<Outcome> {
    let sessionId: Id | null = null
    let message = 'The task has no action.'
    for (const action of task.actions) {
      const outcome = await this.deps.runner.run({
        desktopId: task.desktopId,
        taskName: task.name,
        action,
        signal: active.controller.signal,
        startedAt,
        onSession: (id) => {
          sessionId = id
          this.deps.runs.setSession(active.run.id, id)
          this.notify(task.desktopId)
        }
      })
      sessionId = outcome.sessionId ?? sessionId
      message = outcome.message
      if (outcome.result !== 'success') return { result: outcome.result, message, sessionId }
    }
    return { result: 'success', message, sessionId }
  }

  private finish(task: ScheduledTaskRecord, active: ActiveRun, outcome: Outcome): void {
    // `stop()` and `forget()` already wrote or dropped this run.
    if (this.active.get(task.id) !== active) return
    this.timers.clear(active.stopTimer)
    this.active.delete(task.id)
    const stopped = outcome.result === 'stopped'
    const message = stopped ? this.stoppedMessage(task, active, outcome.message) : outcome.message
    const endedAt = new Date(this.clock.now()).toISOString()
    const saved = this.deps.runs.finish(active.run.id, { endedAt, result: outcome.result, message, sessionId: outcome.sessionId })
    this.deps.runs.prune(task.id, HISTORY_KEPT)
    const level = outcome.result === 'failed' ? 'error' : stopped ? 'warning' : 'info'
    const name = outcome.result === 'success' ? 'task/completed' : outcome.result === 'failed' ? 'task/failed' : 'task/stopped'
    const sentence = outcome.result === 'success' ? `The task "${task.name}" completed.` : outcome.result === 'failed' ? `The task "${task.name}" failed: ${message}` : `The task "${task.name}" was stopped: ${message}`
    this.log(task, level, name, sentence, { attempt: active.run.attempt, runId: saved?.id ?? active.run.id }, outcome.sessionId)
    if (outcome.result === 'failed') this.planRestart(task, active.run.attempt)
    this.startWaiting(task)
    this.notify(task.desktopId)
  }

  private stoppedMessage(task: ScheduledTaskRecord, active: ActiveRun, fallback: string): string {
    switch (active.reason) {
      case 'timeout':
        return `The task ran longer than ${task.settings.stopAfterMinutes} ${task.settings.stopAfterMinutes === 1 ? 'minute' : 'minutes'} and Agent7 stopped it.`
      case 'replaced':
        return 'Agent7 stopped the task to start a new instance.'
      case 'ended':
        return 'The task was ended by the user.'
      default:
        return fallback
    }
  }

  /** After a failed run: a restart in a while, as often as the settings say. */
  private planRestart(task: ScheduledTaskRecord, attempt: number): void {
    const current = this.deps.tasks.get(task.id)
    if (!current?.enabled || !current.settings.restartOnFailure || attempt > current.settings.restartAttempts) return
    this.dropTimer(this.retries, task.id)
    const minutes = current.settings.restartIntervalMinutes
    this.retries.set(task.id, this.timers.set(() => this.runRetry(task.id, attempt + 1), minutes * MINUTE))
    this.log(current, 'info', 'task/restart-scheduled', `The task "${current.name}" restarts in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} (attempt ${attempt + 1} of ${current.settings.restartAttempts + 1}).`, { attempt: attempt + 1 })
  }

  private runRetry(taskId: Id, attempt: number): void {
    this.retries.delete(taskId)
    const task = this.deps.tasks.get(taskId)
    if (!task?.enabled) return
    // A run that the schedule started in the meantime is the restart.
    if (this.active.has(taskId)) return
    this.launch(task, 'retry', attempt)
  }

  /** The run ended: the next waiting start (a queued instance or the replacement) begins. */
  private startWaiting(task: ScheduledTaskRecord): void {
    const [next, ...rest] = this.waiting.get(task.id) ?? []
    if (!next) return void this.waiting.delete(task.id)
    if (rest.length > 0) this.waiting.set(task.id, rest)
    else this.waiting.delete(task.id)
    const current = this.deps.tasks.get(task.id)
    if (current?.enabled) this.launch(current, next.by, next.attempt)
  }

  private abort(active: ActiveRun, reason: StopReason): void {
    if (active.reason !== null) return
    active.reason = reason
    active.controller.abort()
  }

  // ---- history and log ---------------------------------------------------------------------------

  /** A run that never started: one finished row and one log line. */
  private record(task: ScheduledTaskRecord, result: 'skipped' | 'missed', by: TaskRunStart, message: string): void {
    const at = new Date(this.clock.now()).toISOString()
    this.deps.runs.start({ taskId: task.id, startedAt: at, startedBy: by, attempt: 1, finished: { endedAt: at, result, message } })
    this.deps.runs.prune(task.id, HISTORY_KEPT)
    this.log(task, 'warning', result === 'missed' ? 'task/missed' : 'task/skipped', `The task "${task.name}": ${message}`, {})
    this.notify(task.desktopId)
  }

  private log(task: ScheduledTaskRecord, level: 'info' | 'warning' | 'error', name: string, message: string, details: Record<string, unknown>, sessionId: Id | null = null): void {
    this.deps.log.record({ desktopId: task.desktopId, level, name, message, taskId: task.id, taskName: task.name, sessionId, details })
  }

  private notify(desktopId: Id): void {
    for (const listener of this.listeners) listener(desktopId)
  }

  private requireTask(taskId: Id): ScheduledTaskRecord {
    const task = this.deps.tasks.get(taskId)
    if (!task) throw new AppError('Task not found')
    return task
  }

  private dropTimer(timers: Map<Id, unknown>, taskId: Id): void {
    const handle = timers.get(taskId)
    if (handle !== undefined) this.timers.clear(handle)
    timers.delete(taskId)
  }
}

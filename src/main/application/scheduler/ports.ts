import type { EventLevel } from '@shared/desktop'
import type { Id } from '@shared/models'
import type { TaskActionDto } from '@shared/scheduler'

/** The clock of the scheduler, in ms since the epoch. A test drives it by hand. */
export interface SchedulerClock {
  now(): number
}

/** Timers of the scheduler. A test replaces them to move time by hand. */
export interface SchedulerTimers {
  set(callback: () => void, ms: number): unknown
  clear(handle: unknown): void
}

/** What the scheduler needs to know about a desktop before it starts a task (the conditions). */
export interface SchedulerWorld {
  isPaused(desktopId: Id): boolean
  /** True while a chat of the desktop has a turn that runs or waits for an answer. */
  agentBusy(desktopId: Id): boolean
}

export interface ActionRunInput {
  desktopId: Id
  taskName: string
  action: TaskActionDto
  /** Aborted by End, by "stop the task if it runs longer" and by a replacing instance. */
  signal: AbortSignal
  startedAt: Date
  /** Tells the scheduler which chat the action works in as soon as it exists (so Open chat works during the run). */
  onSession(sessionId: Id): void
}

export interface ActionRunResult {
  result: 'success' | 'failed' | 'stopped'
  /** One plain sentence. */
  message: string
  sessionId: Id | null
}

/** Runs one action of a task and resolves when it ended. It never rejects: a failure is a `failed` result. */
export interface ActionRunner {
  run(input: ActionRunInput): Promise<ActionRunResult>
}

export interface SchedulerLogRecord {
  desktopId: Id
  level: EventLevel
  /** `task/started`, `task/failed`, ... */
  name: string
  /** One plain sentence: what the Event Viewer shows. */
  message: string
  taskId: Id
  taskName: string
  sessionId?: Id | null
  /** More facts for the Details tab. */
  details?: Record<string, unknown>
}

/** Where the scheduler writes what happened (the Event Viewer's log "Task Scheduler"). */
export interface SchedulerLog {
  record(record: SchedulerLogRecord): void
}

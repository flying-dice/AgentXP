import type { Id, IsoDate } from '@shared/models'
import type { TaskRunDto, TaskRunResult, TaskRunStart } from '@shared/scheduler'

export interface NewTaskRun {
  taskId: Id
  startedAt: IsoDate
  startedBy: TaskRunStart
  attempt: number
  /** A run that never started (skipped, missed) is stored finished. */
  finished?: { endedAt: IsoDate; result: Exclude<TaskRunResult, 'running'>; message: string }
}

export interface TaskRunFinish {
  endedAt: IsoDate
  result: Exclude<TaskRunResult, 'running'>
  message: string
  sessionId: Id | null
}

/** The history of scheduled tasks: one row per run, kept per task up to `HISTORY_KEPT`. */
export interface TaskRunRepository {
  start(input: NewTaskRun): TaskRunDto
  /** The chat that the running action works in, so "Open chat" works while the run goes on. */
  setSession(runId: Id, sessionId: Id): void
  finish(runId: Id, finish: TaskRunFinish): TaskRunDto | null
  /** Newest first. */
  list(taskId: Id): TaskRunDto[]
  /** The newest run of each task that has one. */
  lastRuns(taskIds: readonly Id[]): Map<Id, TaskRunDto>
  clear(taskId: Id): void
  /** Deletes the oldest runs of the task beyond `keep`. */
  prune(taskId: Id, keep: number): void
  /** Marks every run that is still `running` as failed with `message` (AgentXP closed while it ran). Returns how many. */
  failUnfinished(endedAt: IsoDate, message: string): number
}

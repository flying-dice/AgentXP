import type { Id, IsoDate } from '@shared/models'
import type { ScheduledTaskInput } from '@shared/scheduler'

/** A saved task: what the user edits plus the rows' own data. Status, next run and last run are worked out by the scheduler. */
export interface ScheduledTaskRecord extends ScheduledTaskInput {
  id: Id
  desktopId: Id
  createdAt: IsoDate
  /**
   * The instant (ms since the epoch) up to which the scheduler has dealt with the task's due times. A due time after it is
   * still to come, or was missed while Agent7 was closed. A new, edited or enabled task starts at "now".
   */
  handledUntil: number
}

export interface ScheduledTaskRepository {
  /** Every task of every desktop (the scheduler runs them all), oldest first. */
  listAll(): ScheduledTaskRecord[]
  /** The tasks of one desktop, oldest first. */
  list(desktopId: Id): ScheduledTaskRecord[]
  get(id: Id): ScheduledTaskRecord | null
  create(desktopId: Id, input: ScheduledTaskInput, handledUntil: number): ScheduledTaskRecord
  /** Replaces the task's data, triggers and actions. */
  update(id: Id, input: ScheduledTaskInput, handledUntil: number): ScheduledTaskRecord | null
  setEnabled(id: Id, enabled: boolean, handledUntil: number): boolean
  setHandledUntil(id: Id, handledUntil: number): void
  /** Cascades to the task's triggers, actions and runs. */
  remove(id: Id): boolean
}

import type { Id } from '@shared/models'
import type { DayOfWeek, TriggerDto } from '@shared/schedule'
import { DEFAULT_CONDITIONS, DEFAULT_SETTINGS, type IfRunning, type ScheduledTaskInput, type TaskActionDto } from '@shared/scheduler'
import type { ScheduledTaskRecord, ScheduledTaskRepository } from '../../domain/repositories/scheduled-task-repository'
import { prepare, transaction, type Database, type Statement } from './sql'

/** A set of small numbers as bits: `values` counted from `first` (the 1st of a month is bit 0, Sunday is bit 0). */
export function toMask(values: readonly number[], first: number): number {
  return values.reduce((mask, v) => mask + (v >= first && v < first + 31 && !hasBit(mask, v - first) ? 2 ** (v - first) : 0), 0)
}

const hasBit = (mask: number, bit: number): boolean => Math.floor(mask / 2 ** bit) % 2 === 1

/** The numbers of a bit set, ascending: `count` bits counted from `first`. */
export function fromMask(mask: number, first: number, count: number): number[] {
  return Array.from({ length: count }, (_, bit) => bit).filter((bit) => hasBit(mask, bit)).map((bit) => bit + first)
}

interface TaskRow {
  id: number
  desktop_id: number
  name: string
  description: string
  enabled: number
  only_if_no_other_task: number
  only_if_agent_idle: number
  only_if_not_paused: number
  allow_on_demand: number
  run_missed: number
  stop_if_runs_longer: number
  stop_after_minutes: number
  restart_on_failure: number
  restart_interval_minutes: number
  restart_attempts: number
  if_running: IfRunning
  handled_until: number
  created_at: string
}

interface TriggerRow {
  task_id: number
  kind: TriggerDto['kind']
  enabled: number
  start_at: string | null
  expires_at: string | null
  repeat_every: number
  delay_minutes: number
  days_of_week: number
  months: number
  days_of_month: number
  last_day: number
}

interface ActionRow {
  task_id: number
  agent_id: number | null
  cwd: string
  session_mode: 'new' | 'existing'
  session_id: number | null
  prompt: string
}

const TASK_COLUMNS =
  'id, desktop_id, name, description, enabled, only_if_no_other_task, only_if_agent_idle, only_if_not_paused, allow_on_demand, run_missed, stop_if_runs_longer, stop_after_minutes, restart_on_failure, restart_interval_minutes, restart_attempts, if_running, handled_until, created_at'

const flag = (value: boolean): number => (value ? 1 : 0)

function toTrigger(row: TriggerRow): TriggerDto {
  const enabled = row.enabled === 1
  if (row.kind === 'startup') return { kind: 'startup', enabled, delayMinutes: row.delay_minutes }
  const timed = { enabled, startAt: row.start_at ?? '', expiresAt: row.expires_at }
  switch (row.kind) {
    case 'once':
      return { kind: 'once', ...timed }
    case 'daily':
      return { kind: 'daily', ...timed, everyDays: row.repeat_every }
    case 'weekly':
      return { kind: 'weekly', ...timed, everyWeeks: row.repeat_every, daysOfWeek: fromMask(row.days_of_week, 0, 7) as DayOfWeek[] }
    case 'monthly':
      return { kind: 'monthly', ...timed, months: fromMask(row.months, 1, 12), daysOfMonth: fromMask(row.days_of_month, 1, 31), lastDay: row.last_day === 1 }
  }
}

const toAction = (row: ActionRow): TaskActionDto => ({ kind: 'agent', agentId: row.agent_id, cwd: row.cwd, session: row.session_mode, sessionId: row.session_id, prompt: row.prompt })

/** The rows of the triggers, as the columns of `scheduled_task_triggers` after `task_id` and `position`. */
function triggerColumns(t: TriggerDto): [string, number, string | null, string | null, number, number, number, number, number, number] {
  if (t.kind === 'startup') return [t.kind, flag(t.enabled), null, null, 1, t.delayMinutes, 0, 0, 0, 0]
  const base = [t.kind, flag(t.enabled), t.startAt, t.expiresAt] as const
  switch (t.kind) {
    case 'once':
      return [...base, 1, 0, 0, 0, 0, 0]
    case 'daily':
      return [...base, t.everyDays, 0, 0, 0, 0, 0]
    case 'weekly':
      return [...base, t.everyWeeks, 0, toMask(t.daysOfWeek, 0), 0, 0, 0]
    case 'monthly':
      return [...base, 1, 0, 0, toMask(t.months, 1), toMask(t.daysOfMonth, 1), flag(t.lastDay)]
  }
}

export class SqliteScheduledTaskRepository implements ScheduledTaskRepository {
  private readonly selectAll: Statement<[], TaskRow>
  private readonly selectByDesktop: Statement<[Id], TaskRow>
  private readonly selectById: Statement<[Id], TaskRow>
  private readonly selectTriggers: Statement<[Id], TriggerRow>
  private readonly selectActions: Statement<[Id], ActionRow>
  private readonly insertTask: Statement<unknown[]>
  private readonly updateTask: Statement<unknown[]>
  private readonly insertTrigger: Statement<unknown[]>
  private readonly insertAction: Statement<unknown[]>
  private readonly deleteTriggers: Statement<[Id]>
  private readonly deleteActions: Statement<[Id]>
  private readonly updateEnabled: Statement<[number, number, Id]>
  private readonly updateHandled: Statement<[number, Id]>
  private readonly delete_: Statement<[Id]>

  constructor(private readonly db: Database) {
    this.selectAll = prepare(db, `SELECT ${TASK_COLUMNS} FROM scheduled_tasks ORDER BY id`)
    this.selectByDesktop = prepare(db, `SELECT ${TASK_COLUMNS} FROM scheduled_tasks WHERE desktop_id = ? ORDER BY id`)
    this.selectById = prepare(db, `SELECT ${TASK_COLUMNS} FROM scheduled_tasks WHERE id = ?`)
    this.selectTriggers = prepare(db, 'SELECT task_id, kind, enabled, start_at, expires_at, repeat_every, delay_minutes, days_of_week, months, days_of_month, last_day FROM scheduled_task_triggers WHERE task_id = ? ORDER BY position')
    this.selectActions = prepare(db, 'SELECT task_id, agent_id, cwd, session_mode, session_id, prompt FROM scheduled_task_actions WHERE task_id = ? ORDER BY position')
    this.insertTask = prepare(
      db,
      'INSERT INTO scheduled_tasks (desktop_id, name, description, enabled, only_if_no_other_task, only_if_agent_idle, only_if_not_paused, allow_on_demand, run_missed, stop_if_runs_longer, stop_after_minutes, restart_on_failure, restart_interval_minutes, restart_attempts, if_running, handled_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    this.updateTask = prepare(
      db,
      'UPDATE scheduled_tasks SET name = ?, description = ?, enabled = ?, only_if_no_other_task = ?, only_if_agent_idle = ?, only_if_not_paused = ?, allow_on_demand = ?, run_missed = ?, stop_if_runs_longer = ?, stop_after_minutes = ?, restart_on_failure = ?, restart_interval_minutes = ?, restart_attempts = ?, if_running = ?, handled_until = ? WHERE id = ?'
    )
    this.insertTrigger = prepare(
      db,
      'INSERT INTO scheduled_task_triggers (task_id, position, kind, enabled, start_at, expires_at, repeat_every, delay_minutes, days_of_week, months, days_of_month, last_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    this.insertAction = prepare(db, 'INSERT INTO scheduled_task_actions (task_id, position, agent_id, cwd, session_mode, session_id, prompt) VALUES (?, ?, ?, ?, ?, ?, ?)')
    this.deleteTriggers = prepare(db, 'DELETE FROM scheduled_task_triggers WHERE task_id = ?')
    this.deleteActions = prepare(db, 'DELETE FROM scheduled_task_actions WHERE task_id = ?')
    this.updateEnabled = prepare(db, 'UPDATE scheduled_tasks SET enabled = ?, handled_until = ? WHERE id = ?')
    this.updateHandled = prepare(db, 'UPDATE scheduled_tasks SET handled_until = ? WHERE id = ?')
    this.delete_ = prepare(db, 'DELETE FROM scheduled_tasks WHERE id = ?')
  }

  listAll(): ScheduledTaskRecord[] {
    return this.selectAll.all().map((row) => this.toRecord(row))
  }

  list(desktopId: Id): ScheduledTaskRecord[] {
    return this.selectByDesktop.all(desktopId).map((row) => this.toRecord(row))
  }

  get(id: Id): ScheduledTaskRecord | null {
    const row = this.selectById.get(id)
    return row ? this.toRecord(row) : null
  }

  create(desktopId: Id, input: ScheduledTaskInput, handledUntil: number): ScheduledTaskRecord {
    return transaction(this.db, () => {
      const { conditions: c, settings: s } = input
      const id = Number(
        this.insertTask.run(desktopId, input.name, input.description, flag(input.enabled), flag(c.onlyIfNoOtherTaskRuns), flag(c.onlyIfAgentIdle), flag(c.onlyIfNotPaused), flag(s.allowOnDemand), flag(s.runMissed), flag(s.stopIfRunsLonger), s.stopAfterMinutes, flag(s.restartOnFailure), s.restartIntervalMinutes, s.restartAttempts, s.ifRunning, handledUntil)
          .lastInsertRowid
      )
      this.writeChildren(id, input)
      return this.get(id)!
    })
  }

  update(id: Id, input: ScheduledTaskInput, handledUntil: number): ScheduledTaskRecord | null {
    return transaction(this.db, () => {
      if (!this.selectById.get(id)) return null
      const { conditions: c, settings: s } = input
      this.updateTask.run(input.name, input.description, flag(input.enabled), flag(c.onlyIfNoOtherTaskRuns), flag(c.onlyIfAgentIdle), flag(c.onlyIfNotPaused), flag(s.allowOnDemand), flag(s.runMissed), flag(s.stopIfRunsLonger), s.stopAfterMinutes, flag(s.restartOnFailure), s.restartIntervalMinutes, s.restartAttempts, s.ifRunning, handledUntil, id)
      this.deleteTriggers.run(id)
      this.deleteActions.run(id)
      this.writeChildren(id, input)
      return this.get(id)
    })
  }

  setEnabled(id: Id, enabled: boolean, handledUntil: number): boolean {
    return this.updateEnabled.run(flag(enabled), handledUntil, id).changes > 0
  }

  setHandledUntil(id: Id, handledUntil: number): void {
    this.updateHandled.run(handledUntil, id)
  }

  remove(id: Id): boolean {
    return this.delete_.run(id).changes > 0
  }

  private writeChildren(taskId: Id, input: ScheduledTaskInput): void {
    input.triggers.forEach((t, position) => this.insertTrigger.run(taskId, position, ...triggerColumns(t)))
    input.actions.forEach((a, position) => this.insertAction.run(taskId, position, a.agentId, a.cwd, a.session, a.session === 'existing' ? a.sessionId : null, a.prompt))
  }

  private toRecord(row: TaskRow): ScheduledTaskRecord {
    return {
      id: row.id,
      desktopId: row.desktop_id,
      name: row.name,
      description: row.description,
      enabled: row.enabled === 1,
      triggers: this.selectTriggers.all(row.id).map(toTrigger),
      actions: this.selectActions.all(row.id).map(toAction),
      conditions: {
        ...DEFAULT_CONDITIONS,
        onlyIfNoOtherTaskRuns: row.only_if_no_other_task === 1,
        onlyIfAgentIdle: row.only_if_agent_idle === 1,
        onlyIfNotPaused: row.only_if_not_paused === 1
      },
      settings: {
        ...DEFAULT_SETTINGS,
        allowOnDemand: row.allow_on_demand === 1,
        runMissed: row.run_missed === 1,
        stopIfRunsLonger: row.stop_if_runs_longer === 1,
        stopAfterMinutes: row.stop_after_minutes,
        restartOnFailure: row.restart_on_failure === 1,
        restartIntervalMinutes: row.restart_interval_minutes,
        restartAttempts: row.restart_attempts,
        ifRunning: row.if_running
      },
      handledUntil: row.handled_until,
      createdAt: row.created_at
    }
  }
}

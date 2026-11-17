import type { Id } from '@shared/models'
import type { TaskRunDto, TaskRunResult, TaskRunStart } from '@shared/scheduler'
import type { NewTaskRun, TaskRunFinish, TaskRunRepository } from '../../domain/repositories/task-run-repository'
import { idsJson, prepare, type Database, type Statement } from './sql'

interface RunRow {
  id: number
  task_id: number
  started_at: string
  ended_at: string | null
  result: TaskRunResult
  message: string
  started_by: TaskRunStart
  session_id: number | null
  attempt: number
}

const COLUMNS = 'id, task_id, started_at, ended_at, result, message, started_by, session_id, attempt'

const toDto = (row: RunRow): TaskRunDto => ({
  id: row.id,
  taskId: row.task_id,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  result: row.result,
  message: row.message,
  startedBy: row.started_by,
  sessionId: row.session_id,
  attempt: row.attempt
})

export class SqliteTaskRunRepository implements TaskRunRepository {
  private readonly selectById: Statement<[Id], RunRow>
  private readonly selectByTask: Statement<[Id], RunRow>
  private readonly selectLast: Statement<[string], RunRow>
  private readonly insert: Statement<[Id, string, string | null, string, string, string, number]>
  private readonly updateFinish: Statement<[string, string, string, Id | null, Id]>
  private readonly updateSession: Statement<[Id, Id]>
  private readonly deleteByTask: Statement<[Id]>
  private readonly deleteOld: Statement<[Id, Id, number]>
  private readonly updateUnfinished: Statement<[string, string]>

  constructor(db: Database) {
    this.selectById = prepare(db, `SELECT ${COLUMNS} FROM scheduled_task_runs WHERE id = ?`)
    this.selectByTask = prepare(db, `SELECT ${COLUMNS} FROM scheduled_task_runs WHERE task_id = ? ORDER BY id DESC`)
    this.selectLast = prepare(
      db,
      `SELECT ${COLUMNS} FROM scheduled_task_runs WHERE id IN (SELECT MAX(id) FROM scheduled_task_runs WHERE task_id IN (SELECT value FROM json_each(?)) GROUP BY task_id)`
    )
    this.insert = prepare(db, 'INSERT INTO scheduled_task_runs (task_id, started_at, ended_at, result, message, started_by, attempt) VALUES (?, ?, ?, ?, ?, ?, ?)')
    this.updateFinish = prepare(db, 'UPDATE scheduled_task_runs SET ended_at = ?, result = ?, message = ?, session_id = COALESCE(?, session_id) WHERE id = ?')
    this.updateSession = prepare(db, 'UPDATE scheduled_task_runs SET session_id = ? WHERE id = ?')
    this.deleteByTask = prepare(db, 'DELETE FROM scheduled_task_runs WHERE task_id = ?')
    this.deleteOld = prepare(db, 'DELETE FROM scheduled_task_runs WHERE task_id = ? AND id NOT IN (SELECT id FROM scheduled_task_runs WHERE task_id = ? ORDER BY id DESC LIMIT ?)')
    this.updateUnfinished = prepare(db, "UPDATE scheduled_task_runs SET result = 'failed', ended_at = ?, message = ? WHERE result = 'running'")
  }

  start(input: NewTaskRun): TaskRunDto {
    const done = input.finished
    const id = Number(this.insert.run(input.taskId, input.startedAt, done?.endedAt ?? null, done?.result ?? 'running', done?.message ?? '', input.startedBy, input.attempt).lastInsertRowid)
    return toDto(this.selectById.get(id)!)
  }

  setSession(runId: Id, sessionId: Id): void {
    this.updateSession.run(sessionId, runId)
  }

  finish(runId: Id, finish: TaskRunFinish): TaskRunDto | null {
    this.updateFinish.run(finish.endedAt, finish.result, finish.message, finish.sessionId, runId)
    const row = this.selectById.get(runId)
    return row ? toDto(row) : null
  }

  list(taskId: Id): TaskRunDto[] {
    return this.selectByTask.all(taskId).map(toDto)
  }

  lastRuns(taskIds: readonly Id[]): Map<Id, TaskRunDto> {
    if (taskIds.length === 0) return new Map()
    return new Map(this.selectLast.all(idsJson(taskIds)).map((row) => [row.task_id, toDto(row)]))
  }

  clear(taskId: Id): void {
    this.deleteByTask.run(taskId)
  }

  prune(taskId: Id, keep: number): void {
    this.deleteOld.run(taskId, taskId, keep)
  }

  failUnfinished(endedAt: string, message: string): number {
    return this.updateUnfinished.run(endedAt, message).changes
  }
}

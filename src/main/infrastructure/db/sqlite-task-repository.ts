import { prepare, transaction, type Database, type Statement } from './sql'
import type { Id, TaskDto, TaskPriority, TaskStatus } from '@shared/models'
import type { NewTask, TaskRepository } from '../../domain/repositories/task-repository'

interface TaskRow {
  id: number
  session_id: number
  position: number
  content: string
  priority: TaskPriority
  status: TaskStatus
}

function toDto(row: TaskRow): TaskDto {
  return {
    id: row.id,
    sessionId: row.session_id,
    position: row.position,
    content: row.content,
    priority: row.priority,
    status: row.status
  }
}

export class SqliteTaskRepository implements TaskRepository {
  private readonly selectBySession: Statement<[Id], TaskRow>
  private readonly deleteBySession: Statement<[Id]>
  private readonly insertTask: Statement<[Id, number, string, string, string]>

  constructor(private readonly db: Database) {
    this.selectBySession = prepare(db, 
      'SELECT id, session_id, position, content, priority, status FROM tasks WHERE session_id = ? ORDER BY position'
    )
    this.deleteBySession = prepare(db, 'DELETE FROM tasks WHERE session_id = ?')
    this.insertTask = prepare(db, 
      'INSERT INTO tasks (session_id, position, content, priority, status) VALUES (?, ?, ?, ?, ?)'
    )
  }

  list(sessionId: Id): TaskDto[] {
    return this.selectBySession.all(sessionId).map(toDto)
  }

  replace(sessionId: Id, tasks: NewTask[]): TaskDto[] {
    transaction(this.db, () => {
      this.deleteBySession.run(sessionId)
      tasks.forEach((t, position) => this.insertTask.run(sessionId, position, t.content, t.priority, t.status))
    })
    return this.list(sessionId)
  }
}

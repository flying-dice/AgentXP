import type { Id, TaskDto } from '@shared/models'

export type NewTask = Pick<TaskDto, 'content' | 'priority' | 'status'>

export interface TaskRepository {
  list(sessionId: Id): TaskDto[]
  /** Atomically replaces the whole plan; positions follow array order. */
  replace(sessionId: Id, tasks: NewTask[]): TaskDto[]
}

import type { Id } from '@shared/models'
import { normaliseVPath } from '@shared/vfs'
import { checkCapabilities, type CapabilityRegistry } from './ActionScope'
import { taskProblem, type ScheduledTaskDto, type ScheduledTaskInput, type TaskActionDto, type TaskRunDto, type TaskStatus } from '@shared/scheduler'
import type { AgentRepository } from '../../domain/repositories/agent-repository'
import type { DesktopRepository } from '../../domain/repositories/desktop-repository'
import type { ScheduledTaskRecord, ScheduledTaskRepository } from '../../domain/repositories/scheduled-task-repository'
import type { SessionRepository } from '../../domain/repositories/session-repository'
import type { TaskRunRepository } from '../../domain/repositories/task-run-repository'
import { AppError, required } from '../errors'
import type { EventPublisher } from '../ports'
import type { SchedulerClock, SchedulerLog } from './ports'
import type { TaskEngine } from './TaskEngine'

export interface SchedulerServiceDeps {
  tasks: ScheduledTaskRepository
  runs: TaskRunRepository
  engine: TaskEngine
  desktops: Pick<DesktopRepository, 'get'>
  agents: Pick<AgentRepository, 'get'>
  sessions: Pick<SessionRepository, 'get'>
  /** Skills, servers, profiles and teams that an action may choose. */
  registry: CapabilityRegistry
  events: EventPublisher
  log: SchedulerLog
  clock?: SchedulerClock
}

/** The Task Scheduler as the renderer sees it: saving and listing tasks, Run, End, enable and the history. The `TaskEngine` does the running. */
export class SchedulerService {
  private readonly clock: SchedulerClock

  constructor(private readonly deps: SchedulerServiceDeps) {
    this.clock = deps.clock ?? { now: () => Date.now() }
    deps.engine.observe((desktopId) => this.publish(desktopId))
  }

  list(desktopId: Id): ScheduledTaskDto[] {
    const records = this.deps.tasks.list(desktopId)
    const last = this.deps.runs.lastRuns(records.map((r) => r.id))
    return records.map((record) => this.toDto(record, last.get(record.id) ?? null))
  }

  create(desktopId: Id, input: ScheduledTaskInput): ScheduledTaskDto {
    required(this.deps.desktops.get(desktopId), 'Desktop')
    const clean = this.check(desktopId, input)
    const record = this.deps.tasks.create(desktopId, clean, this.clock.now())
    this.logChange(record, 'task/created', `The task "${record.name}" was created.`)
    return this.changed(record)
  }

  update(id: Id, input: ScheduledTaskInput): ScheduledTaskDto {
    const current = required(this.deps.tasks.get(id), 'Task')
    const clean = this.check(current.desktopId, input)
    // Changed triggers start from now: what the old ones missed is not missed by the new ones.
    const record = required(this.deps.tasks.update(id, clean, this.clock.now()), 'Task')
    if (!record.enabled) this.deps.engine.disabled(id)
    this.logChange(record, 'task/updated', `The task "${record.name}" was changed.`)
    return this.changed(record)
  }

  remove(id: Id): void {
    const record = required(this.deps.tasks.get(id), 'Task')
    this.deps.tasks.remove(id)
    this.deps.engine.forget(id)
    this.logChange(record, 'task/deleted', `The task "${record.name}" was deleted.`)
    this.publish(record.desktopId)
  }

  setEnabled(id: Id, enabled: boolean): ScheduledTaskDto {
    const current = required(this.deps.tasks.get(id), 'Task')
    // Enabling starts the clock from now: the time the task was off is not missed time.
    this.deps.tasks.setEnabled(id, enabled, this.clock.now())
    if (!enabled) this.deps.engine.disabled(id)
    const record = required(this.deps.tasks.get(id), 'Task')
    if (current.enabled !== enabled) this.logChange(record, enabled ? 'task/enabled' : 'task/disabled', `The task "${record.name}" was ${enabled ? 'enabled' : 'disabled'}.`)
    return this.changed(record)
  }

  run(id: Id): void {
    this.deps.engine.run(id)
  }

  end(id: Id): void {
    this.deps.engine.end(id)
  }

  history(id: Id): TaskRunDto[] {
    required(this.deps.tasks.get(id), 'Task')
    return this.deps.runs.list(id)
  }

  clearHistory(id: Id): void {
    const record = required(this.deps.tasks.get(id), 'Task')
    this.deps.runs.clear(id)
    this.publish(record.desktopId)
  }

  // ---- helpers -----------------------------------------------------------------------------------

  /** The input as it is saved: trimmed, paths normalized, the chat of an action only when it uses one. The agents and chats must exist. */
  private check(desktopId: Id, input: ScheduledTaskInput): ScheduledTaskInput {
    const actions = input.actions.map((a): TaskActionDto => ({ ...a, cwd: normaliseVPath(a.cwd) ?? a.cwd, sessionId: a.session === 'existing' ? a.sessionId : null }))
    const clean: ScheduledTaskInput = { ...input, name: input.name.trim(), actions }
    const problem = taskProblem(clean)
    if (problem) throw new AppError(problem)
    clean.actions = actions.map((action) => {
      if (action.agentId !== null && !this.deps.agents.get(action.agentId)) throw new AppError('Choose an agent that exists.')
      if (action.sessionId !== null && this.deps.sessions.get(action.sessionId)?.desktopId !== desktopId) throw new AppError('Choose a chat of this desktop.')
      const checked = checkCapabilities(action.capabilities, this.deps.registry)
      if ('problem' in checked) throw new AppError(checked.problem)
      return { ...action, capabilities: checked.value }
    })
    return clean
  }

  private changed(record: ScheduledTaskRecord): ScheduledTaskDto {
    this.deps.engine.changed()
    this.publish(record.desktopId)
    const last = this.deps.runs.lastRuns([record.id]).get(record.id) ?? null
    return this.toDto(record, last)
  }

  private publish(desktopId: Id): void {
    this.deps.events.publish('scheduler.changed', { desktopId, tasks: this.list(desktopId) })
  }

  private logChange(record: ScheduledTaskRecord, name: string, message: string): void {
    this.deps.log.record({ desktopId: record.desktopId, level: 'info', name, message, taskId: record.id, taskName: record.name })
  }

  private toDto(record: ScheduledTaskRecord, lastRun: TaskRunDto | null): ScheduledTaskDto {
    const { handledUntil: _handledUntil, ...task } = record
    const running = this.deps.engine.isRunning(record.id)
    const status: TaskStatus = running ? 'running' : record.enabled ? 'ready' : 'disabled'
    const next = this.deps.engine.nextRunAt(record)
    return { ...task, status, queued: this.deps.engine.queued(record.id), nextRunAt: next === null ? null : new Date(next).toISOString(), lastRun }
  }
}

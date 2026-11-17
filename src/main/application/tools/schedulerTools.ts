import type { Id } from '@shared/models'
import { describeTrigger, type DayOfWeek, type TriggerDto } from '@shared/schedule'
import { newTaskInput, type ScheduledTaskDto, type ScheduledTaskInput } from '@shared/scheduler'
import type { VPath } from '@shared/vfs'
import { AppError } from '../errors'
import type { SchedulerService } from '../scheduler/SchedulerService'
import type { ToolArgs, ToolHandlers } from './catalog'
import type { ToolPaths } from './ToolPaths'
import { attempt, textResult, type ToolContext } from './types'

export interface SchedulerToolsDeps {
  scheduler: Pick<SchedulerService, 'list' | 'create' | 'update' | 'remove' | 'setEnabled' | 'run' | 'end' | 'history' | 'clearHistory'>
  agents: { list(): { id: Id; name: string }[] }
  paths: Pick<ToolPaths, 'resolve'>
}

type Names = 'scheduler_list' | 'scheduler_get' | 'scheduler_create' | 'scheduler_update' | 'scheduler_delete' | 'scheduler_enable' | 'scheduler_run' | 'scheduler_end' | 'scheduler_clear_history'
type TriggerArg = ToolArgs<'scheduler_create'>['triggers'][number]
type TaskFields = Partial<Omit<ToolArgs<'scheduler_create'>, 'name'>> & { name?: string }

/** A trigger as the agent writes it, with the defaults of the Create Trigger dialog. */
export function toTrigger(t: TriggerArg): TriggerDto {
  const enabled = t.enabled ?? true
  switch (t.kind) {
    case 'startup':
      return { kind: 'startup', enabled, delayMinutes: t.delayMinutes ?? 0 }
    case 'once':
      return { kind: 'once', enabled, startAt: t.startAt, expiresAt: t.expiresAt ?? null }
    case 'daily':
      return { kind: 'daily', enabled, startAt: t.startAt, expiresAt: t.expiresAt ?? null, everyDays: t.everyDays ?? 1 }
    case 'weekly':
      return { kind: 'weekly', enabled, startAt: t.startAt, expiresAt: t.expiresAt ?? null, everyWeeks: t.everyWeeks ?? 1, daysOfWeek: t.daysOfWeek as DayOfWeek[] }
    case 'monthly':
      return {
        kind: 'monthly',
        enabled,
        startAt: t.startAt,
        expiresAt: t.expiresAt ?? null,
        months: t.months ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        daysOfMonth: t.daysOfMonth ?? [],
        lastDay: t.lastDay ?? false
      }
  }
}

/** One line per task, as the task list shows it. */
export function describeTask(task: ScheduledTaskDto): string {
  const triggers = task.triggers.map(describeTrigger).join('; ') || 'no triggers'
  const last = task.lastRun ? `${task.lastRun.result} at ${task.lastRun.startedAt}` : 'never run'
  return `[${task.id}] ${task.name} (${task.status}${task.queued ? `, ${task.queued} queued` : ''}): ${triggers}. Next run: ${task.nextRunAt ?? 'none'}. Last run: ${last}.`
}

/** scheduler_*: the Task Scheduler of the caller's desktop, the same service the Task Scheduler window uses. */
export function createSchedulerTools({ scheduler, agents, paths }: SchedulerToolsDeps): ToolHandlers<Names> {
  const find = (desktopId: Id, ref: number | string): ScheduledTaskDto => {
    const tasks = scheduler.list(desktopId)
    const hit = typeof ref === 'number' ? tasks.find((t) => t.id === ref) : tasks.find((t) => t.name.toLowerCase() === ref.trim().toLowerCase())
    if (!hit) throw new AppError(`There is no task "${ref}" on this desktop. Call scheduler_list.`)
    return hit
  }

  const agentId = (ref: number | string): Id => {
    const all = agents.list()
    const hit = typeof ref === 'number' ? all.find((a) => a.id === ref) : all.find((a) => a.name.toLowerCase() === ref.trim().toLowerCase())
    if (!hit) throw new AppError(`There is no agent "${ref}". Agents: ${all.map((a) => a.name).join(', ') || '(none)'}.`)
    return hit.id
  }

  /** `base` with the fields the agent gave. */
  const merge = (context: ToolContext, base: ScheduledTaskInput, f: TaskFields): ScheduledTaskInput => {
    const action = { ...base.actions[0]! }
    if (f.prompt !== undefined) action.prompt = f.prompt
    if (f.cwd !== undefined) action.cwd = paths.resolve(context, f.cwd) as VPath
    if (f.agent !== undefined) action.agentId = agentId(f.agent)
    if (f.chat !== undefined) Object.assign(action, { session: 'existing', sessionId: f.chat })
    const settings = { ...base.settings }
    if (f.ifRunning !== undefined) settings.ifRunning = f.ifRunning
    if (f.stopAfterMinutes !== undefined) Object.assign(settings, { stopIfRunsLonger: f.stopAfterMinutes > 0, stopAfterMinutes: f.stopAfterMinutes || settings.stopAfterMinutes })
    if (f.runMissed !== undefined) settings.runMissed = f.runMissed
    const conditions = { ...base.conditions }
    if (f.onlyIfAgentIdle !== undefined) conditions.onlyIfAgentIdle = f.onlyIfAgentIdle
    if (f.onlyIfNotPaused !== undefined) conditions.onlyIfNotPaused = f.onlyIfNotPaused
    return {
      ...base,
      name: f.name ?? base.name,
      description: f.description ?? base.description,
      enabled: f.enabled ?? base.enabled,
      triggers: f.triggers ? f.triggers.map(toTrigger) : base.triggers,
      actions: [action],
      settings,
      conditions
    }
  }

  const inputOf = (task: ScheduledTaskDto): ScheduledTaskInput => {
    const { name, description, enabled, triggers, actions, conditions, settings } = task
    return { name, description, enabled, triggers, actions, conditions, settings }
  }

  return {
    scheduler_list: async (_args, { desktopId }) => {
      const tasks = scheduler.list(desktopId)
      return textResult(tasks.length === 0 ? 'No scheduled tasks.' : tasks.map(describeTask).join('\n'))
    },

    scheduler_get: ({ task, runs }, { desktopId }) =>
      attempt(() => {
        const found = find(desktopId, task)
        const history = scheduler.history(found.id).slice(0, runs ?? 10)
        const action = found.actions[0]
        const lines = [
          describeTask(found),
          found.description ? `Description: ${found.description}` : null,
          action ? `Action: ${action.session === 'existing' ? `send to chat ${action.sessionId}` : `new chat in ${action.cwd}`}, agent ${action.agentId ?? 'default'}. Prompt: ${action.prompt}` : null,
          `Conditions: ${JSON.stringify(found.conditions)}`,
          `Settings: ${JSON.stringify(found.settings)}`,
          history.length ? `Runs (newest first):\n${history.map((r) => `  #${r.id} ${r.startedAt} ${r.result} (${r.startedBy}): ${r.message}`).join('\n')}` : 'No runs yet.'
        ]
        return textResult(lines.filter((l) => l !== null).join('\n'))
      }),

    scheduler_create: (args, context) =>
      attempt(() => {
        const base = newTaskInput(paths.resolve(context) as VPath)
        return textResult(`Created ${describeTask(scheduler.create(context.desktopId, merge(context, base, args)))}`)
      }),

    scheduler_update: ({ task, ...fields }, context) =>
      attempt(() => {
        const found = find(context.desktopId, task)
        return textResult(`Saved ${describeTask(scheduler.update(found.id, merge(context, inputOf(found), fields)))}`)
      }),

    scheduler_delete: ({ task }, { desktopId }) =>
      attempt(() => {
        const found = find(desktopId, task)
        scheduler.remove(found.id)
        return textResult(`Deleted the task [${found.id}] ${found.name}.`)
      }),

    scheduler_enable: ({ task, enabled }, { desktopId }) => attempt(() => textResult(describeTask(scheduler.setEnabled(find(desktopId, task).id, enabled)))),

    scheduler_run: ({ task }, { desktopId }) =>
      attempt(async () => {
        const found = find(desktopId, task)
        await scheduler.run(found.id)
        return textResult(`Started the task [${found.id}] ${found.name}. Call scheduler_get to follow the run.`)
      }),

    scheduler_end: ({ task }, { desktopId }) =>
      attempt(async () => {
        const found = find(desktopId, task)
        await scheduler.end(found.id)
        return textResult(`Ended the task [${found.id}] ${found.name}.`)
      }),

    scheduler_clear_history: ({ task }, { desktopId }) =>
      attempt(() => {
        const found = find(desktopId, task)
        scheduler.clearHistory(found.id)
        return textResult(`Cleared the history of [${found.id}] ${found.name}.`)
      })
  }
}

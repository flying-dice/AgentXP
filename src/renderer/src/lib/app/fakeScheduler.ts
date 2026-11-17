/**
 * In-memory Task Scheduler for Storybook and tests (the `scheduler` group of the fake backend). The tasks are kept in memory,
 * the next run time comes from the real `nextRunOfTriggers`, and Run goes through the same states as the engine in main:
 * Running, then Completed after `runMs`, or Stopped when End comes first.
 */
import type { Id } from '@shared/models'
import { fixedZone, nextRunOfTriggers, type Zone } from '@shared/schedule'
import {
  HISTORY_KEPT,
  type ScheduledTaskDto,
  type ScheduledTaskInput,
  type SchedulerApi,
  type SchedulerEvents,
  type TaskRunDto,
  type TaskRunResult,
  type TaskRunStart
} from '@shared/scheduler'

type Emit = <K extends keyof SchedulerEvents>(event: K, payload: SchedulerEvents[K]) => void

/** The instant the sample tasks are written for: Tuesday 17 November 2026, 9:30 in the morning (UTC). */
export const SAMPLE_NOW = Date.UTC(2026, 10, 17, 9, 30)

export interface FakeSchedulerOptions {
  emit: Emit
  /** The desktop that owns the sample tasks. Default 1. */
  desktopId?: Id
  /** The clock. Default: a fixed instant, so stories look the same every time. */
  now?: () => number
  zone?: Zone
  /** How long a run takes before it completes (ms). Default 1500; 0 completes on the next tick. */
  runMs?: number
  /** Start with the sample tasks. Default true. */
  seed?: boolean
}

const agentAction = (prompt: string, over: Partial<ScheduledTaskInput['actions'][number]> = {}): ScheduledTaskInput['actions'][number] => ({
  kind: 'agent',
  agentId: null,
  cwd: 'E:\\',
  session: 'new',
  sessionId: null,
  prompt,
  ...over
})

const base = (name: string, description: string, over: Partial<ScheduledTaskInput>): ScheduledTaskInput => ({
  name,
  description,
  enabled: true,
  triggers: [],
  actions: [agentAction('Say hello.')],
  conditions: { onlyIfNoOtherTaskRuns: false, onlyIfAgentIdle: false, onlyIfNotPaused: true },
  settings: { allowOnDemand: true, runMissed: false, stopIfRunsLonger: true, stopAfterMinutes: 60, restartOnFailure: false, restartIntervalMinutes: 5, restartAttempts: 3, ifRunning: 'ignore' },
  ...over
})

export const sampleTaskInputs: ScheduledTaskInput[] = [
  base('Morning review', 'Summarise the changes of yesterday before the work starts.', {
    triggers: [{ kind: 'daily', enabled: true, startAt: '2026-11-01T09:00', expiresAt: null, everyDays: 1 }],
    actions: [agentAction('Review the changes of yesterday and write a short summary.')]
  }),
  base('Dependency check', 'Look for outdated packages twice a week.', {
    triggers: [{ kind: 'weekly', enabled: true, startAt: '2026-11-02T08:30', expiresAt: null, everyWeeks: 1, daysOfWeek: [1, 5] }],
    actions: [agentAction('Run the dependency check and list the packages that are out of date.')],
    settings: { allowOnDemand: true, runMissed: true, stopIfRunsLonger: true, stopAfterMinutes: 30, restartOnFailure: true, restartIntervalMinutes: 10, restartAttempts: 2, ifRunning: 'queue' }
  }),
  base('Start of day', 'Read the open tasks when AgentXP starts.', {
    triggers: [{ kind: 'startup', enabled: true, delayMinutes: 2 }],
    actions: [agentAction('List the open tasks of this project.')]
  }),
  base('Month-end report', 'Write the report of the month.', {
    enabled: false,
    triggers: [{ kind: 'monthly', enabled: true, startAt: '2026-11-01T17:00', expiresAt: null, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], daysOfMonth: [], lastDay: true }],
    actions: [agentAction('Write the report of this month.')]
  })
]

const iso = (ms: number): string => new Date(ms).toISOString()

export function createFakeScheduler(options: FakeSchedulerOptions): SchedulerApi & { reset(): void } {
  const desktopId = options.desktopId ?? 1
  const now = options.now ?? ((): number => SAMPLE_NOW)
  const zone = options.zone ?? fixedZone(0)
  const runMs = options.runMs ?? 1500
  let nextId = 1
  let nextRunId = 1
  let tasks: { id: Id; desktopId: Id; createdAt: string; input: ScheduledTaskInput }[] = []
  let runs: TaskRunDto[] = []
  const running = new Map<Id, { runId: Id; timer: ReturnType<typeof setTimeout> | null }>()

  const run = (taskId: Id, result: TaskRunResult, message: string, startedBy: TaskRunStart, minutesAgo: number): void => {
    const at = now() - minutesAgo * 60_000
    runs.push({ id: nextRunId++, taskId, startedAt: iso(at), endedAt: result === 'running' ? null : iso(at + 90_000), result, message, startedBy, sessionId: null, attempt: 1 })
  }

  const seed = (): void => {
    tasks = []
    runs = []
    nextId = 1
    nextRunId = 1
    sampleTaskInputs.forEach((input, i) => {
      const id = nextId++
      tasks.push({ id, desktopId, createdAt: iso(SAMPLE_NOW - 14 * 86_400_000), input: structuredClone(input) })
      if (i === 0) {
        run(id, 'success', 'The task "Morning review" completed.', 'schedule', 1530)
        run(id, 'success', 'The task "Morning review" completed.', 'schedule', 2970)
      }
      if (i === 1) {
        run(id, 'failed', 'The task "Dependency check" failed: The agent stopped before it was ready.', 'schedule', 3900)
        run(id, 'success', 'The task "Dependency check" completed.', 'manual', 9000)
      }
      if (i === 2) run(id, 'success', 'The task "Start of day" completed.', 'startup', 1000)
    })
  }
  if (options.seed !== false) seed()

  const dto = (t: (typeof tasks)[number]): ScheduledTaskDto => {
    const history = runs.filter((r) => r.taskId === t.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    const next = t.input.enabled ? nextRunOfTriggers(t.input.triggers, now(), zone) : null
    return {
      ...structuredClone(t.input),
      id: t.id,
      desktopId: t.desktopId,
      createdAt: t.createdAt,
      status: running.has(t.id) ? 'running' : t.input.enabled ? 'ready' : 'disabled',
      queued: 0,
      nextRunAt: next === null ? null : iso(next),
      lastRun: history[0] ?? null
    }
  }
  const list = (id: Id): ScheduledTaskDto[] => tasks.filter((t) => t.desktopId === id).map(dto)
  const changed = (id: Id): void => options.emit('scheduler.changed', { desktopId: id, tasks: list(id) })
  const find = (id: Id): (typeof tasks)[number] => {
    const task = tasks.find((t) => t.id === id)
    if (!task) throw new Error('The task does not exist.')
    return task
  }

  const finish = (taskId: Id, result: TaskRunResult, message: string): void => {
    const active = running.get(taskId)
    if (!active) return
    if (active.timer) clearTimeout(active.timer)
    running.delete(taskId)
    runs = runs.map((r) => (r.id === active.runId ? { ...r, endedAt: iso(now()), result, message } : r))
    changed(find(taskId).desktopId)
  }

  return {
    list: async (id) => list(id),
    create: async (id, input) => {
      const task = { id: nextId++, desktopId: id, createdAt: iso(now()), input: structuredClone(input) }
      tasks.push(task)
      changed(id)
      return dto(task)
    },
    update: async (id, input) => {
      const task = find(id)
      task.input = structuredClone(input)
      changed(task.desktopId)
      return dto(task)
    },
    remove: async (id) => {
      const task = find(id)
      finish(id, 'stopped', 'The task was deleted.')
      tasks = tasks.filter((t) => t.id !== id)
      runs = runs.filter((r) => r.taskId !== id)
      changed(task.desktopId)
    },
    setEnabled: async (id, enabled) => {
      const task = find(id)
      task.input = { ...task.input, enabled }
      changed(task.desktopId)
      return dto(task)
    },
    run: async (id) => {
      const task = find(id)
      if (!task.input.settings.allowOnDemand) throw new Error('This task does not allow Run.')
      if (running.has(id)) return
      const runId = nextRunId++
      runs.push({ id: runId, taskId: id, startedAt: iso(now()), endedAt: null, result: 'running', message: `The task "${task.input.name}" is running.`, startedBy: 'manual', sessionId: null, attempt: 1 })
      running.set(id, { runId, timer: setTimeout(() => finish(id, 'success', `The task "${task.input.name}" completed.`), runMs) })
      changed(task.desktopId)
    },
    end: async (id) => finish(id, 'stopped', `The task "${find(id).input.name}" was ended by you.`),
    history: async (id) => runs.filter((r) => r.taskId === id).sort((a, b) => b.startedAt.localeCompare(a.startedAt) || b.id - a.id).slice(0, HISTORY_KEPT),
    clearHistory: async (id) => {
      runs = runs.filter((r) => r.taskId !== id || r.result === 'running')
      changed(find(id).desktopId)
    },
    reset: seed
  }
}

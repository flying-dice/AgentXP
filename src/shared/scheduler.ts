/**
 * Task Scheduler: the contract shared by main and renderer. A scheduled task belongs to a desktop. It has triggers (when),
 * actions (what: send a prompt to an agent), conditions and settings, and it keeps a history of its runs.
 * The scheduler in main runs the tasks while AgentXP runs, whether or not the window of the desktop is open.
 * See docs/DESKTOP_DESIGN.md, section 13.
 *
 * Pure types, constants and pure functions only.
 */
import type { Id, IsoDate } from './models'
import { triggerProblem, type LocalDateTime, type TriggerDto } from './schedule'
import { normaliseVPath, type VPath } from './vfs'

/** Which skills and MCP tools a run has. `inherit`: everything that is switched on (a plain chat). */
export type CapabilitiesMode = 'inherit' | 'profile' | 'team' | 'custom'

export const CAPABILITIES_LABEL: Record<CapabilitiesMode, string> = {
  inherit: 'Everything that is switched on',
  profile: 'Use a profile',
  team: 'Use a team',
  custom: 'Choose skills and tools'
}

/** A skill or an MCP server that a task names: its id, and its name as it was when the task was saved (the id is null once it was removed). */
export interface CapabilityRef {
  id: Id | null
  name: string
}

/** One tool of an MCP server that the run does not get. */
export interface HiddenToolDto {
  serverId: Id
  tool: string
}

/**
 * The skills and tools of the chat that an action starts. `profile`: the skills, servers, instructions, agent and model of the
 * profile. `team`: the first member of the team, with the instructions and skills of the team. `custom`: exactly the chosen
 * skills and servers, minus the hidden tools. Only a new chat can have them; an existing chat keeps what it has.
 */
export interface ActionCapabilitiesDto {
  mode: CapabilitiesMode
  /** Mode `profile`; null once the profile was removed. */
  profileId: Id | null
  /** Mode `team`; null once the team was removed. */
  teamId: Id | null
  /** Mode `custom`. */
  skills: CapabilityRef[]
  servers: CapabilityRef[]
  hiddenTools: HiddenToolDto[]
}

export const INHERIT_CAPABILITIES: ActionCapabilitiesDto = { mode: 'inherit', profileId: null, teamId: null, skills: [], servers: [], hiddenTools: [] }

/** "Run an agent": send `prompt` to an agent that works in `cwd`, in a new chat or in an existing one. */
export interface AgentActionDto {
  kind: 'agent'
  /** The agent to run; null = the default agent when the task runs (or the agent of the profile). */
  agentId: Id | null
  /** The working directory of a new chat (a VPath on C: or on a plugged-in drive: the project). */
  cwd: VPath
  /** `new`: every run starts a new chat. `existing`: every run sends the prompt to the chat `sessionId`. */
  session: 'new' | 'existing'
  sessionId: Id | null
  prompt: string
  capabilities: ActionCapabilitiesDto
}
export type TaskActionDto = AgentActionDto

/** What to do when a task is due while an earlier run of it is still going. */
export type IfRunning = 'ignore' | 'queue' | 'stop-existing'

export const IF_RUNNING_LABEL: Record<IfRunning, string> = {
  ignore: 'Do not start a new instance',
  queue: 'Queue a new instance',
  'stop-existing': 'Stop the existing instance'
}

/** The task starts only when these hold; when one does not, the run is skipped and the history says why. Run on demand ignores them. */
export interface TaskConditionsDto {
  /** No other task of this desktop is running. */
  onlyIfNoOtherTaskRuns: boolean
  /** No chat of this desktop has a turn that runs or waits for an answer. */
  onlyIfAgentIdle: boolean
  /** The desktop is not paused (Pause on the top bar). */
  onlyIfNotPaused: boolean
}

export interface TaskSettingsDto {
  /** The task can be started with Run. */
  allowOnDemand: boolean
  /** Run the task as soon as possible after a scheduled start was missed (AgentXP was closed). */
  runMissed: boolean
  stopIfRunsLonger: boolean
  stopAfterMinutes: number
  restartOnFailure: boolean
  restartIntervalMinutes: number
  restartAttempts: number
  ifRunning: IfRunning
}

export const DEFAULT_CONDITIONS: TaskConditionsDto = { onlyIfNoOtherTaskRuns: false, onlyIfAgentIdle: false, onlyIfNotPaused: true }

export const DEFAULT_SETTINGS: TaskSettingsDto = {
  allowOnDemand: true,
  runMissed: false,
  stopIfRunsLonger: true,
  stopAfterMinutes: 60,
  restartOnFailure: false,
  restartIntervalMinutes: 5,
  restartAttempts: 3,
  ifRunning: 'ignore'
}

/** What the user edits and what is saved (the task without its id, desktop, status and run data). */
export interface ScheduledTaskInput {
  name: string
  description: string
  enabled: boolean
  triggers: TriggerDto[]
  actions: TaskActionDto[]
  conditions: TaskConditionsDto
  settings: TaskSettingsDto
}

export type TaskStatus = 'ready' | 'running' | 'disabled'

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = { ready: 'Ready', running: 'Running', disabled: 'Disabled' }

/** How a run ended. `running` while it goes on. `skipped`: not started (a condition did not hold or an instance ran). `missed`: AgentXP was closed at the scheduled time. */
export type TaskRunResult = 'running' | 'success' | 'failed' | 'stopped' | 'skipped' | 'missed'

export const TASK_RESULT_LABEL: Record<TaskRunResult, string> = {
  running: 'Running',
  success: 'Completed',
  failed: 'Failed',
  stopped: 'Stopped',
  skipped: 'Not started',
  missed: 'Missed'
}

/** What started a run. */
export type TaskRunStart = 'schedule' | 'startup' | 'manual' | 'missed' | 'retry'

export const TASK_START_LABEL: Record<TaskRunStart, string> = {
  schedule: 'Schedule',
  startup: 'AgentXP startup',
  manual: 'Run command',
  missed: 'Missed schedule',
  retry: 'Restart after failure'
}

export interface TaskRunDto {
  id: Id
  taskId: Id
  startedAt: IsoDate
  /** Null while the run goes on. */
  endedAt: IsoDate | null
  result: TaskRunResult
  /** One plain sentence: what happened or why it did not start. */
  message: string
  startedBy: TaskRunStart
  /** The chat of the last action, when one was used (Open chat). */
  sessionId: Id | null
  /** 1 for the first try, 2 for the first restart. */
  attempt: number
}

export interface ScheduledTaskDto extends ScheduledTaskInput {
  id: Id
  desktopId: Id
  createdAt: IsoDate
  status: TaskStatus
  /** Instances waiting for the running one to end (setting "Queue a new instance"). */
  queued: number
  /** The next time a trigger fires; null when the task is disabled or has no trigger with a future time. */
  nextRunAt: IsoDate | null
  lastRun: TaskRunDto | null
}

export interface SchedulerApi {
  list(desktopId: Id): Promise<ScheduledTaskDto[]>
  create(desktopId: Id, input: ScheduledTaskInput): Promise<ScheduledTaskDto>
  update(id: Id, input: ScheduledTaskInput): Promise<ScheduledTaskDto>
  remove(id: Id): Promise<void>
  setEnabled(id: Id, enabled: boolean): Promise<ScheduledTaskDto>
  /** Starts the task now ("Run"). Resolves when the run has started, not when it ends. Rejects when the task does not allow it. */
  run(id: Id): Promise<void>
  /** Stops the running instance and drops the queued ones ("End"). */
  end(id: Id): Promise<void>
  /** The runs of a task, newest first. */
  history(id: Id): Promise<TaskRunDto[]>
  clearHistory(id: Id): Promise<void>
}

export interface SchedulerEvents {
  /** The tasks of a desktop changed: a task was saved, started, ended, enabled or removed. */
  'scheduler.changed': { desktopId: Id; tasks: ScheduledTaskDto[] }
}

// ---------------------------------------------------------------- new tasks and checks

export const NAME_MAX = 120
export const DESCRIPTION_MAX = 2000
export const PROMPT_MAX = 20_000
/** The run records kept for each task. */
export const HISTORY_KEPT = 100

/** A new agent action with the usual choices. */
export function newAgentAction(cwd: VPath): AgentActionDto {
  return { kind: 'agent', agentId: null, cwd, session: 'new', sessionId: null, prompt: '', capabilities: { ...INHERIT_CAPABILITIES } }
}

/** A task to start the Create Task dialog with. `from` is a wall-clock time (the next full hour is a good one). */
export function newTaskInput(cwd: VPath, triggers: TriggerDto[] = []): ScheduledTaskInput {
  return { name: '', description: '', enabled: true, triggers, actions: [newAgentAction(cwd)], conditions: { ...DEFAULT_CONDITIONS }, settings: { ...DEFAULT_SETTINGS } }
}

/** Why the skills and tools of an action cannot be saved, or null. */
export function capabilitiesProblem(action: Pick<AgentActionDto, 'session' | 'capabilities'>): string | null {
  const c = action.capabilities
  if (c.mode === 'inherit') return null
  if (action.session === 'existing') return 'An existing chat keeps its own skills and tools. Start a new chat for every run to choose them.'
  if (c.mode === 'profile' && c.profileId === null) return 'Choose the profile for the run.'
  if (c.mode === 'team' && c.teamId === null) return 'Choose the team for the run.'
  if (c.mode === 'custom' && (c.skills.some((x) => x.id === null) || c.servers.some((x) => x.id === null))) return 'A chosen skill or MCP server no longer exists. Remove it from the list.'
  return null
}

/** The skills and tools of an action in a few words, for the Actions list and the summary ("Profile: Reviewer", "2 skills, 1 server"). */
export function capabilitiesSummary(c: ActionCapabilitiesDto, names: { profile?: string | null; team?: string | null } = {}): string {
  const count = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`
  switch (c.mode) {
    case 'inherit':
      return 'All skills and tools that are switched on'
    case 'profile':
      return `Profile: ${c.profileId === null ? 'removed' : (names.profile ?? 'unknown')}`
    case 'team':
      return `Team: ${c.teamId === null ? 'removed' : (names.team ?? 'unknown')}`
    case 'custom': {
      const parts = [count(c.skills.length, 'skill', 'skills'), count(c.servers.length, 'MCP server', 'MCP servers')]
      if (c.hiddenTools.length > 0) parts.push(`${count(c.hiddenTools.length, 'tool', 'tools')} off`)
      return parts.join(', ')
    }
  }
}

/** Why an action cannot be saved, or null. */
export function actionProblem(action: TaskActionDto): string | null {
  if (!normaliseVPath(action.cwd)) return 'Choose the project the agent works in.'
  if (action.session === 'existing' && action.sessionId === null) return 'Choose the chat that gets the prompt.'
  if (action.prompt.trim() === '') return 'Type the prompt for the agent.'
  if (action.prompt.length > PROMPT_MAX) return `The prompt can have at most ${PROMPT_MAX} characters.`
  return capabilitiesProblem(action)
}

const inRange = (n: number, min: number, max: number): boolean => Number.isInteger(n) && n >= min && n <= max

/** Why the conditions and settings cannot be saved, or null. */
export function settingsProblem(settings: TaskSettingsDto): string | null {
  if (settings.stopIfRunsLonger && !inRange(settings.stopAfterMinutes, 1, 10_080)) return 'Stop the task after 1 to 10080 minutes.'
  if (settings.restartOnFailure) {
    if (!inRange(settings.restartIntervalMinutes, 1, 1440)) return 'Restart every 1 to 1440 minutes.'
    if (!inRange(settings.restartAttempts, 1, 99)) return 'Restart 1 to 99 times.'
  }
  return null
}

/** Why a task cannot be saved, in plain words, or null when it is fine. The same check runs in main. */
export function taskProblem(input: ScheduledTaskInput): string | null {
  const name = input.name.trim()
  if (name === '') return 'Type a name for the task.'
  if (name.length > NAME_MAX) return `The name can have at most ${NAME_MAX} characters.`
  if (input.description.length > DESCRIPTION_MAX) return `The description can have at most ${DESCRIPTION_MAX} characters.`
  if (input.actions.length === 0) return 'Add at least one action.'
  for (const action of input.actions) {
    const problem = actionProblem(action)
    if (problem) return problem
  }
  for (const trigger of input.triggers) {
    const problem = triggerProblem(trigger)
    if (problem) return problem
  }
  return settingsProblem(input.settings)
}

/** The first instant of the next full hour as a wall-clock time: the start of a new trigger. */
export function nextFullHour(now: LocalDateTime): LocalDateTime {
  const hour = Number(now.slice(11, 13))
  const date = new Date(Date.UTC(Number(now.slice(0, 4)), Number(now.slice(5, 7)) - 1, Number(now.slice(8, 10)), hour + 1))
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(date.getUTCDate())}T${p(date.getUTCHours())}:00`
}

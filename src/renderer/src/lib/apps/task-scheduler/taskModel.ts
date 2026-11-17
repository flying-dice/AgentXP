/** Pure logic of the Task Scheduler window: list rows, texts, the choices of the forms and the steps of the Create Basic Task wizard. */
import type { SchedulerTab } from '@shared/desktop'
import type { AgentDto, Id, SessionDto } from '@shared/models'
import {
  describeTrigger,
  localOf,
  localZone,
  newTrigger,
  triggerProblem,
  TRIGGER_KIND_LABEL,
  type LocalDateTime,
  type TriggerDto,
  type TriggerKind,
  type Zone
} from '@shared/schedule'
import {
  actionProblem,
  capabilitiesSummary,
  CAPABILITIES_LABEL,
  DEFAULT_CONDITIONS,
  DEFAULT_SETTINGS,
  IF_RUNNING_LABEL,
  nextFullHour,
  newAgentAction,
  NAME_MAX,
  TASK_RESULT_LABEL,
  TASK_START_LABEL,
  TASK_STATUS_LABEL,
  type ActionCapabilitiesDto,
  type AgentActionDto,
  type CapabilitiesMode,
  type CapabilityRef,
  type ScheduledTaskDto,
  type ScheduledTaskInput,
  type TaskActionDto,
  type TaskConditionsDto,
  type TaskRunDto,
  type TaskSettingsDto,
  type TaskStatus
} from '@shared/scheduler'
import type { McpServerDto, ProfileDto, SkillDto, TeamDto } from '@shared/teams'
import { AGENT_HOME, type DriveDto, type VPath } from '@shared/vfs'
import type { IconName } from '../../kit/atoms/icons'
import type { ListBoxItem } from '../../kit/atoms/ListBox'
import type { ListColumn, ListRow } from '../../kit/organisms/ListView'
import { driveRoot, driveTitle } from '../explorer/explorerModel'
import { formatDateTime } from '../shared/dates'

export const SCHEDULER_TABS: { id: SchedulerTab; title: string }[] = [
  { id: 'general', title: 'General' },
  { id: 'triggers', title: 'Triggers' },
  { id: 'actions', title: 'Actions' },
  { id: 'conditions', title: 'Conditions' },
  { id: 'settings', title: 'Settings' },
  { id: 'history', title: 'History' }
]

/**
 * The columns fit the list at the default window width: Triggers and Last Run Result take what is left (flexible columns), the
 * others have a fixed width. The list scrolls sideways only when the window is narrower than the sum of the narrowest widths.
 */
export const LIBRARY_COLUMNS: ListColumn[] = [
  { key: 'name', header: 'Name', width: 150 },
  { key: 'status', header: 'Status', width: 64 },
  { key: 'triggers', header: 'Triggers', minWidth: 150 },
  { key: 'next', header: 'Next Run Time', width: 128 },
  { key: 'last', header: 'Last Run Time', width: 128 },
  { key: 'result', header: 'Last Run Result', minWidth: 100 }
]

export const HISTORY_COLUMNS: ListColumn[] = [
  { key: 'result', header: 'Result', width: 90 },
  { key: 'start', header: 'Start', width: 130 },
  { key: 'end', header: 'End', width: 130 },
  { key: 'by', header: 'Started by', width: 120 },
  { key: 'message', header: 'Message', minWidth: 200 }
]

// ---------------------------------------------------------------- the library

/** The Triggers column: the triggers in words, "Manual" when there is none. */
export function triggersSummary(task: Pick<ScheduledTaskDto, 'triggers'>): string {
  if (task.triggers.length === 0) return 'Manual. Use Run.'
  return task.triggers.map((t) => (t.enabled ? describeTrigger(t) : `${describeTrigger(t)} (off)`)).join('; ')
}

export const formatWhen = (iso: string | null): string => (iso === null ? '' : formatDateTime(iso))

export const lastRunText = (task: Pick<ScheduledTaskDto, 'lastRun'>): string => (task.lastRun ? formatDateTime(task.lastRun.startedAt) : 'Never')

/** The Last Run Result column and the result of a history row: "Completed", "Failed". */
export const lastResultText = (task: Pick<ScheduledTaskDto, 'lastRun'>): string => (task.lastRun ? TASK_RESULT_LABEL[task.lastRun.result] : '')

export const STATUS_ICON: Record<TaskStatus, IconName> = { ready: 'scheduler', running: 'play', disabled: 'pause' }

/** The status as a word; a task with queued instances says how many wait. */
export const statusText = (task: Pick<ScheduledTaskDto, 'status' | 'queued'>): string =>
  task.queued > 0 ? `${TASK_STATUS_LABEL[task.status]} (${task.queued} queued)` : TASK_STATUS_LABEL[task.status]

export function taskRows(tasks: readonly ScheduledTaskDto[]): ListRow[] {
  return tasks.map((t) => ({
    id: String(t.id),
    testid: 'task-scheduler-row',
    attrs: { 'data-task-id': String(t.id), 'data-status': t.status, 'data-name': t.name },
    icon: STATUS_ICON[t.status],
    name: t.name,
    status: statusText(t),
    triggers: triggersSummary(t),
    next: formatWhen(t.nextRunAt),
    last: lastRunText(t),
    result: lastResultText(t)
  }))
}

export interface Overview {
  total: number
  ready: number
  running: number
  disabled: number
  /** Tasks whose last run failed. */
  failed: number
  /** The task that starts next, with its time; null when nothing is due. */
  next: { name: string; at: string } | null
}

export function overview(tasks: readonly ScheduledTaskDto[]): Overview {
  const count = (status: TaskStatus): number => tasks.filter((t) => t.status === status).length
  const due = tasks.filter((t) => t.nextRunAt !== null).sort((a, b) => String(a.nextRunAt).localeCompare(String(b.nextRunAt)))[0]
  return {
    total: tasks.length,
    ready: count('ready'),
    running: count('running'),
    disabled: count('disabled'),
    failed: tasks.filter((t) => t.lastRun?.result === 'failed').length,
    next: due ? { name: due.name, at: formatDateTime(due.nextRunAt as string) } : null
  }
}

/** "3 tasks", "1 task": the status bar and the heading of the library. */
export const countText = (n: number): string => `${n} ${n === 1 ? 'task' : 'tasks'}`

/** What each command of the Actions pane can do for the selected task (all false without one). */
export interface TaskCommands {
  run: boolean
  end: boolean
  toggle: boolean
  edit: boolean
  remove: boolean
  /** The label of the toggle: Disable for an enabled task, Enable for a disabled one. */
  toggleLabel: 'Disable' | 'Enable'
}

export function commandsFor(task: Pick<ScheduledTaskDto, 'status' | 'settings'> | null): TaskCommands {
  if (!task) return { run: false, end: false, toggle: false, edit: false, remove: false, toggleLabel: 'Disable' }
  return {
    run: task.settings.allowOnDemand && task.status !== 'disabled',
    end: task.status === 'running',
    toggle: true,
    edit: true,
    remove: true,
    toggleLabel: task.status === 'disabled' ? 'Enable' : 'Disable'
  }
}

// ---------------------------------------------------------------- history

export function historyRows(runs: readonly TaskRunDto[]): ListRow[] {
  return runs.map((r) => ({
    id: String(r.id),
    testid: 'task-scheduler-history-row',
    attrs: { 'data-result': r.result, 'data-run-id': String(r.id) },
    result: TASK_RESULT_LABEL[r.result],
    start: formatDateTime(r.startedAt),
    end: r.endedAt ? formatDateTime(r.endedAt) : '',
    by: r.attempt > 1 ? `${TASK_START_LABEL[r.startedBy]} (attempt ${r.attempt})` : TASK_START_LABEL[r.startedBy],
    message: r.message
  }))
}

// ---------------------------------------------------------------- the choices of the forms

export interface Choice<T extends string = string> {
  value: T
  label: string
}

/** The value of the "default agent" entry of the agent list. */
export const DEFAULT_AGENT = 'default'

export function agentChoices(agents: readonly AgentDto[]): Choice[] {
  const standard = agents.find((a) => a.isDefault)
  return [{ value: DEFAULT_AGENT, label: standard ? `Default agent (${standard.name})` : 'Default agent' }, ...agents.map((a) => ({ value: String(a.id), label: a.name }))]
}

export const agentValue = (agentId: Id | null): string => (agentId === null ? DEFAULT_AGENT : String(agentId))
export const agentFromValue = (value: string): Id | null => (value === DEFAULT_AGENT ? null : Number(value))

export function agentNameOf(agentId: Id | null, agents: readonly AgentDto[]): string {
  if (agentId === null) return agentChoices(agents)[0].label
  return agents.find((a) => a.id === agentId)?.name ?? 'An agent that was removed (the default agent runs instead)'
}

/** The project drives: C: is the agent's home folder, a plugged-in project is the root of its drive. */
export function projectChoices(drives: readonly DriveDto[], current?: VPath): Choice[] {
  const sorted = [...drives].sort((a, b) => (a.kind === 'system' ? -1 : b.kind === 'system' ? 1 : a.letter.localeCompare(b.letter)))
  const choices = sorted.map((d) => ({ value: d.kind === 'system' ? AGENT_HOME : driveRoot(d.letter), label: driveTitle(d) }))
  if (current && !choices.some((c) => c.value.toLowerCase() === current.toLowerCase())) choices.push({ value: current, label: `${current} (not plugged in now)` })
  return choices
}

export function projectNameOf(cwd: VPath, drives: readonly DriveDto[]): string {
  return projectChoices(drives, cwd).find((c) => c.value.toLowerCase() === cwd.toLowerCase())?.label ?? cwd
}

/** The chats a task can send its prompt to. */
export function chatChoices(sessions: readonly Pick<SessionDto, 'id' | 'title' | 'role'>[]): Choice[] {
  return sessions.filter((s) => s.role === 'chat').map((s) => ({ value: String(s.id), label: s.title || 'New chat' }))
}

const clip = (text: string, max = 60): string => {
  const one = text.replace(/\s+/g, ' ').trim()
  return one.length > max ? `${one.slice(0, max - 1)}…` : one
}

export interface ActionContext {
  agents: readonly AgentDto[]
  drives: readonly DriveDto[]
  sessions: readonly Pick<SessionDto, 'id' | 'title' | 'role'>[]
  /** Names of the profiles and teams that an action may use (the summary shows the name). */
  profiles?: readonly Pick<ProfileDto, 'id' | 'name'>[]
  teams?: readonly Pick<TeamDto, 'id' | 'name'>[]
}

/** The skills, MCP servers, profiles and teams that an action can choose from (Control Center and Teams hold them). */
export interface CapabilityChoices {
  skills: readonly SkillDto[]
  servers: readonly McpServerDto[]
  profiles: readonly ProfileDto[]
  teams: readonly TeamDto[]
}

export const NO_CHOICES: CapabilityChoices = { skills: [], servers: [], profiles: [], teams: [] }

/** The skills and tools of an action in a few words: "Profile: Reviewer", "2 skills, 1 MCP server". */
export function actionCapabilities(action: TaskActionDto, ctx: Pick<ActionContext, 'profiles' | 'teams'>): string {
  const c = action.capabilities
  return capabilitiesSummary(c, { profile: ctx.profiles?.find((p) => p.id === c.profileId)?.name ?? null, team: ctx.teams?.find((t) => t.id === c.teamId)?.name ?? null })
}

/** The Actions tab and the summary: "Run Claude Code in Project (E:), new chat: Review the changes…". */
export function actionSummary(action: TaskActionDto, ctx: ActionContext): string {
  const where = action.session === 'new' ? 'a new chat' : `the chat "${ctx.sessions.find((s) => s.id === action.sessionId)?.title || 'that was removed'}"`
  return `Ask ${agentNameOf(action.agentId, ctx.agents)} in ${projectNameOf(action.cwd, ctx.drives)}, in ${where}: ${clip(action.prompt)}`
}

/** What the Actions list says in its "Skills and tools" column: an existing chat keeps its own. */
export const actionToolsText = (action: TaskActionDto, ctx: Pick<ActionContext, 'profiles' | 'teams'>): string =>
  action.session === 'existing' ? 'Kept by the chat' : actionCapabilities(action, ctx)

// ---------------------------------------------------------------- skills and tools of an action

export const CAPABILITY_MODES: { value: CapabilitiesMode; label: string }[] = (['inherit', 'profile', 'team', 'custom'] as const).map((value) => ({ value, label: CAPABILITIES_LABEL[value] }))

/** The mode changes: a profile or team is preselected when there is one, so the choice is never empty by accident. */
export function withCapabilitiesMode(c: ActionCapabilitiesDto, mode: CapabilitiesMode, choices: CapabilityChoices): ActionCapabilitiesDto {
  return {
    ...c,
    mode,
    profileId: mode === 'profile' ? (c.profileId ?? choices.profiles[0]?.id ?? null) : c.profileId,
    teamId: mode === 'team' ? (c.teamId ?? choices.teams[0]?.id ?? null) : c.teamId
  }
}

/** A list of skills or servers to check: every one of the registry, and the ones that the task names but that are gone ("(removed)", checked, so the user can clear them). */
export function refChoices(refs: readonly CapabilityRef[], all: readonly { id: Id; name: string; description?: string; enabled: boolean }[], goneText: string, testid?: string): { items: ListBoxItem<string>[]; checked: string[] } {
  const items: ListBoxItem<string>[] = all.map((x) => ({ value: String(x.id), label: x.enabled ? x.name : `${x.name} (switched off)`, title: x.description || undefined, testid: testid ? `${testid}-${x.id}` : undefined }))
  const checked = refs.flatMap((r) => (r.id !== null && all.some((x) => x.id === r.id) ? [String(r.id)] : []))
  refs.forEach((r, i) => {
    if (r.id !== null && all.some((x) => x.id === r.id)) return
    items.push({ value: `gone-${i}`, label: `${r.name} (${goneText})`, testid: testid ? `${testid}-gone-${i}` : undefined })
    checked.push(`gone-${i}`)
  })
  return { items, checked }
}

/** The names of the registry after the user checked or cleared items. */
export function refsFromChecked(checked: readonly string[], previous: readonly CapabilityRef[], all: readonly { id: Id; name: string }[]): CapabilityRef[] {
  const refs: CapabilityRef[] = []
  for (const value of checked) {
    if (value.startsWith('gone-')) {
      const old = previous[Number(value.slice(5))]
      if (old) refs.push(old)
      continue
    }
    const found = all.find((x) => String(x.id) === value)
    if (found) refs.push({ id: found.id, name: found.name })
  }
  return refs
}

const toolValue = (serverId: Id, tool: string): string => `${serverId}|${tool}`

/** The tools of the chosen servers that the last test found and that are switched on, each to check (checked = the run gets it). */
export function toolChoices(c: ActionCapabilitiesDto, servers: readonly McpServerDto[], testid?: string): { items: ListBoxItem<string>[]; checked: string[] } {
  const items: ListBoxItem<string>[] = []
  for (const ref of c.servers) {
    const server = servers.find((s) => s.id === ref.id)
    for (const tool of server?.tools ?? []) if (tool.enabled) items.push({ value: toolValue(server!.id, tool.name), label: `${server!.name}: ${tool.name}`, title: tool.description || undefined, testid: testid ? `${testid}-${server!.id}-${tool.name}` : undefined })
  }
  const hidden = new Set(c.hiddenTools.map((h) => toolValue(h.serverId, h.tool)))
  return { items, checked: items.filter((i) => !hidden.has(i.value)).map((i) => i.value) }
}

/** The hidden tools after the user checked or cleared tools: the ones that are listed and cleared, and the ones that were hidden before but are not listed (kept). */
export function hiddenFromChecked(c: ActionCapabilitiesDto, servers: readonly McpServerDto[], checked: readonly string[]): ActionCapabilitiesDto['hiddenTools'] {
  const { items } = toolChoices(c, servers)
  const listed = new Set(items.map((i) => i.value))
  const kept = c.hiddenTools.filter((h) => !listed.has(toolValue(h.serverId, h.tool)))
  const cleared = items.filter((i) => !checked.includes(i.value)).map((i) => {
    const at = i.value.indexOf('|')
    return { serverId: Number(i.value.slice(0, at)), tool: i.value.slice(at + 1) }
  })
  return [...kept, ...cleared]
}

// ---------------------------------------------------------------- texts of the detail tabs

/** The Conditions tab: one sentence per condition that is on. */
export function conditionLines(c: TaskConditionsDto): string[] {
  return [
    c.onlyIfNoOtherTaskRuns ? 'Start the task only if no other task of this desktop runs.' : '',
    c.onlyIfAgentIdle ? 'Start the task only if no chat of this desktop is working or waiting for an answer.' : '',
    c.onlyIfNotPaused ? 'Start the task only if the desktop is not paused.' : ''
  ].filter(Boolean)
}

export const NO_CONDITIONS = 'The task starts whenever a trigger fires.'

/** The Settings tab: label and value pairs. */
export function settingLines(s: TaskSettingsDto): [string, string][] {
  return [
    ['Run on demand', s.allowOnDemand ? 'Allowed' : 'Not allowed'],
    ['Missed start', s.runMissed ? 'Run the task as soon as possible after a scheduled start was missed' : 'Do not run the task after a missed start'],
    ['Long run', s.stopIfRunsLonger ? `Stop the task if it runs longer than ${s.stopAfterMinutes} ${s.stopAfterMinutes === 1 ? 'minute' : 'minutes'}` : 'Never stop the task because of its run time'],
    ['Failure', s.restartOnFailure ? `Restart every ${s.restartIntervalMinutes} ${s.restartIntervalMinutes === 1 ? 'minute' : 'minutes'}, at most ${s.restartAttempts} ${s.restartAttempts === 1 ? 'time' : 'times'}` : 'Do not restart the task'],
    ['If it already runs', IF_RUNNING_LABEL[s.ifRunning]]
  ]
}

// ---------------------------------------------------------------- new tasks

const NOW_ZONE: Zone = localZone

/** The wall-clock start that a new trigger gets: the next full hour. */
export const defaultStart = (now: number = Date.now(), zone: Zone = NOW_ZONE): LocalDateTime => nextFullHour(localOf(zone, now))

/** What Create Task starts with: no trigger yet (run on demand), the default agent in the first project. */
export function blankTask(cwd: VPath): ScheduledTaskInput {
  return { name: '', description: '', enabled: true, triggers: [], actions: [newAgentAction(cwd)], conditions: { ...DEFAULT_CONDITIONS }, settings: { ...DEFAULT_SETTINGS } }
}

/** The project a new action starts in: the first plugged-in project, else C:. */
export function defaultProject(drives: readonly DriveDto[]): VPath {
  const project = drives.find((d) => d.kind !== 'system')
  return project ? driveRoot(project.letter) : AGENT_HOME
}

/** The input of an existing task (what Properties edits). */
export function inputOf(task: ScheduledTaskDto): ScheduledTaskInput {
  return structuredClone({ name: task.name, description: task.description, enabled: task.enabled, triggers: task.triggers, actions: task.actions, conditions: task.conditions, settings: task.settings })
}

/** The line of a list of triggers or actions in the Create Task dialog. */
export const triggerRow = (t: TriggerDto, index: number): ListRow => ({
  id: String(index),
  testid: 'task-editor-trigger-row',
  icon: 'scheduler',
  kind: TRIGGER_KIND_LABEL[t.kind],
  details: describeTrigger(t),
  status: t.enabled ? 'Enabled' : 'Disabled'
})

export const actionRow = (a: TaskActionDto, index: number, ctx: ActionContext): ListRow => ({
  id: String(index),
  testid: 'task-editor-action-row',
  icon: 'session',
  action: 'Run an agent',
  details: actionSummary(a, ctx),
  tools: actionToolsText(a, ctx)
})

// ---------------------------------------------------------------- Create Basic Task wizard

export type WizardStep = 'name' | 'trigger' | 'details' | 'action' | 'finish'

export const WIZARD_STEPS: WizardStep[] = ['name', 'trigger', 'details', 'action', 'finish']

export const WIZARD_TITLE: Record<WizardStep, string> = {
  name: 'Create a Basic Task',
  trigger: 'Task Trigger',
  details: 'Trigger Details',
  action: 'Action',
  finish: 'Summary'
}

export const WIZARD_DESCRIPTION: Record<WizardStep, string> = {
  name: 'Use this wizard to quickly schedule a common task. For more options, such as several triggers or conditions, use Create Task in the Actions pane.',
  trigger: 'When do you want the task to start?',
  details: 'Choose the time and, for a task that repeats, how often it repeats.',
  action: 'What do you want the task to do? The agent receives your prompt in a chat.',
  finish: 'Check the task. Click Finish to save it.'
}

/** The kinds the wizard offers, in the order of its list. */
export const WIZARD_TRIGGERS: TriggerKind[] = ['daily', 'weekly', 'monthly', 'once', 'startup']

export interface WizardDraft {
  name: string
  description: string
  trigger: TriggerDto
  action: AgentActionDto
  /** "Open the Properties of this task when I click Finish". */
  openProperties: boolean
}

export function newWizardDraft(cwd: VPath, now: number = Date.now(), zone: Zone = NOW_ZONE): WizardDraft {
  return { name: '', description: '', trigger: newTrigger('daily', defaultStart(now, zone)), action: newAgentAction(cwd), openProperties: false }
}

/** The kind of the trigger changes: the start stays, the rest takes the defaults of the new kind. */
export function withTriggerKind(draft: WizardDraft, kind: TriggerKind, now: number = Date.now(), zone: Zone = NOW_ZONE): WizardDraft {
  if (draft.trigger.kind === kind) return draft
  const start = draft.trigger.kind === 'startup' ? defaultStart(now, zone) : draft.trigger.startAt
  return { ...draft, trigger: newTrigger(kind, start) }
}

/** Why the wizard cannot go on from a step, in plain words, or null. */
export function wizardProblem(step: WizardStep, draft: WizardDraft): string | null {
  switch (step) {
    case 'name': {
      const name = draft.name.trim()
      if (name === '') return 'Type a name for the task.'
      return name.length > NAME_MAX ? `The name can have at most ${NAME_MAX} characters.` : null
    }
    case 'trigger':
      return null
    case 'details':
      return triggerProblem(draft.trigger)
    case 'action':
      return actionProblem(draft.action)
    case 'finish':
      return null
  }
}

/** The first step with a problem, or null: Finish checks all of them. */
export function firstWizardProblem(draft: WizardDraft): { step: WizardStep; text: string } | null {
  for (const step of WIZARD_STEPS) {
    const text = wizardProblem(step, draft)
    if (text) return { step, text }
  }
  return null
}

/** The task the wizard saves. */
export function wizardInput(draft: WizardDraft): ScheduledTaskInput {
  return { name: draft.name.trim(), description: draft.description.trim(), enabled: true, triggers: [structuredClone(draft.trigger)], actions: [structuredClone(draft.action)], conditions: { ...DEFAULT_CONDITIONS }, settings: { ...DEFAULT_SETTINGS } }
}

/** The Summary page: label and value pairs. */
export function wizardSummary(draft: WizardDraft, ctx: ActionContext): [string, string][] {
  return [
    ['Name', draft.name.trim()],
    ['Description', draft.description.trim() || '(none)'],
    ['Trigger', describeTrigger(draft.trigger)],
    ['Action', actionSummary(draft.action, ctx)],
    ['Skills and tools', actionToolsText(draft.action, ctx)]
  ]
}

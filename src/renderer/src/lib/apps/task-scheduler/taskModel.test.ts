import { describe, expect, it } from 'vitest'
import type { AgentDto, SessionDto } from '@shared/models'
import { fixedZone, newTrigger, type TriggerDto } from '@shared/schedule'
import { INHERIT_CAPABILITIES, type ScheduledTaskDto, type TaskRunDto } from '@shared/scheduler'
import { AGENT_HOME, type DriveDto } from '@shared/vfs'
import { createFakeScheduler, SAMPLE_NOW } from '../../app/fakeScheduler'
import { sampleMcpServers, sampleProfiles, sampleSkills, sampleTeams } from '../../app/fakeTeams'
import {
  actionRow,
  actionSummary,
  actionToolsText,
  hiddenFromChecked,
  refChoices,
  refsFromChecked,
  toolChoices,
  withCapabilitiesMode,
  agentChoices,
  agentFromValue,
  agentNameOf,
  agentValue,
  blankTask,
  chatChoices,
  commandsFor,
  conditionLines,
  countText,
  defaultProject,
  defaultStart,
  firstWizardProblem,
  historyRows,
  inputOf,
  newWizardDraft,
  overview,
  projectChoices,
  projectNameOf,
  settingLines,
  statusText,
  taskRows,
  triggerRow,
  triggersSummary,
  withTriggerKind,
  wizardInput,
  wizardProblem,
  wizardSummary,
  WIZARD_STEPS
} from './taskModel'

const agents: AgentDto[] = [
  { id: 1, name: 'Claude Code', command: 'npx', args: [], env: {}, isDefault: true, defaultModeId: null, defaultModelId: null },
  { id: 2, name: 'Gemini CLI', command: 'gemini', args: [], env: {}, isDefault: false, defaultModeId: null, defaultModelId: null }
]
const drives: DriveDto[] = [
  { letter: 'E', kind: 'removable', label: 'claude-code-win', folderId: 1, path: 'C:\\src\\claude-code-win', pluggedAt: '2026-11-17T08:00:00Z' } as unknown as DriveDto,
  { letter: 'C', kind: 'system', label: 'Local Disk', folderId: null, path: '', pluggedAt: '' } as unknown as DriveDto
]
const sessions = [{ id: 7, title: 'Fix login redirect bug', role: 'chat' }, { id: 8, title: 'Review', role: 'review' }] as Pick<SessionDto, 'id' | 'title' | 'role'>[]
const ctx = { agents, drives, sessions }

async function samples(): Promise<ScheduledTaskDto[]> {
  const api = createFakeScheduler({ emit: () => {}, now: () => SAMPLE_NOW, zone: fixedZone(0) })
  return api.list(1)
}

describe('the library list', () => {
  it('has one row per task with the columns of the list', async () => {
    const tasks = await samples()
    const rows = taskRows(tasks)
    expect(rows).toHaveLength(4)
    expect(rows[0]).toMatchObject({ id: String(tasks[0].id), name: 'Morning review', status: 'Ready', triggers: 'At 9:00 AM every day', result: 'Completed' })
    expect(rows[0].next).toMatch(/^11\/18\/2026 \d\d:00:00$|^11\/\d+\/2026 /)
    expect(rows[3]).toMatchObject({ name: 'Month-end report', status: 'Disabled', next: '' })
  })
  it('says Manual for a task without trigger and marks a trigger that is off', () => {
    expect(triggersSummary({ triggers: [] })).toBe('Manual. Use Run.')
    const off: TriggerDto = { kind: 'startup', enabled: false, delayMinutes: 0 }
    expect(triggersSummary({ triggers: [off] })).toBe('At AgentXP startup (off)')
    expect(triggersSummary({ triggers: [off, { kind: 'startup', enabled: true, delayMinutes: 3 }] })).toContain('; ')
  })
  it('shows Never for a task that did not run and names the queued instances', () => {
    expect(taskRows([{ ...({} as ScheduledTaskDto), id: 1, name: 'n', status: 'ready', queued: 0, triggers: [], nextRunAt: null, lastRun: null }])[0]).toMatchObject({ last: 'Never', result: '' })
    expect(statusText({ status: 'running', queued: 2 })).toBe('Running (2 queued)')
    expect(statusText({ status: 'ready', queued: 0 })).toBe('Ready')
  })
  it('counts the tasks and finds the one that starts next', async () => {
    const tasks = await samples()
    const o = overview(tasks)
    expect(o).toMatchObject({ total: 4, ready: 3, running: 0, disabled: 1, failed: 1 })
    expect(o.next?.name).toBe('Morning review')
    expect(overview([]).next).toBeNull()
    expect(countText(1)).toBe('1 task')
    expect(countText(0)).toBe('0 tasks')
  })
  it('lets Run, End and Disable follow the status of the task', async () => {
    const [ready, , , disabled] = await samples()
    expect(commandsFor(null)).toMatchObject({ run: false, end: false, edit: false, remove: false, toggle: false })
    expect(commandsFor(ready)).toMatchObject({ run: true, end: false, toggleLabel: 'Disable' })
    expect(commandsFor({ ...ready, status: 'running' })).toMatchObject({ run: true, end: true })
    expect(commandsFor(disabled)).toMatchObject({ run: false, toggleLabel: 'Enable' })
    expect(commandsFor({ ...ready, settings: { ...ready.settings, allowOnDemand: false } }).run).toBe(false)
  })
})

describe('the history rows', () => {
  it('shows the result, the times, what started the run and the message', () => {
    const run: TaskRunDto = { id: 3, taskId: 1, startedAt: '2026-11-17T09:00:00.000Z', endedAt: null, result: 'running', message: 'm', startedBy: 'manual', sessionId: null, attempt: 2 }
    const [row] = historyRows([run])
    expect(row).toMatchObject({ id: '3', result: 'Running', end: '', by: 'Run command (attempt 2)', message: 'm' })
    expect(historyRows([{ ...run, attempt: 1, endedAt: '2026-11-17T09:01:00.000Z', result: 'failed' }])[0]).toMatchObject({ result: 'Failed', by: 'Run command' })
  })
})

describe('choices of the forms', () => {
  it('lists the default agent first and names the standard agent', () => {
    expect(agentChoices(agents)).toEqual([
      { value: 'default', label: 'Default agent (Claude Code)' },
      { value: '1', label: 'Claude Code' },
      { value: '2', label: 'Gemini CLI' }
    ])
    expect(agentChoices([])[0].label).toBe('Default agent')
  })
  it('converts between an agent id and the value of the list', () => {
    expect(agentValue(null)).toBe('default')
    expect(agentValue(2)).toBe('2')
    expect(agentFromValue('default')).toBeNull()
    expect(agentFromValue('2')).toBe(2)
  })
  it('names an agent that was removed', () => {
    expect(agentNameOf(2, agents)).toBe('Gemini CLI')
    expect(agentNameOf(9, agents)).toContain('removed')
    expect(agentNameOf(null, agents)).toBe('Default agent (Claude Code)')
  })
  it('lists C: first as the agent home and each project as the root of its drive', () => {
    const choices = projectChoices(drives)
    expect(choices.map((c) => c.label)).toEqual(['Local Disk (C:)', 'claude-code-win (E:)'])
    expect(choices[0].value).toBe(AGENT_HOME)
    expect(choices[1].value).toBe('E:\\')
  })
  it('keeps a project that is not plugged in as a choice so it is not lost', () => {
    const choices = projectChoices(drives, 'F:\\')
    expect(choices.at(-1)).toEqual({ value: 'F:\\', label: 'F:\\ (not plugged in now)' })
    expect(projectChoices(drives, 'e:\\')).toHaveLength(2)
    expect(projectNameOf('E:\\', drives)).toBe('claude-code-win (E:)')
  })
  it('offers only chats, not review sessions, and names an untitled chat', () => {
    expect(chatChoices(sessions)).toEqual([{ value: '7', label: 'Fix login redirect bug' }])
    expect(chatChoices([{ id: 1, title: '', role: 'chat' }] as never)[0].label).toBe('New chat')
  })
  it('starts in the first project, else on C:', () => {
    expect(defaultProject(drives)).toBe('E:\\')
    expect(defaultProject([drives[1]])).toBe(AGENT_HOME)
  })
})

describe('texts', () => {
  const action = { kind: 'agent' as const, agentId: 2, cwd: 'E:\\' as const, session: 'new' as const, sessionId: null, prompt: '  Review   the\nchanges ', capabilities: INHERIT_CAPABILITIES }
  it('sums an action up in one line', () => {
    expect(actionSummary(action, ctx)).toBe('Ask Gemini CLI in claude-code-win (E:), in a new chat: Review the changes')
    expect(actionSummary({ ...action, session: 'existing', sessionId: 7, agentId: null }, ctx)).toContain('the chat "Fix login redirect bug"')
    expect(actionSummary({ ...action, session: 'existing', sessionId: 99 }, ctx)).toContain('that was removed')
  })
  it('cuts a long prompt', () => {
    expect(actionSummary({ ...action, prompt: 'x'.repeat(200) }, ctx).endsWith('…')).toBe(true)
  })
  it('lists the conditions that are on', () => {
    expect(conditionLines({ onlyIfNoOtherTaskRuns: false, onlyIfAgentIdle: false, onlyIfNotPaused: false })).toEqual([])
    expect(conditionLines({ onlyIfNoOtherTaskRuns: true, onlyIfAgentIdle: true, onlyIfNotPaused: true })).toHaveLength(3)
  })
  it('says each setting in a sentence', async () => {
    const [, dependency] = await samples()
    const lines = Object.fromEntries(settingLines(dependency.settings))
    expect(lines['Run on demand']).toBe('Allowed')
    expect(lines['Missed start']).toContain('as soon as possible')
    expect(lines['Long run']).toBe('Stop the task if it runs longer than 30 minutes')
    expect(lines['Failure']).toBe('Restart every 10 minutes, at most 2 times')
    expect(lines['If it already runs']).toBe('Queue a new instance')
    expect(Object.fromEntries(settingLines({ ...dependency.settings, restartOnFailure: false, stopIfRunsLonger: false, runMissed: false }))['Failure']).toBe('Do not restart the task')
  })
  it('shows a trigger and an action as a row of the Create Task lists', () => {
    expect(triggerRow({ kind: 'daily', enabled: false, startAt: '2026-11-17T09:00', expiresAt: null, everyDays: 2 }, 3)).toMatchObject({ id: '3', kind: 'Daily', details: 'At 9:00 AM every 2 days', status: 'Disabled' })
    expect(actionRow(action, 0, ctx)).toMatchObject({ id: '0', action: 'Run an agent' })
  })
})

describe('new tasks', () => {
  it('starts a new trigger at the next full hour of the local clock', () => {
    const now = new Date(2026, 10, 17, 9, 30).getTime()
    expect(defaultStart(now)).toBe('2026-11-17T10:00')
    expect(defaultStart(new Date(2026, 11, 31, 23, 59).getTime())).toBe('2027-01-01T00:00')
  })
  it('starts Create Task with no trigger, the default agent and the default conditions', () => {
    const task = blankTask('E:\\')
    expect(task).toMatchObject({ name: '', enabled: true, triggers: [], actions: [{ kind: 'agent', agentId: null, cwd: 'E:\\', session: 'new' }] })
    expect(task.settings.allowOnDemand).toBe(true)
  })
  it('copies a task for Properties without sharing its data', async () => {
    const [task] = await samples()
    const input = inputOf(task)
    expect('id' in input).toBe(false)
    input.actions[0].prompt = 'changed'
    expect(task.actions[0].prompt).not.toBe('changed')
  })
})

describe('the Create Basic Task wizard', () => {
  const now = new Date(2026, 10, 17, 9, 30).getTime()
  const draft = () => ({ ...newWizardDraft('E:\\', now), name: 'Nightly', action: { ...newWizardDraft('E:\\', now).action, prompt: 'Run the tests.' } })

  it('starts with a daily trigger at the next full hour', () => {
    expect(newWizardDraft('E:\\', now).trigger).toMatchObject({ kind: 'daily', startAt: '2026-11-17T10:00', everyDays: 1 })
  })
  it('checks each step', () => {
    const d = newWizardDraft('E:\\', now)
    expect(wizardProblem('name', d)).toBe('Type a name for the task.')
    expect(wizardProblem('name', { ...d, name: 'x'.repeat(121) })).toContain('at most 120')
    expect(wizardProblem('name', { ...d, name: ' A ' })).toBeNull()
    expect(wizardProblem('trigger', d)).toBeNull()
    expect(wizardProblem('details', d)).toBeNull()
    expect(wizardProblem('details', { ...d, trigger: { ...newTrigger('once', 'x') } })).toContain('start date')
    expect(wizardProblem('action', d)).toBe('Type the prompt for the agent.')
    expect(wizardProblem('finish', d)).toBeNull()
  })
  it('names the first step that is wrong, for Finish', () => {
    expect(firstWizardProblem(newWizardDraft('E:\\', now))).toEqual({ step: 'name', text: 'Type a name for the task.' })
    expect(firstWizardProblem({ ...newWizardDraft('E:\\', now), name: 'n' })?.step).toBe('action')
    expect(firstWizardProblem(draft())).toBeNull()
    expect(WIZARD_STEPS).toEqual(['name', 'trigger', 'details', 'action', 'finish'])
  })
  it('keeps the start when the kind changes and starts again when it comes from At startup', () => {
    const daily = draft()
    const weekly = withTriggerKind({ ...daily, trigger: newTrigger('daily', '2026-11-20T08:15') }, 'weekly', now)
    expect(weekly.trigger).toMatchObject({ kind: 'weekly', startAt: '2026-11-20T08:15', daysOfWeek: [5] })
    expect(withTriggerKind(weekly, 'weekly', now)).toBe(weekly)
    const startup = withTriggerKind(daily, 'startup', now)
    expect(startup.trigger.kind).toBe('startup')
    expect(withTriggerKind(startup, 'once', now).trigger).toMatchObject({ kind: 'once', startAt: '2026-11-17T10:00' })
  })
  it('makes a task of the draft', () => {
    const d = draft()
    const input = wizardInput({ ...d, name: ' Nightly ', description: ' d ' })
    expect(input).toMatchObject({ name: 'Nightly', description: 'd', enabled: true })
    expect(input.triggers).toHaveLength(1)
    expect(input.actions[0]).toMatchObject({ prompt: 'Run the tests.' })
    expect(input.settings.allowOnDemand).toBe(true)
  })
  it('summarises the task', () => {
    const rows = Object.fromEntries(wizardSummary(draft(), ctx))
    expect(rows['Name']).toBe('Nightly')
    expect(rows['Description']).toBe('(none)')
    expect(rows['Trigger']).toBe('At 10:00 AM every day')
    expect(rows['Action']).toContain('Run the tests.')
  })
})

describe('skills and tools of an action', () => {
  const choices = { skills: sampleSkills, servers: sampleMcpServers, profiles: sampleProfiles, teams: sampleTeams }
  const custom = { ...INHERIT_CAPABILITIES, mode: 'custom' as const }
  const action = { kind: 'agent' as const, agentId: null, cwd: 'E:\\' as const, session: 'new' as const, sessionId: null, prompt: 'Go', capabilities: INHERIT_CAPABILITIES }
  const ctxNames = { profiles: sampleProfiles, teams: sampleTeams }

  it('says what a run gets in the Actions list and the wizard summary', () => {
    expect(actionToolsText(action, ctxNames)).toBe('All skills and tools that are switched on')
    expect(actionToolsText({ ...action, capabilities: { ...INHERIT_CAPABILITIES, mode: 'profile', profileId: sampleProfiles[0].id } }, ctxNames)).toBe(`Profile: ${sampleProfiles[0].name}`)
    expect(actionToolsText({ ...action, capabilities: { ...INHERIT_CAPABILITIES, mode: 'team', teamId: sampleTeams[0].id } }, ctxNames)).toBe(`Team: ${sampleTeams[0].name}`)
    expect(actionToolsText({ ...action, capabilities: { ...custom, skills: [{ id: 1, name: 'a' }] } }, ctxNames)).toBe('1 skill, 0 MCP servers')
    expect(actionToolsText({ ...action, session: 'existing', sessionId: 7 }, ctxNames)).toBe('Kept by the chat')
    expect(actionRow(action, 0, { agents, drives, sessions, ...ctxNames })).toMatchObject({ tools: 'All skills and tools that are switched on' })
    const draft = newWizardDraft('E:\\')
    expect(wizardSummary(draft, { agents, drives, sessions }).at(-1)).toEqual(['Skills and tools', 'All skills and tools that are switched on'])
  })

  it('preselects a profile or team when the mode changes', () => {
    expect(withCapabilitiesMode(INHERIT_CAPABILITIES, 'profile', choices)).toMatchObject({ mode: 'profile', profileId: sampleProfiles[0].id })
    expect(withCapabilitiesMode({ ...INHERIT_CAPABILITIES, profileId: 5 }, 'profile', choices).profileId).toBe(5)
    expect(withCapabilitiesMode(INHERIT_CAPABILITIES, 'team', choices)).toMatchObject({ mode: 'team', teamId: sampleTeams[0].id })
    expect(withCapabilitiesMode(INHERIT_CAPABILITIES, 'profile', { ...choices, profiles: [] }).profileId).toBeNull()
  })

  it('lists the registry with the chosen ones checked, and a removed one that the task names', () => {
    const { items, checked } = refChoices([{ id: sampleSkills[0].id, name: sampleSkills[0].name }, { id: 99, name: 'old' }, { id: null, name: 'gone' }], sampleSkills, 'no longer installed')
    expect(items.map((i) => i.label)).toEqual([...sampleSkills.map((s) => (s.enabled ? s.name : `${s.name} (switched off)`)), 'old (no longer installed)', 'gone (no longer installed)'])
    expect(checked).toEqual([String(sampleSkills[0].id), 'gone-1', 'gone-2'])
  })

  it('turns the checked values back into references, and clearing a removed one drops it', () => {
    const previous = [{ id: null, name: 'gone' }]
    expect(refsFromChecked([String(sampleSkills[1].id), 'gone-0'], previous, sampleSkills)).toEqual([{ id: sampleSkills[1].id, name: sampleSkills[1].name }, { id: null, name: 'gone' }])
    expect(refsFromChecked([String(sampleSkills[1].id)], previous, sampleSkills)).toEqual([{ id: sampleSkills[1].id, name: sampleSkills[1].name }])
  })

  it('lists the tools of the chosen servers and keeps hidden ones cleared', () => {
    const server = sampleMcpServers.find((s) => s.tools.length > 0)!
    const c = { ...custom, servers: [{ id: server.id, name: server.name }], hiddenTools: [{ serverId: server.id, tool: server.tools[0].name }] }
    const { items, checked } = toolChoices(c, sampleMcpServers)
    expect(items.length).toBe(server.tools.filter((t) => t.enabled).length)
    expect(checked).not.toContain(items[0].value)
    // Everything checked again: nothing is hidden. One cleared: that one is hidden.
    expect(hiddenFromChecked(c, sampleMcpServers, items.map((i) => i.value))).toEqual([])
    expect(hiddenFromChecked({ ...c, hiddenTools: [] }, sampleMcpServers, items.slice(1).map((i) => i.value))).toEqual([{ serverId: server.id, tool: server.tools[0].name }])
    // A server that is not chosen lists no tools.
    expect(toolChoices(custom, sampleMcpServers).items).toEqual([])
  })
})

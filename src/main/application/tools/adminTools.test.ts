import { describe, expect, it } from 'vitest'
import { DEFAULT_TOOL_POLICY, type ToolPolicyDto } from '@shared/desktop'
import type { ConfigArea } from '@shared/ipc'
import type { AgentProcessDto } from '@shared/desktop'
import type { SessionDto, TerminalDto } from '@shared/models'
import type { RoomStateDto } from '@shared/teams'
import { SqliteAgentRepository } from '../../infrastructure/db/sqlite-agent-repository'
import { SqliteKanbanRepository } from '../../infrastructure/db/sqlite-kanban-repository'
import { SqliteMcpServerRepository } from '../../infrastructure/db/sqlite-mcp-server-repository'
import { SqliteSkillRepository } from '../../infrastructure/db/sqlite-skill-repository'
import { SqliteProfileRepository, SqliteTeamRepository } from '../../infrastructure/db/sqlite-team-repositories'
import { bundledManuals } from '../../infrastructure/help/bundledManuals'
import { AgentService } from '../AgentService'
import { HelpService } from '../HelpService'
import { KanbanService } from '../kanban/KanbanService'
import { SchedulerService } from '../scheduler/SchedulerService'
import { setupScheduler } from '../scheduler/test-helpers'
import { McpServerService } from '../teams/McpServerService'
import { SkillService } from '../teams/SkillService'
import { TeamService } from '../teams/TeamService'
import type { ToolGateRequest } from '../../domain/agent/ToolGate'
import { DesktopToolService } from './DesktopToolService'
import { createHelpTools } from './helpTools'
import { createRoomTools } from './roomTools'
import { createSchedulerTools } from './schedulerTools'
import { createSettingsTools } from './settingsTools'
import { createTaskmgrTools } from './taskmgrTools'
import { createTeamsTools } from './teamsTools'
import type { ToolResult } from './types'
import { TOOL_DEFS, type ToolHandlers } from './catalog'

const text = (r: ToolResult): string => r.content.map((c) => (c.type === 'text' ? c.text : '')).join('')

/** Real services on an in-memory database, the way compose.ts wires them. */
function setup() {
  const s = setupScheduler()
  const db = s.db
  const skillFiles = new Map<string, string>()
  const changed: ConfigArea[] = []
  const agents = new AgentService(new SqliteAgentRepository(db))
  const skills = new SkillService(
    new SqliteSkillRepository(db),
    { readSkillFile: async (f) => skillFiles.get(f) ?? null, copy: async () => {}, remove: async () => {} },
    '/data/skills'
  )
  const mcp = new McpServerService(new SqliteMcpServerRepository(db), { listTools: async () => [{ name: 'search', description: 'Search' }] })
  const teams = new TeamService(new SqliteProfileRepository(db), new SqliteTeamRepository(db))
  const kanban = new KanbanService({ kanban: new SqliteKanbanRepository(db), events: { publish: () => {} } })
  const scheduler = new SchedulerService({
    tasks: s.tasks,
    runs: s.runs,
    engine: s.engine,
    desktops: { get: (id) => (id === s.desktop.id ? ({ id } as never) : null) },
    agents: new SqliteAgentRepository(db),
    sessions: s.sessions,
    registry: { skills: new SqliteSkillRepository(db), servers: new SqliteMcpServerRepository(db), profiles: new SqliteProfileRepository(db), teams: new SqliteTeamRepository(db) },
    events: { publish: () => {} },
    log: s.log,
    clock: s.time
  })
  let policy: ToolPolicyDto = structuredClone(DEFAULT_TOOL_POLICY)
  const paths = { resolve: (_c: unknown, input?: string) => (input ?? 'C:\\Users\\Agent') as never }
  const context = { sessionId: s.sessionId, desktopId: s.desktop.id }
  const other = { sessionId: s.sessionId, desktopId: s.other.id }
  return {
    ...s,
    skillFiles,
    changed,
    agents,
    skills,
    mcp,
    teams,
    kanban,
    scheduler,
    context,
    other,
    policy: () => policy,
    schedulerTools: createSchedulerTools({ scheduler, agents, paths }),
    teamsTools: createTeamsTools({ teams, agents, skills, mcp, kanban, changed: (a) => void changed.push(a) }),
    settingsTools: createSettingsTools({
      policy: { policy: () => policy, setPolicy: (p) => void (policy = p) },
      agents,
      skills,
      mcp,
      paths,
      vfs: { realPath: async (_d, v) => `/host/${v}` },
      changed: (a) => void changed.push(a)
    })
  }
}

describe('scheduler tools', () => {
  it('create, list, show, change, disable, run and delete a task of the caller\'s desktop', async () => {
    const t = setup()
    const { scheduler_create, scheduler_list, scheduler_get, scheduler_update, scheduler_enable, scheduler_run, scheduler_end, scheduler_clear_history, scheduler_delete } = t.schedulerTools
    expect(text(await scheduler_list({}, t.context))).toBe('No scheduled tasks.')
    const created = text(
      await scheduler_create({ name: 'Nightly', prompt: 'Review the changes.', cwd: 'E:\\', triggers: [{ kind: 'daily', startAt: '2026-11-17T09:00' }], stopAfterMinutes: 30 }, t.context)
    )
    expect(created).toMatch(/Created \[\d+\] Nightly \(ready\): .*Next run: 2026-11-17T09:00/)
    expect(text(await scheduler_get({ task: 'nightly' }, t.context))).toMatch(/new chat in E:\\.*Prompt: Review the changes\.[\s\S]*"stopAfterMinutes":30[\s\S]*No runs yet\./)
    expect(text(await scheduler_update({ task: 'Nightly', triggers: [{ kind: 'weekly', startAt: '2026-11-18T07:30', daysOfWeek: [1, 3] }] }, t.context))).toMatch(/Saved .*Next run: 2026-11-18T07:30/)
    expect(text(await scheduler_enable({ task: 'Nightly', enabled: false }, t.context))).toMatch(/\(disabled\)/)
    expect((await scheduler_list({}, t.other)).content).toEqual([{ type: 'text', text: 'No scheduled tasks.' }])
    expect((await scheduler_run({ task: 'Nightly' }, t.other)).isError).toBe(true) // another desktop's task does not exist for it
    await scheduler_enable({ task: 'Nightly', enabled: true }, t.context)
    expect(text(await scheduler_run({ task: 'Nightly' }, t.context))).toMatch(/Started/)
    expect(t.runner.calls).toHaveLength(1)
    expect(text(await scheduler_end({ task: 'Nightly' }, t.context))).toMatch(/Ended/)
    expect(text(await scheduler_clear_history({ task: 'Nightly' }, t.context))).toMatch(/Cleared/)
    expect(text(await scheduler_delete({ task: 'Nightly' }, t.context))).toMatch(/Deleted the task/)
    expect(t.scheduler.list(t.desktop.id)).toEqual([])
  })

  it('reports a task that is not valid with the service\'s sentence', async () => {
    const t = setup()
    const result = await t.schedulerTools.scheduler_create({ name: 'x', prompt: 'p', triggers: [], agent: 'Nope' }, t.context)
    expect(result.isError).toBe(true)
    expect(text(result)).toMatch(/no agent "Nope"/)
  })
})

describe('profile and team tools', () => {
  it('create profiles and a team by names, show them, change and delete them, and tell the windows', async () => {
    const t = setup()
    const { profile_create, profile_list, profile_update, profile_delete, team_create, team_list, team_update, team_delete } = t.teamsTools
    const board = t.kanban.createBoard(t.desktop.id, 'Sprint')
    t.skillFiles.set('/host/E:\\pdf', '---\nname: PDF\ndescription: PDFs\n---\n')
    await t.skills.install('/host/E:\\pdf')
    expect(text(await profile_list({}, t.context))).toBe('No profiles.')
    expect(text(await profile_create({ name: 'Dev', instructions: 'Write code.\nMore', skills: ['pdf'] }, t.context))).toMatch(/Created \[\d+\] Dev: agent default, model agent default, skills PDF, MCP servers none\. Write code\./)
    await profile_create({ name: 'Reviewer' }, t.context)
    expect(text(await team_create({ name: 'Squad', members: ['Reviewer', 'dev'], board: 'Sprint' }, t.context))).toMatch(new RegExp(`members Reviewer, Dev; skills none; board ${board.id}`))
    expect(text(await profile_update({ profile: 'Dev', model: 'opus' }, t.context))).toMatch(/model opus/)
    expect(text(await team_update({ team: 'Squad', members: ['Dev'] }, t.context))).toMatch(/members Dev;/)
    expect(text(await team_list({}, t.context))).toMatch(/Squad/)
    expect((await profile_update({ profile: 'Nobody' }, t.context)).isError).toBe(true)
    expect((await team_create({ name: 'Bad', members: ['ghost'] }, t.context)).isError).toBe(true)
    expect(text(await team_delete({ team: 'Squad' }, t.context))).toMatch(/Deleted the team/)
    expect(text(await profile_delete({ profile: 'Reviewer' }, t.context))).toMatch(/Deleted the profile/)
    expect(t.changed).toEqual(['profiles', 'profiles', 'teams', 'profiles', 'teams', 'teams', 'profiles'])
  })
})

describe('Control Center tools', () => {
  it('read the permissions and change one', async () => {
    const t = setup()
    expect(text(await t.settingsTools.settings_get({}, t.context))).toMatch(/terminal: Run commands = ask[\s\S]*openApps: Agent may open apps = allow[\s\S]*Agents:/)
    expect(text(await t.settingsTools.settings_set_permission({ permission: 'terminal', decision: 'allow' }, t.context))).toBe('Set terminal to allow.')
    expect(t.policy().groups.terminal).toBe('allow')
    await t.settingsTools.settings_set_permission({ permission: 'openApps', decision: 'deny' }, t.context)
    expect(t.policy().openApps).toBe('deny')
    expect((await t.settingsTools.settings_set_permission({ permission: 'shell', decision: 'deny' }, t.context)).isError).toBe(true)
  })

  it('add, change, make default and remove agents', async () => {
    const t = setup()
    const { agent_add, agent_list, agent_update, agent_set_default, agent_remove } = t.settingsTools
    expect(text(await agent_add({ name: 'Mine', command: 'node', args: ['a.js'], makeDefault: true }, t.context))).toMatch(/Added \[\d+\] Mine \(default\): node a\.js/)
    expect(text(await agent_update({ agent: 'Mine', startMode: 'plan' }, t.context))).toMatch(/starts in mode plan/)
    expect(text(await agent_list({}, t.context))).toMatch(/Mine \(default\)/)
    const first = t.agents.list().find((a) => a.name !== 'Mine')!
    expect(text(await agent_set_default({ agent: first.id }, t.context))).toMatch(/is the default agent now/)
    expect(text(await agent_remove({ agent: 'Mine' }, t.context))).toMatch(/Removed the agent/)
    expect(t.changed.every((a) => a === 'agents')).toBe(true)
  })

  it('install, switch and remove skills from a virtual folder', async () => {
    const t = setup()
    const { skill_install, skill_list, skill_enable, skill_remove } = t.settingsTools
    t.skillFiles.set('/host/E:\\skills\\pdf', '---\nname: PDF\ndescription: Work with PDFs\n---\n')
    expect(text(await skill_install({ path: 'E:\\skills\\pdf' }, t.context))).toMatch(/Installed \[\d+\] PDF \(on\): Work with PDFs/)
    expect(text(await skill_enable({ skill: 'pdf', enabled: false }, t.context))).toMatch(/off/)
    expect(text(await skill_list({}, t.context))).toMatch(/PDF \(off\)/)
    expect((await skill_install({ path: 'E:\\nothing' }, t.context)).isError).toBe(true)
    expect(text(await skill_remove({ skill: 'PDF' }, t.context))).toMatch(/Removed the skill/)
    expect(t.changed).toEqual(['skills', 'skills', 'skills'])
  })

  it('add, test, switch tools of and remove MCP servers, never showing secret values', async () => {
    const t = setup()
    const { mcp_add, mcp_list, mcp_update, mcp_test, mcp_tool_enable, mcp_enable, mcp_remove } = t.settingsTools
    await mcp_add({ name: 'github', transport: 'stdio', command: 'npx', args: ['gh-mcp'], vars: [{ key: 'TOKEN', value: 's3cret', secret: true }] }, t.context)
    expect(text(await mcp_list({}, t.context))).toMatch(/github \(on, stdio\): npx gh-mcp; env TOKEN=\*{8}; tools: not tested/)
    expect(text(await mcp_list({}, t.context))).not.toContain('s3cret')
    await mcp_update({ server: 'github', vars: [{ key: 'TOKEN' }, { key: 'ORG', value: 'acme' }] }, t.context)
    expect([...t.mcp.list()[0]!.vars].sort((a, b) => a.key.localeCompare(b.key))).toEqual([{ key: 'ORG', value: 'acme', secret: false }, { key: 'TOKEN', value: 's3cret', secret: true }])
    expect((await mcp_update({ server: 'github', vars: [{ key: 'NEW' }] }, t.context)).isError).toBe(true)
    expect(text(await mcp_test({ server: 'github' }, t.context))).toMatch(/tools: search; last test: Connected\. 1 tool\./)
    expect(text(await mcp_tool_enable({ server: 'github', tool: 'search', enabled: false }, t.context))).toMatch(/Hid the tool search/)
    expect(text(await mcp_enable({ server: 'github', enabled: false }, t.context))).toMatch(/off/)
    expect(text(await mcp_remove({ server: 'github' }, t.context))).toMatch(/Removed/)
  })
})

describe('room tools', () => {
  it('list, open, read, post under the chat title, stop, rename and delete rooms of the desktop', async () => {
    const said: [number, string, string][] = []
    const stopped: [number, number][] = []
    const rooms = new Map<number, { id: number; desktopId: number; teamId: number; title: string; cwd: string; createdAt: string }>()
    const state = (id: number): RoomStateDto => ({
      room: rooms.get(id)!,
      members: [{ profileId: 7, name: 'Dev', color: '#000', sessionId: null, activity: 'thinking', queued: 1 }],
      messages: [{ id: 1, roomId: id, profileId: null, author: 'You', text: 'hello', createdAt: '' }]
    })
    const tools = createRoomTools({
      rooms: {
        list: (d) => [...rooms.values()].filter((r) => r.desktopId === d),
        create: (d, teamId, cwd) => {
          const room = { id: rooms.size + 1, desktopId: d, teamId, title: 'Squad', cwd: cwd ?? 'C:\\Users\\Agent', createdAt: '' }
          rooms.set(room.id, room)
          return room
        },
        state,
        rename: (id, title) => void (rooms.get(id)!.title = title),
        remove: async (id) => void rooms.delete(id),
        say: async (id, body, author) => void said.push([id, body, author ?? 'You']),
        stop: async (id, profileId) => void stopped.push([id, profileId])
      },
      teams: { listTeams: () => [{ id: 3, name: 'Squad', instructions: '', skillIds: [], memberIds: [7], boardRef: null }] },
      paths: { resolve: (_c, input) => (input ?? 'C:\\') as never },
      chatTitle: () => 'Planner chat'
    })
    const ctx = { sessionId: 1, desktopId: 1 }
    expect(text(await tools.room_list({}, ctx))).toBe('No team chat rooms.')
    expect(text(await tools.room_create({ team: 'squad', cwd: 'E:\\' }, ctx))).toBe('Opened [1] Squad: team Squad, folder E:\\')
    expect(text(await tools.room_read({ room: 1 }, ctx))).toBe('[1] Squad: team Squad, folder E:\\\nMembers: Dev (thinking, 1 queued)\n#1 You: hello')
    await tools.room_post({ room: 'Squad', text: '@dev go' }, ctx)
    expect(said).toEqual([[1, '@dev go', 'Planner chat']])
    await tools.room_stop({ room: 1, member: 'Dev' }, ctx)
    expect(stopped).toEqual([[1, 7]])
    expect((await tools.room_read({ room: 1 }, { ...ctx, desktopId: 2 })).isError).toBe(true)
    await tools.room_rename({ room: 1, title: 'Team room' }, ctx)
    expect(text(await tools.room_delete({ room: 'team room' }, ctx))).toMatch(/Deleted room \[1\]/)
  })
})

describe('Task Manager tools', () => {
  const session = (id: number, status: SessionDto['status'], title = `Chat ${id}`): SessionDto =>
    ({ id, agentId: 1, title, status, contextUsed: 50, contextSize: 200, desktopId: 1 }) as SessionDto
  const setupTm = () => {
    const cancelled: number[] = []
    const ended: [number, number][] = []
    const opened: number[] = []
    const procs: AgentProcessDto[] = [{ agentId: 1, agentName: 'Claude Code', desktopId: 1, pid: 42, memoryBytes: 104857600, cpuPercent: 3.4, sessionIds: [1, 2] }]
    const terminals: Record<number, TerminalDto[]> = { 2: [{ id: 1, sessionId: 2, terminalId: 't', command: 'npm', args: ['test'], cwd: 'E:\\', output: '', exitCode: null, signal: null }] }
    const tools = createTaskmgrTools({
      sessions: { list: () => [session(1, 'working', 'Me'), session(2, 'working')], terminalsOf: (id) => terminals[id] ?? [], cancel: async (id) => void cancelled.push(id) },
      processes: { list: () => procs, end: async (a, d) => void ended.push([a, d]) },
      agents: { list: () => [{ id: 1, name: 'Claude Code' } as never] },
      desktops: { state: () => ({ windows: [{ view: { app: 'chat', sessionId: 2 } } as never] }), openChat: (_d, id) => void opened.push(id) }
    })
    return { tools, cancelled, ended, opened }
  }

  it('list chats, programs and terminals of the desktop', async () => {
    const { tools } = setupTm()
    const ctx = { sessionId: 1, desktopId: 1 }
    expect(text(await tools.taskmgr_chats({}, ctx))).toBe('[1] Me (you): agent Claude Code, window closed, status working, context 25%\n[2] Chat 2: agent Claude Code, window open, status working, context 25%')
    expect(text(await tools.taskmgr_processes({}, ctx))).toBe('Claude Code [agent 1]: PID 42, chats 1, 2, memory 100 MB, CPU 3%')
    expect(text(await tools.taskmgr_processes({}, { ...ctx, desktopId: 9 }))).toMatch(/No agent programs/)
    expect(text(await tools.taskmgr_terminals({}, ctx))).toBe('chat 2: npm test (running) in E:\\')
  })

  it('open a chat, end another chat\'s turn (never its own) and end a program', async () => {
    const { tools, cancelled, ended, opened } = setupTm()
    const ctx = { sessionId: 1, desktopId: 1 }
    await tools.taskmgr_open_chat({ chat: 2 }, ctx)
    expect(opened).toEqual([2])
    expect(text(await tools.taskmgr_end_task({ chat: 1 }, ctx))).toMatch(/your own chat/)
    await tools.taskmgr_end_task({ chat: 2 }, ctx)
    expect(cancelled).toEqual([2])
    expect((await tools.taskmgr_end_task({ chat: 99 }, ctx)).isError).toBe(true)
    expect(text(await tools.taskmgr_end_process({ agent: 'claude code' }, ctx))).toMatch(/Ended Claude Code/)
    expect(ended).toEqual([[1, 1]])
  })
})

describe('help tools', () => {
  const tools = createHelpTools({ help: new HelpService(bundledManuals) })

  it('search the manuals and read a topic or one section', async () => {
    const hits = text(await tools.help_search({ query: 'scheduled task' }, { sessionId: 1, desktopId: 1 }))
    expect(hits).toMatch(/^task-scheduler/m)
    const section = text(await tools.help_read({ topic: 'kanban', section: 'What the Agent Can Do' }, { sessionId: 1, desktopId: 1 }))
    expect(section.startsWith('### What the Agent Can Do')).toBe(true)
    expect(section).toContain('board_move_card')
    expect(section).not.toContain('## 5 - Common Tasks')
    expect(text(await tools.help_read({ topic: 'kanban' }, { sessionId: 1, desktopId: 1 }))).toMatch(/^# Using Kanban/)
    expect((await tools.help_read({ topic: 'nope' }, { sessionId: 1, desktopId: 1 })).isError).toBe(true)
    expect(text(await tools.help_search({ query: 'zzqqxx' }, { sessionId: 1, desktopId: 1 }))).toMatch(/No section/)
  })
})

describe('read and confirm tools at the gate', () => {
  it('reads never ask (Deny still blocks), confirms always ask', async () => {
    const requests: ToolGateRequest[] = []
    const handlers = Object.fromEntries(Object.keys(TOOL_DEFS).map((n) => [n, async () => ({ content: [] })])) as unknown as ToolHandlers<keyof typeof TOOL_DEFS>
    const service = new DesktopToolService({
      states: { state: () => ({ tools: ['shell'], paused: false }) as never } as never,
      gate: { authorize: async (_s, r) => void requests.push(r) },
      handlers
    })
    await service.call({ sessionId: 1, desktopId: 1 }, 'scheduler_list', {})
    await service.call({ sessionId: 1, desktopId: 1 }, 'settings_set_permission', { permission: 'terminal', decision: 'allow' })
    await service.call({ sessionId: 1, desktopId: 1 }, 'scheduler_create', { name: 'x', prompt: 'y', triggers: [] })
    expect(requests.map((r) => [r.group, r.askUser, r.force])).toEqual([
      ['scheduler', false, undefined],
      ['settings', undefined, true],
      ['scheduler', undefined, undefined]
    ])
  })
})

/**
 * The agent tools of the apps that manage AgentXP itself: Task Scheduler, Teams, Team Chat, Control Center, Task Manager
 * and Help. Every action of their windows has a tool here, so an agent can do from a chat what a person does with the
 * mouse. Pure (zod only), like `catalog.ts`, which spreads these into `TOOL_DEFS`.
 */
import { z } from 'zod'

const ref = (what: string) => z.union([z.number().int(), z.string().min(1)]).describe(`${what} id, or its name`)
const names = (what: string) => z.array(z.string()).describe(`${what}, by name or id`)

// ---- Task Scheduler
const LOCAL_TIME = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).describe('Local wall-clock time "YYYY-MM-DDTHH:MM"')
const TIMED = { startAt: LOCAL_TIME, expiresAt: LOCAL_TIME.nullable().optional().describe('No runs after this time; default never'), enabled: z.boolean().optional() }
const TRIGGER = z
  .discriminatedUnion('kind', [
    z.object({ kind: z.literal('once'), ...TIMED }),
    z.object({ kind: z.literal('daily'), ...TIMED, everyDays: z.number().int().min(1).max(365).optional().describe('Default 1') }),
    z.object({
      kind: z.literal('weekly'),
      ...TIMED,
      everyWeeks: z.number().int().min(1).max(52).optional().describe('Default 1'),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).describe('0 = Sunday ... 6 = Saturday')
    }),
    z.object({
      kind: z.literal('monthly'),
      ...TIMED,
      months: z.array(z.number().int().min(1).max(12)).optional().describe('1 = January ... 12 = December; default every month'),
      daysOfMonth: z.array(z.number().int().min(1).max(31)).optional().describe('Default: none (use lastDay)'),
      lastDay: z.boolean().optional()
    }),
    z.object({ kind: z.literal('startup'), delayMinutes: z.number().int().min(0).max(1440).optional(), enabled: z.boolean().optional() })
  ])
  .describe('When the task runs')
const TASK_FIELDS = {
  description: z.string().max(2000).optional(),
  prompt: z.string().min(1).max(20_000).describe('What the agent is asked to do on each run'),
  cwd: z.string().optional().describe('Working directory of the new chat (a virtual path); default: your working directory'),
  agent: ref('Agent').optional().describe('The agent that runs it; default: the default agent'),
  chat: z.number().int().optional().describe('Send every run to this existing chat of the desktop instead of a new chat'),
  triggers: z.array(TRIGGER).max(20),
  enabled: z.boolean().optional(),
  ifRunning: z.enum(['ignore', 'queue', 'stop-existing']).optional().describe('When a run is due while one still runs; default ignore'),
  stopAfterMinutes: z.number().int().min(0).max(1440).optional().describe('Stop a run after this long; 0 = never; default 60'),
  onlyIfAgentIdle: z.boolean().optional(),
  onlyIfNotPaused: z.boolean().optional(),
  runMissed: z.boolean().optional().describe('Run as soon as possible after a start that was missed while AgentXP was closed')
}
const TASK_REF = ref('Task')

// ---- Teams
const PROFILE_FIELDS = {
  instructions: z.string().max(20_000).optional().describe('The role and rules of the profile'),
  agent: ref('Agent').nullable().optional().describe('The agent program; null = the default agent'),
  model: z.string().nullable().optional().describe('A model id or name the agent offers; null keeps the agent\'s choice'),
  skills: names('Skills').optional(),
  mcpServers: names('MCP servers').optional(),
  color: z.string().nullable().optional().describe('Avatar colour (CSS colour)')
}
const TEAM_FIELDS = {
  instructions: z.string().max(20_000).optional().describe('Shared by every member'),
  members: names('Profiles, in order; the first answers a message without an @mention').optional(),
  skills: names('Skills every member gets').optional(),
  board: z.union([z.number().int(), z.string()]).nullable().optional().describe('Kanban board id or name the team works from; null = none')
}

// ---- Control Center
const POLICY_KEY = z.string().min(1).describe('A permission key from settings_get (for example "terminal", "fs.write", "board") or "openApps"')
const AGENT_FIELDS = {
  command: z.string().min(1).describe('The program, for example "node" or "claude-code-acp"'),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  startMode: z.string().nullable().optional().describe('The session mode id new chats start in; null keeps the agent\'s choice')
}
const MCP_VAR = z.object({ key: z.string().min(1), value: z.string().optional().describe('Leave out to keep the saved value of this key'), secret: z.boolean().optional() })
const MCP_FIELDS = {
  transport: z.enum(['stdio', 'http']).describe('stdio: a program; http: a web address'),
  command: z.string().optional().describe('stdio: the program'),
  args: z.array(z.string()).optional(),
  url: z.string().optional().describe('http: the address'),
  vars: z.array(MCP_VAR).optional().describe('Environment variables (stdio) or headers (http)')
}

export const ADMIN_TOOL_DEFS = {
  // ------------------------------------------------------------------ Task Scheduler
  scheduler_list: {
    group: 'scheduler',
    access: 'read',
    description: 'List the scheduled tasks of this desktop: id, name, status, triggers, next run and last result.',
    input: z.object({})
  },
  scheduler_get: {
    group: 'scheduler',
    access: 'read',
    description: 'Show one scheduled task in full (triggers, action, conditions, settings) and its recent runs, newest first.',
    input: z.object({ task: TASK_REF, runs: z.number().int().min(0).max(100).optional().describe('How many runs to show; default 10') })
  },
  scheduler_create: {
    group: 'scheduler',
    description: 'Create a scheduled task that sends a prompt to an agent on a schedule (once, daily, weekly, monthly, or when AgentXP starts). Times are local.',
    input: z.object({ name: z.string().min(1).max(120), ...TASK_FIELDS })
  },
  scheduler_update: {
    group: 'scheduler',
    description: 'Change a scheduled task. Only the fields you give change; `triggers` replaces all triggers.',
    input: z.object({ task: TASK_REF, name: z.string().min(1).max(120).optional(), ...TASK_FIELDS, prompt: TASK_FIELDS.prompt.optional(), triggers: TASK_FIELDS.triggers.optional() })
  },
  scheduler_delete: { group: 'scheduler', description: 'Delete a scheduled task and its history.', input: z.object({ task: TASK_REF }) },
  scheduler_enable: {
    group: 'scheduler',
    description: 'Enable or disable a scheduled task.',
    input: z.object({ task: TASK_REF, enabled: z.boolean() })
  },
  scheduler_run: { group: 'scheduler', description: 'Run a scheduled task now (Run). Returns when the run has started.', input: z.object({ task: TASK_REF }) },
  scheduler_end: { group: 'scheduler', description: 'Stop the running instance of a task and drop the queued ones (End).', input: z.object({ task: TASK_REF }) },
  scheduler_clear_history: { group: 'scheduler', description: 'Clear the run history of a task.', input: z.object({ task: TASK_REF }) },

  // ------------------------------------------------------------------ Teams
  profile_list: {
    group: 'teams',
    access: 'read',
    description: 'List the agent profiles (members of teams): id, name, agent, model, skills, MCP servers and the start of the instructions.',
    input: z.object({})
  },
  profile_create: { group: 'teams', description: 'Create an agent profile.', input: z.object({ name: z.string().min(1).max(80), ...PROFILE_FIELDS }) },
  profile_update: {
    group: 'teams',
    description: 'Change a profile. Only the fields you give change.',
    input: z.object({ profile: ref('Profile'), name: z.string().min(1).max(80).optional(), ...PROFILE_FIELDS })
  },
  profile_delete: { group: 'teams', description: 'Delete a profile. Teams lose it as a member.', input: z.object({ profile: ref('Profile') }) },
  team_list: {
    group: 'teams',
    access: 'read',
    description: 'List the teams: id, name, members in order, shared skills and the Kanban board they work from.',
    input: z.object({})
  },
  team_create: { group: 'teams', description: 'Create a team of profiles.', input: z.object({ name: z.string().min(1).max(80), ...TEAM_FIELDS }) },
  team_update: {
    group: 'teams',
    description: 'Change a team. Only the fields you give change; `members` replaces the member list.',
    input: z.object({ team: ref('Team'), name: z.string().min(1).max(80).optional(), ...TEAM_FIELDS })
  },
  team_delete: { group: 'teams', description: 'Delete a team.', input: z.object({ team: ref('Team') }) },

  // ------------------------------------------------------------------ Team Chat
  room_list: {
    group: 'rooms',
    access: 'read',
    description: 'List the team chat rooms of this desktop: id, title, team and working folder.',
    input: z.object({})
  },
  room_read: {
    group: 'rooms',
    access: 'read',
    description: 'Read a team chat room: its members (and what each is doing) and the last messages.',
    input: z.object({ room: ref('Room'), last: z.number().int().min(1).max(200).optional().describe('How many messages; default 30') })
  },
  room_create: {
    group: 'rooms',
    description: 'Open a new chat room for a team on this desktop.',
    input: z.object({ team: ref('Team'), cwd: z.string().optional().describe('Working folder of every member (a virtual path); default C:\\Users\\Agent') })
  },
  room_rename: { group: 'rooms', description: 'Rename a team chat room.', input: z.object({ room: ref('Room'), title: z.string().min(1).max(120) }) },
  room_delete: { group: 'rooms', description: 'Delete a team chat room and the chats of its members.', input: z.object({ room: ref('Room') }) },
  room_post: {
    group: 'rooms',
    description: 'Post a message in a team chat room. @mention a member to call it; without a mention the member who spoke last answers.',
    input: z.object({ room: ref('Room'), text: z.string().min(1).max(20_000) })
  },
  room_stop: {
    group: 'rooms',
    description: 'Stop what a member of a room is doing and drop the messages waiting for it.',
    input: z.object({ room: ref('Room'), member: ref('Profile') })
  },

  // ------------------------------------------------------------------ Control Center (every change asks the user)
  settings_get: {
    group: 'settings',
    access: 'read',
    description: 'Read the Control Center settings: every permission (key, name, Allow/Ask/Deny) and the agents with the default one.',
    input: z.object({})
  },
  settings_set_permission: {
    group: 'settings',
    access: 'confirm',
    description: 'Change one Control Center permission to allow, ask or deny. The user is always asked first.',
    input: z.object({ permission: POLICY_KEY, decision: z.enum(['allow', 'ask', 'deny']) })
  },
  agent_list: {
    group: 'settings',
    access: 'read',
    description: 'List the agent programs AgentXP can start: id, name, command, start mode and which is the default.',
    input: z.object({})
  },
  agent_add: {
    group: 'settings',
    access: 'confirm',
    description: 'Add an agent program. The user is always asked first.',
    input: z.object({ name: z.string().optional(), ...AGENT_FIELDS, makeDefault: z.boolean().optional() })
  },
  agent_update: {
    group: 'settings',
    access: 'confirm',
    description: 'Change an agent program. Only the fields you give change. The user is always asked first.',
    input: z.object({ agent: ref('Agent'), name: z.string().optional(), ...AGENT_FIELDS, command: AGENT_FIELDS.command.optional() })
  },
  agent_remove: { group: 'settings', access: 'confirm', description: 'Remove an agent program. The user is always asked first.', input: z.object({ agent: ref('Agent') }) },
  agent_set_default: {
    group: 'settings',
    access: 'confirm',
    description: 'Make an agent the default for new desktops and chats. The user is always asked first.',
    input: z.object({ agent: ref('Agent') })
  },
  skill_list: {
    group: 'settings',
    access: 'read',
    description: 'List the installed skills: id, name, description and whether each is on.',
    input: z.object({})
  },
  skill_install: {
    group: 'settings',
    access: 'confirm',
    description: 'Install a skill from a folder that holds a SKILL.md (name and description in its front matter). AgentXP keeps a copy. The user is always asked first.',
    input: z.object({ path: z.string().min(1).describe('The skill folder, as a virtual path or relative to your working directory') })
  },
  skill_remove: { group: 'settings', access: 'confirm', description: 'Remove an installed skill. The user is always asked first.', input: z.object({ skill: ref('Skill') }) },
  skill_enable: {
    group: 'settings',
    access: 'confirm',
    description: 'Turn a skill on or off. The user is always asked first.',
    input: z.object({ skill: ref('Skill'), enabled: z.boolean() })
  },
  mcp_list: {
    group: 'settings',
    access: 'read',
    description: 'List the MCP servers: id, name, type, command or address, state, tools and the last test. Secret values are hidden.',
    input: z.object({})
  },
  mcp_add: {
    group: 'settings',
    access: 'confirm',
    description: 'Add an MCP server (a program or a web address that gives agents more tools). The user is always asked first.',
    input: z.object({ name: z.string().min(1).describe('Letters, digits, - and _'), ...MCP_FIELDS })
  },
  mcp_update: {
    group: 'settings',
    access: 'confirm',
    description: 'Change an MCP server. Only the fields you give change. The user is always asked first.',
    input: z.object({ server: ref('MCP server'), name: z.string().min(1).optional(), ...MCP_FIELDS, transport: MCP_FIELDS.transport.optional() })
  },
  mcp_remove: { group: 'settings', access: 'confirm', description: 'Remove an MCP server. The user is always asked first.', input: z.object({ server: ref('MCP server') }) },
  mcp_enable: {
    group: 'settings',
    access: 'confirm',
    description: 'Turn an MCP server on or off. The user is always asked first.',
    input: z.object({ server: ref('MCP server'), enabled: z.boolean() })
  },
  mcp_tool_enable: {
    group: 'settings',
    access: 'confirm',
    description: 'Show or hide one tool of an MCP server from agents (after a test). The user is always asked first.',
    input: z.object({ server: ref('MCP server'), tool: z.string().min(1), enabled: z.boolean() })
  },
  mcp_test: {
    group: 'settings',
    access: 'confirm',
    description: 'Connect to an MCP server and list its tools (Test connection). It starts the program, so the user is always asked first.',
    input: z.object({ server: ref('MCP server') })
  },

  // ------------------------------------------------------------------ Task Manager
  taskmgr_chats: {
    group: 'taskmgr',
    access: 'read',
    description: 'List the chats of this desktop as Task Manager shows them: id, title, agent, window open or closed, status and context use.',
    input: z.object({})
  },
  taskmgr_processes: {
    group: 'taskmgr',
    access: 'read',
    description: 'List the running agent programs of this desktop: agent, PID, chats, memory and CPU.',
    input: z.object({})
  },
  taskmgr_terminals: {
    group: 'taskmgr',
    access: 'read',
    description: 'List the terminals of the chats of this desktop: chat, command, status and working folder.',
    input: z.object({ chat: z.number().int().optional().describe('Only this chat') })
  },
  taskmgr_open_chat: {
    group: 'taskmgr',
    description: 'Open the window of a chat of this desktop (also a closed one) and bring it to the front.',
    input: z.object({ chat: z.number().int() })
  },
  taskmgr_end_task: {
    group: 'taskmgr',
    description: 'Stop the turn of another chat of this desktop (End Task). The chat stays.',
    input: z.object({ chat: z.number().int() })
  },
  taskmgr_end_process: {
    group: 'taskmgr',
    access: 'confirm',
    description: 'End an agent program of this desktop (End process). Its chats stop and work in progress is lost. The user is always asked first.',
    input: z.object({ agent: ref('Agent') })
  },

  // ------------------------------------------------------------------ Help and Support
  help_search: {
    group: 'help',
    access: 'read',
    description: 'Search the AgentXP manuals (Help and Support). Returns the best sections with a line of text each. Use it to answer how-to questions about AgentXP.',
    input: z.object({ query: z.string().min(1), limit: z.number().int().min(1).max(30).optional().describe('Default 8') })
  },
  help_read: {
    group: 'help',
    access: 'read',
    description: 'Read a manual (a topic id from help_search, such as "kanban" or "task-scheduler"), or one section of it.',
    input: z.object({ topic: z.string().min(1), section: z.string().optional().describe('A section heading or its slug') })
  }
} as const

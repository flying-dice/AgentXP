import { TOOL_GROUPS, type PolicyDecision, type ToolGroup, type ToolPolicyDto } from '@shared/desktop'
import type { AgentDto } from '@shared/models'
import type { AgentInput, ConfigArea } from '@shared/ipc'
import { PERMISSION_NAMES } from '@shared/permissionNames'
import type { McpServerDto, McpServerInput, SkillDto } from '@shared/teams'
import type { AgentService } from '../AgentService'
import { AppError } from '../errors'
import type { McpServerService } from '../teams/McpServerService'
import type { SkillService } from '../teams/SkillService'
import type { VirtualFileSystem } from '../vfs/VirtualFileSystem'
import type { ToolArgs, ToolHandlers } from './catalog'
import { findNamed } from './teamsTools'
import type { ToolPaths } from './ToolPaths'
import { attempt, textResult } from './types'

export interface SettingsToolsDeps {
  policy: { policy(): ToolPolicyDto; setPolicy(policy: ToolPolicyDto): void }
  agents: Pick<AgentService, 'list' | 'create' | 'update' | 'remove' | 'setDefault'>
  skills: Pick<SkillService, 'list' | 'install' | 'remove' | 'setEnabled'>
  mcp: Pick<McpServerService, 'list' | 'add' | 'update' | 'remove' | 'setEnabled' | 'setToolEnabled' | 'test'>
  paths: Pick<ToolPaths, 'resolve'>
  vfs: Pick<VirtualFileSystem, 'realPath'>
  /** Tells open Control Center and Teams windows to reload. */
  changed(area: ConfigArea): void
}

type Names =
  | 'settings_get' | 'settings_set_permission'
  | 'agent_list' | 'agent_add' | 'agent_update' | 'agent_remove' | 'agent_set_default'
  | 'skill_list' | 'skill_install' | 'skill_remove' | 'skill_enable'
  | 'mcp_list' | 'mcp_add' | 'mcp_update' | 'mcp_remove' | 'mcp_enable' | 'mcp_tool_enable' | 'mcp_test'

const GATED = TOOL_GROUPS.filter((g): g is Exclude<ToolGroup, 'shell'> => g !== 'shell')
const SECRET_MASK = '********'

export const describeAgent = (a: AgentDto): string =>
  `[${a.id}] ${a.name}${a.isDefault ? ' (default)' : ''}: ${[a.command, ...a.args].join(' ')}${a.defaultModeId ? `, starts in mode ${a.defaultModeId}` : ''}${a.defaultModelId ? `, starts on model ${a.defaultModelId}` : ''}`
export const describeSkill = (s: SkillDto): string => `[${s.id}] ${s.name} (${s.enabled ? 'on' : 'off'}): ${s.description}`
/** A server as the agent sees it: secret values are never shown. */
export const describeServer = (s: McpServerDto): string => {
  const target = s.transport === 'stdio' ? [s.command, ...s.args].join(' ') : s.url
  const vars = s.vars.map((v) => `${v.key}=${v.secret ? SECRET_MASK : v.value}`).join(', ')
  const tools = s.tools.length ? s.tools.map((t) => `${t.name}${t.enabled ? '' : ' (hidden)'}`).join(', ') : 'not tested'
  return `[${s.id}] ${s.name} (${s.enabled ? 'on' : 'off'}, ${s.transport}): ${target}${vars ? `; ${s.transport === 'stdio' ? 'env' : 'headers'} ${vars}` : ''}; tools: ${tools}${s.lastTest ? `; last test: ${s.lastTest.message}` : ''}`
}

/**
 * settings_*, agent_*, skill_*, mcp_*: Control Center. Reads are free; every change is a `confirm` tool in the catalog,
 * so the user approves it in the permission dialog first, whatever the policy says.
 */
export function createSettingsTools(deps: SettingsToolsDeps): ToolHandlers<Names> {
  const { agents, skills, mcp } = deps
  const agentOf = (ref: number | string): AgentDto => findNamed(agents.list(), ref, 'agent', 'agent_list')
  const skillOf = (ref: number | string): SkillDto => findNamed(skills.list(), ref, 'skill', 'skill_list')
  const serverOf = (ref: number | string): McpServerDto => findNamed(mcp.list(), ref, 'MCP server', 'mcp_list')

  const agentInput = (base: AgentInput, a: Partial<ToolArgs<'agent_add'>>): AgentInput => ({
    name: a.name ?? base.name,
    command: a.command ?? base.command,
    args: a.args ?? base.args,
    env: a.env ?? base.env,
    defaultModeId: a.startMode === undefined ? base.defaultModeId : a.startMode,
    defaultModelId: a.startModel === undefined ? base.defaultModelId : a.startModel
  })

  /** The vars the agent gave; a var without a value keeps the saved value of its key (the agent never sees secrets). */
  const serverInput = (base: McpServerInput, a: Partial<ToolArgs<'mcp_add'>>): McpServerInput => ({
    name: a.name ?? base.name,
    transport: a.transport ?? base.transport,
    command: a.command ?? base.command,
    args: a.args ?? base.args,
    url: a.url ?? base.url,
    vars: a.vars
      ? a.vars.map((v) => {
          const saved = base.vars.find((b) => b.key === v.key)
          if (v.value === undefined && !saved) throw new AppError(`Give a value for the new variable ${v.key}.`)
          return { key: v.key, value: v.value ?? saved!.value, secret: v.secret ?? saved?.secret ?? false }
        })
      : base.vars
  })

  const done = (area: ConfigArea, text: string) => {
    deps.changed(area)
    return textResult(text)
  }

  return {
    settings_get: async () => {
      const policy = deps.policy.policy()
      const rows = GATED.map((g) => `${g}: ${PERMISSION_NAMES[g]} = ${policy.groups[g]}`)
      const list = agents.list()
      return textResult(
        [`Permissions (key: name = decision):`, ...rows.map((r) => `  ${r}`), `  openApps: Agent may open apps = ${policy.openApps}`, `Agents:`, ...list.map((a) => `  ${describeAgent(a)}`)].join('\n')
      )
    },
    settings_set_permission: ({ permission, decision }) =>
      attempt(() => {
        const policy = deps.policy.policy()
        const next: ToolPolicyDto = { groups: { ...policy.groups }, openApps: policy.openApps }
        if (permission === 'openApps') next.openApps = decision as PolicyDecision
        else if ((GATED as readonly string[]).includes(permission)) next.groups[permission as Exclude<ToolGroup, 'shell'>] = decision
        else throw new AppError(`There is no permission "${permission}". Keys: ${[...GATED, 'openApps'].join(', ')}.`)
        deps.policy.setPolicy(next)
        return textResult(`Set ${permission} to ${decision}.`)
      }),

    agent_list: async () => textResult(agents.list().map(describeAgent).join('\n') || 'No agents.'),
    agent_add: ({ makeDefault, ...args }) =>
      attempt(() => {
        const created = agents.create(agentInput({ name: '', command: '', args: [], env: {}, defaultModeId: null, defaultModelId: null }, args))
        if (makeDefault) agents.setDefault(created.id)
        return done('agents', `Added ${describeAgent(agents.list().find((a) => a.id === created.id) ?? created)}`)
      }),
    agent_update: ({ agent, ...args }) =>
      attempt(() => {
        const found = agentOf(agent)
        return done('agents', `Saved ${describeAgent(agents.update(found.id, agentInput(found, args)))}`)
      }),
    agent_remove: ({ agent }) =>
      attempt(() => {
        const found = agentOf(agent)
        agents.remove(found.id)
        return done('agents', `Removed the agent [${found.id}] ${found.name}.`)
      }),
    agent_set_default: ({ agent }) =>
      attempt(() => {
        const found = agentOf(agent)
        agents.setDefault(found.id)
        return done('agents', `${found.name} is the default agent now.`)
      }),

    skill_list: async () => textResult(skills.list().map(describeSkill).join('\n') || 'No skills installed.'),
    skill_install: ({ path }, context) =>
      attempt(async () => {
        const folder = await deps.vfs.realPath(context.desktopId, deps.paths.resolve(context, path))
        return done('skills', `Installed ${describeSkill(await skills.install(folder))}`)
      }),
    skill_remove: ({ skill }) =>
      attempt(async () => {
        const found = skillOf(skill)
        await skills.remove(found.id)
        return done('skills', `Removed the skill [${found.id}] ${found.name}.`)
      }),
    skill_enable: ({ skill, enabled }) =>
      attempt(() => {
        const found = skillOf(skill)
        skills.setEnabled(found.id, enabled)
        return done('skills', `Turned the skill ${found.name} ${enabled ? 'on' : 'off'}.`)
      }),

    mcp_list: async () => textResult(mcp.list().map(describeServer).join('\n') || 'No MCP servers.'),
    mcp_add: (args) =>
      attempt(() => done('mcp', `Added ${describeServer(mcp.add(serverInput({ name: '', transport: 'stdio', command: '', args: [], url: '', vars: [] }, args)))}. Call mcp_test to list its tools.`)),
    mcp_update: ({ server, ...args }) =>
      attempt(() => {
        const found = serverOf(server)
        return done('mcp', `Saved ${describeServer(mcp.update(found.id, serverInput(found, args)))}`)
      }),
    mcp_remove: ({ server }) =>
      attempt(() => {
        const found = serverOf(server)
        mcp.remove(found.id)
        return done('mcp', `Removed the MCP server [${found.id}] ${found.name}.`)
      }),
    mcp_enable: ({ server, enabled }) =>
      attempt(() => {
        const found = serverOf(server)
        mcp.setEnabled(found.id, enabled)
        return done('mcp', `Turned the MCP server ${found.name} ${enabled ? 'on' : 'off'}.`)
      }),
    mcp_tool_enable: ({ server, tool, enabled }) =>
      attempt(() => {
        const found = serverOf(server)
        mcp.setToolEnabled(found.id, tool, enabled)
        return done('mcp', `${enabled ? 'Showed' : 'Hid'} the tool ${tool} of ${found.name}.`)
      }),
    mcp_test: ({ server }) =>
      attempt(async () => {
        const found = serverOf(server)
        return done('mcp', describeServer(await mcp.test(found.id)))
      })
  }
}

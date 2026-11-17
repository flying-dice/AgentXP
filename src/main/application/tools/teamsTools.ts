import type { ConfigArea } from '@shared/ipc'
import type { Id } from '@shared/models'
import type { ProfileDto, ProfileInput, TeamDto, TeamInput } from '@shared/teams'
import { AppError } from '../errors'
import type { KanbanService } from '../kanban/KanbanService'
import type { TeamService } from '../teams/TeamService'
import type { ToolHandlers } from './catalog'
import { attempt, textResult } from './types'

/** Something with an id and a name, found by either. */
interface Named {
  id: Id
  name: string
}

/** Finds `ref` (an id or a name, case-insensitive) in `items`, or throws a message that lists what exists. */
export function findNamed<T extends Named>(items: readonly T[], ref: number | string, what: string, listTool: string): T {
  const hit = typeof ref === 'number' ? items.find((i) => i.id === ref) : items.find((i) => i.name.toLowerCase() === ref.trim().toLowerCase())
  if (!hit) throw new AppError(`There is no ${what} "${ref}". Call ${listTool}.`)
  return hit
}

export interface TeamsToolsDeps {
  teams: Pick<TeamService, 'listProfiles' | 'createProfile' | 'updateProfile' | 'removeProfile' | 'listTeams' | 'createTeam' | 'updateTeam' | 'removeTeam'>
  agents: { list(): Named[] }
  skills: { list(): Named[] }
  mcp: { list(): Named[] }
  kanban: Pick<KanbanService, 'find'>
  /** Tells open Teams and Control Center windows to reload. */
  changed(area: ConfigArea): void
}

type Names = 'profile_list' | 'profile_create' | 'profile_update' | 'profile_delete' | 'team_list' | 'team_create' | 'team_update' | 'team_delete'

/** profile_*, team_*: the profiles and teams of the Teams app (the same service the Teams window uses). */
export function createTeamsTools(deps: TeamsToolsDeps): ToolHandlers<Names> {
  const { teams } = deps
  const ids = (list: readonly (number | string)[], items: readonly Named[], what: string, tool: string): Id[] => list.map((r) => findNamed(items, r, what, tool).id)
  const nameOf = (items: readonly Named[], id: Id | null): string => (id === null ? 'default' : (items.find((i) => i.id === id)?.name ?? `#${id}`))

  const describeProfile = (p: ProfileDto): string => {
    const skills = deps.skills.list()
    const servers = deps.mcp.list()
    const first = p.instructions.split('\n')[0]?.slice(0, 120) ?? ''
    return `[${p.id}] ${p.name}: agent ${nameOf(deps.agents.list(), p.agentId)}, model ${p.model ?? 'agent default'}, skills ${p.skillIds.map((i) => nameOf(skills, i)).join(', ') || 'none'}, MCP servers ${p.mcpServerIds.map((i) => nameOf(servers, i)).join(', ') || 'none'}. ${first}`
  }
  const describeTeam = (t: TeamDto): string => {
    const profiles = teams.listProfiles()
    const skills = deps.skills.list()
    return `[${t.id}] ${t.name}: members ${t.memberIds.map((i) => nameOf(profiles, i)).join(', ') || 'none'}; skills ${t.skillIds.map((i) => nameOf(skills, i)).join(', ') || 'none'}; board ${t.boardRef ?? 'none'}.`
  }

  const profileInput = (base: ProfileInput, a: { name?: string; instructions?: string; agent?: number | string | null; model?: string | null; skills?: (number | string)[]; mcpServers?: (number | string)[]; color?: string | null }): ProfileInput => ({
    name: a.name ?? base.name,
    instructions: a.instructions ?? base.instructions,
    agentId: a.agent === undefined ? base.agentId : a.agent === null ? null : findNamed(deps.agents.list(), a.agent, 'agent', 'agent_list').id,
    model: a.model === undefined ? base.model : a.model,
    skillIds: a.skills ? ids(a.skills, deps.skills.list(), 'skill', 'skill_list') : base.skillIds,
    mcpServerIds: a.mcpServers ? ids(a.mcpServers, deps.mcp.list(), 'MCP server', 'mcp_list') : base.mcpServerIds,
    color: a.color === undefined ? base.color : a.color
  })

  const teamInput = (desktopId: Id, base: TeamInput, a: { name?: string; instructions?: string; members?: (number | string)[]; skills?: (number | string)[]; board?: number | string | null }): TeamInput => ({
    name: a.name ?? base.name,
    instructions: a.instructions ?? base.instructions,
    memberIds: a.members ? ids(a.members, teams.listProfiles(), 'profile', 'profile_list') : base.memberIds,
    skillIds: a.skills ? ids(a.skills, deps.skills.list(), 'skill', 'skill_list') : base.skillIds,
    boardRef: a.board === undefined ? base.boardRef : a.board === null ? null : String(deps.kanban.find(desktopId, a.board).id)
  })

  const emptyProfile: ProfileInput = { name: '', instructions: '', agentId: null, model: null, skillIds: [], mcpServerIds: [], color: null }
  const emptyTeam: TeamInput = { name: '', instructions: '', memberIds: [], skillIds: [], boardRef: null }

  return {
    profile_list: async () => {
      const list = teams.listProfiles()
      return textResult(list.length === 0 ? 'No profiles.' : list.map(describeProfile).join('\n'))
    },
    profile_create: (args) =>
      attempt(() => {
        const created = teams.createProfile(profileInput(emptyProfile, args))
        deps.changed('profiles')
        return textResult(`Created ${describeProfile(created)}`)
      }),
    profile_update: ({ profile, ...args }) =>
      attempt(() => {
        const found = findNamed(teams.listProfiles(), profile, 'profile', 'profile_list')
        const saved = teams.updateProfile(found.id, profileInput(found, args))
        deps.changed('profiles')
        return textResult(`Saved ${describeProfile(saved)}`)
      }),
    profile_delete: ({ profile }) =>
      attempt(() => {
        const found = findNamed(teams.listProfiles(), profile, 'profile', 'profile_list')
        teams.removeProfile(found.id)
        deps.changed('profiles')
        return textResult(`Deleted the profile [${found.id}] ${found.name}.`)
      }),

    team_list: async () => {
      const list = teams.listTeams()
      return textResult(list.length === 0 ? 'No teams.' : list.map(describeTeam).join('\n'))
    },
    team_create: (args, { desktopId }) =>
      attempt(() => {
        const created = teams.createTeam(teamInput(desktopId, emptyTeam, args))
        deps.changed('teams')
        return textResult(`Created ${describeTeam(created)}`)
      }),
    team_update: ({ team, ...args }, { desktopId }) =>
      attempt(() => {
        const found = findNamed(teams.listTeams(), team, 'team', 'team_list')
        const saved = teams.updateTeam(found.id, teamInput(desktopId, found, args))
        deps.changed('teams')
        return textResult(`Saved ${describeTeam(saved)}`)
      }),
    team_delete: ({ team }) =>
      attempt(() => {
        const found = findNamed(teams.listTeams(), team, 'team', 'team_list')
        teams.removeTeam(found.id)
        deps.changed('teams')
        return textResult(`Deleted the team [${found.id}] ${found.name}.`)
      })
  }
}

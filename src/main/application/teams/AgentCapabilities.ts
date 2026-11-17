import type { Id } from '@shared/models'
import type { McpServerDto, ProfileDto, SkillDto, TeamDto } from '@shared/teams'
import type { McpServerConfig } from '../../domain/agent/McpServerConfig'
import type { McpServerRepository, ProfileRepository, RoomRepository, SkillRepository, TeamRepository } from '../../domain/repositories/teams-repositories'
import type { SessionRepository } from '../../domain/repositories/session-repository'
import type { McpProxyLaunch } from './ports'
import { toMcpConfig } from './McpServerService'

/** Environment of the filtering proxy: the real server (JSON of `McpServerConfig`) and the tools it hides (JSON array). */
export const ENV_PROXY_TARGET = 'AGENTXP_MCP_TARGET'
export const ENV_PROXY_HIDE = 'AGENTXP_MCP_HIDE'

export interface AgentCapabilitiesDeps {
  skills: SkillRepository
  servers: McpServerRepository
  profiles: ProfileRepository
  teams: TeamRepository
  rooms: RoomRepository
  sessions: Pick<SessionRepository, 'get'>
  /** Looks up a Kanban board by id so the briefing can name it. */
  boards?: { board(id: Id): { name: string } | null }
  /** Without it a server with switched-off tools is handed over whole (tests). */
  proxy?: McpProxyLaunch
}

/** What a session has beyond the desktop: its skills, its MCP servers and its instructions. */
export class AgentCapabilities {
  constructor(private readonly deps: AgentCapabilitiesDeps) {}

  /** The MCP servers of a session. A plain chat gets every enabled server; a member of a team room gets its profile's. A review gets none (it only reads). */
  mcpServers(sessionId: Id): McpServerConfig[] {
    const scope = this.scopeOf(sessionId)
    if (scope === null) return []
    return scope.servers.map((s) => this.configFor(s))
  }

  /** The text of the first prompt of a session (instructions, roster, skills), or null when there is nothing to tell. */
  briefing(sessionId: Id): string | null {
    const scope = this.scopeOf(sessionId)
    if (scope === null) return null
    const parts: string[] = []
    const member = scope.member
    if (member) {
      const { team, profile, roster, roomTitle } = member
      parts.push(`You are ${profile.name}, a member of the team "${team.name}" in the chat room "${roomTitle}".`)
      if (team.instructions) parts.push(`## Team instructions\n${team.instructions}`)
      if (profile.instructions) parts.push(`## Your instructions\n${profile.instructions}`)
      parts.push(
        `## The room\nThe room is a chat with the user and these teammates: ${roster.map((n) => `@${n.replace(/\s+/g, '')}`).join(', ')}. ` +
          'Everything you write as your final answer is posted in the room under your name; the room does not show your tool calls, so say what matters. ' +
          'Write @Name to call a teammate: they start work as soon as they are called. Do not call anyone you do not need.'
      )
      if (team.boardRef) parts.push(this.boardBriefing(team.boardRef))
    }
    if (scope.skills.length > 0) {
      const lines = scope.skills.map((s) => `- ${s.name}: ${s.description} (read ${s.path}/SKILL.md before you use it)`)
      parts.push(`## Skills\nThese skills are installed. When a task matches one, read its SKILL.md and follow it.\n${lines.join('\n')}`)
    }
    return parts.length > 0 ? parts.join('\n\n') : null
  }

  /** `boardRef` is a Kanban board id; an unknown id (or a plain name, as before) is passed on as written. */
  private boardBriefing(ref: string): string {
    const id = /^\d+$/.test(ref) ? Number(ref) : null
    const board = id === null ? null : (this.deps.boards?.board(id) ?? null)
    return board
      ? `## Work board\nThe team tracks its work on the Kanban board "${board.name}" (board id ${id}). Use the board_* tools with that board to read and update work.`
      : `## Work board\nThe team tracks its work on the board "${ref}".`
  }

  private configFor(server: McpServerDto): McpServerConfig {
    const target = toMcpConfig(server)
    const hidden = server.tools.filter((t) => !t.enabled).map((t) => t.name)
    const proxy = this.deps.proxy
    if (hidden.length === 0 || !proxy) return target
    return {
      kind: 'stdio',
      name: server.name,
      command: proxy.electronPath,
      args: [proxy.scriptPath],
      env: { ELECTRON_RUN_AS_NODE: '1', [ENV_PROXY_TARGET]: JSON.stringify(target), [ENV_PROXY_HIDE]: JSON.stringify(hidden) }
    }
  }

  private scopeOf(sessionId: Id): {
    skills: SkillDto[]
    servers: McpServerDto[]
    member: { team: TeamDto; profile: ProfileDto; roster: string[]; roomTitle: string } | null
  } | null {
    const session = this.deps.sessions.get(sessionId)
    if (!session || session.role === 'review') return null
    const enabledSkills = this.deps.skills.list().filter((s) => s.enabled)
    const enabledServers = this.deps.servers.list().filter((s) => s.enabled)
    const link = this.deps.rooms.findBySession(sessionId)
    const room = link ? this.deps.rooms.get(link.roomId) : null
    const profile = link ? this.deps.profiles.get(link.profileId) : null
    const team = room ? this.deps.teams.get(room.teamId) : null
    if (!link || !room || !profile || !team) return { skills: enabledSkills, servers: enabledServers, member: null }
    const own = new Set([...profile.skillIds, ...team.skillIds])
    const ownServers = new Set(profile.mcpServerIds)
    const roster = team.memberIds.flatMap((id) => this.deps.profiles.get(id)?.name ?? [])
    return {
      skills: enabledSkills.filter((s) => own.has(s.id)),
      servers: enabledServers.filter((s) => ownServers.has(s.id)),
      member: { team, profile, roster, roomTitle: room.title }
    }
  }
}

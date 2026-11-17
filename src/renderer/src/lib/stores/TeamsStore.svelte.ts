import type { AgentXPApi } from '@shared/ipc'
import type { Id } from '@shared/models'
import type { McpServerDto, ProfileDto, SkillDto, TeamDto } from '@shared/teams'

/** What Control Center > Skills and MCP Servers and the Teams app list, loaded from main and reloaded after a change. */
export class TeamsStore {
  skills = $state.raw<SkillDto[]>([])
  servers = $state.raw<McpServerDto[]>([])
  profiles = $state.raw<ProfileDto[]>([])
  teams = $state.raw<TeamDto[]>([])
  private readonly api: Pick<AgentXPApi, 'skills' | 'mcp' | 'profiles' | 'teams'>

  constructor(api: Pick<AgentXPApi, 'skills' | 'mcp' | 'profiles' | 'teams'>) {
    this.api = api
  }

  async load(): Promise<void> {
    const [skills, servers, profiles, teams] = await Promise.all([this.api.skills.list(), this.api.mcp.list(), this.api.profiles.list(), this.api.teams.list()])
    this.skills = skills
    this.servers = servers
    this.profiles = profiles
    this.teams = teams
  }

  profile(id: Id): ProfileDto | null {
    return this.profiles.find((p) => p.id === id) ?? null
  }

  /** Runs a change and reloads everything (a removed skill also leaves the profiles that had it). */
  async change<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action()
    } finally {
      await this.load()
    }
  }
}

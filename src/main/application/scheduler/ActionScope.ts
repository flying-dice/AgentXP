import type { Id } from '@shared/models'
import type { ActionCapabilitiesDto } from '@shared/scheduler'
import type { McpServerRepository, ProfileRepository, SkillRepository, TeamRepository } from '../../domain/repositories/teams-repositories'
import type { SessionScope } from '../../domain/repositories/session-scope-repository'

/** What the scheduler reads from the registry of skills, MCP servers, profiles and teams. */
export interface CapabilityRegistry {
  skills: Pick<SkillRepository, 'get'>
  servers: Pick<McpServerRepository, 'get'>
  profiles: Pick<ProfileRepository, 'get'>
  teams: Pick<TeamRepository, 'get'>
}

/** The chat of an action is a plain chat, has this scope (and maybe the agent and model of a profile), or cannot start (a sentence). */
export type ResolvedScope =
  | { kind: 'plain' }
  | { kind: 'scoped'; scope: SessionScope; agentId: Id | null; model: string | null }
  | { kind: 'problem'; message: string }

const problem = (message: string): ResolvedScope => ({ kind: 'problem', message })

/**
 * Works out the skills and tools of the chat that an action starts, from what the registry holds now. Something that was
 * removed, or that is switched off in Control Center, is a sentence for the run history, never an exception.
 */
export function resolveScope(c: ActionCapabilitiesDto, registry: CapabilityRegistry): ResolvedScope {
  switch (c.mode) {
    case 'inherit':
      return { kind: 'plain' }
    case 'profile': {
      const profile = c.profileId === null ? null : registry.profiles.get(c.profileId)
      if (!profile) return problem('The profile of this task no longer exists. Open the task and choose another profile.')
      const instructions = profile.instructions.trim()
      return { kind: 'scoped', scope: { instructions, skillIds: profile.skillIds, serverIds: profile.mcpServerIds, hiddenTools: [] }, agentId: profile.agentId, model: profile.model }
    }
    case 'team': {
      const team = c.teamId === null ? null : registry.teams.get(c.teamId)
      if (!team) return problem('The team of this task no longer exists. Open the task and choose another team.')
      const lead = team.memberIds.length === 0 ? null : registry.profiles.get(team.memberIds[0])
      if (!lead) return problem(`The team "${team.name}" has no members. Add a profile to the team.`)
      const parts = [`You are ${lead.name}, the first member of the team "${team.name}".`]
      if (team.instructions.trim()) parts.push(`### Team instructions\n${team.instructions.trim()}`)
      if (lead.instructions.trim()) parts.push(`### Your instructions\n${lead.instructions.trim()}`)
      return { kind: 'scoped', scope: { instructions: parts.join('\n\n'), skillIds: [...lead.skillIds, ...team.skillIds], serverIds: lead.mcpServerIds, hiddenTools: [] }, agentId: lead.agentId, model: lead.model }
    }
    case 'custom': {
      for (const ref of c.skills) {
        const skill = ref.id === null ? null : registry.skills.get(ref.id)
        if (!skill) return problem(`The skill "${ref.name}" is no longer installed. Open the task and remove it from the list.`)
        if (!skill.enabled) return problem(`The skill "${skill.name}" is switched off in Control Center.`)
      }
      for (const ref of c.servers) {
        const server = ref.id === null ? null : registry.servers.get(ref.id)
        if (!server) return problem(`The MCP server "${ref.name}" no longer exists. Open the task and remove it from the list.`)
        if (!server.enabled) return problem(`The MCP server "${server.name}" is switched off in Control Center.`)
      }
      const skillIds = c.skills.flatMap((x) => (x.id === null ? [] : [x.id]))
      const serverIds = c.servers.flatMap((x) => (x.id === null ? [] : [x.id]))
      return { kind: 'scoped', scope: { instructions: '', skillIds, serverIds, hiddenTools: c.hiddenTools.filter((t) => serverIds.includes(t.serverId)) }, agentId: null, model: null }
    }
  }
}

/**
 * The action as it is saved: a chosen profile, team, skill or server must exist, and the names are the ones of the registry now.
 * Returns a sentence when one does not. An existing chat keeps its own skills and tools, so the choice is dropped.
 */
export function checkCapabilities(c: ActionCapabilitiesDto, registry: CapabilityRegistry): { value: ActionCapabilitiesDto } | { problem: string } {
  switch (c.mode) {
    case 'inherit':
      return { value: c }
    case 'profile':
      return c.profileId !== null && registry.profiles.get(c.profileId) ? { value: { ...c, teamId: null, skills: [], servers: [], hiddenTools: [] } } : { problem: 'Choose a profile that exists.' }
    case 'team':
      return c.teamId !== null && registry.teams.get(c.teamId) ? { value: { ...c, profileId: null, skills: [], servers: [], hiddenTools: [] } } : { problem: 'Choose a team that exists.' }
    case 'custom': {
      const skills = c.skills.map((r) => (r.id === null ? null : registry.skills.get(r.id)))
      const servers = c.servers.map((r) => (r.id === null ? null : registry.servers.get(r.id)))
      if (skills.includes(null)) return { problem: 'Choose skills that are installed.' }
      if (servers.includes(null)) return { problem: 'Choose MCP servers that exist.' }
      const ids = new Set(c.servers.map((r) => r.id))
      return {
        value: {
          mode: 'custom',
          profileId: null,
          teamId: null,
          skills: skills.flatMap((s) => (s ? [{ id: s.id, name: s.name }] : [])),
          servers: servers.flatMap((s) => (s ? [{ id: s.id, name: s.name }] : [])),
          hiddenTools: c.hiddenTools.filter((t) => ids.has(t.serverId))
        }
      }
    }
  }
}

/** Words and picks of the Agents page of Control Center (UX-149). Pure, so they are tested. */
import type { AgentDto, SessionDto } from '@shared/models'
import { describeAgent } from '../../app/options/agentForm'

/** The command line of an agent: "node my-agent.js". */
export const commandOf = (agent: Pick<AgentDto, 'command' | 'args'>): string => [agent.command, ...agent.args].join(' ')

/** The About column: what the agent is, or, for an agent you added, the command that starts it (never blank). */
export const aboutOf = (agent: Pick<AgentDto, 'name' | 'command' | 'args'>): string => describeAgent(agent) || commandOf(agent)

/**
 * The agent to select when the page opens from a chat that could not use its agent ("Open Agents"): the agent of the
 * newest chat that has a problem. Null when no chat has one.
 */
export function agentToSelect(sessions: readonly Pick<SessionDto, 'agentId' | 'problem' | 'updatedAt'>[], agents: readonly Pick<AgentDto, 'id'>[]): number | null {
  const broken = sessions.filter((s) => s.problem && agents.some((a) => a.id === s.agentId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return broken[0]?.agentId ?? null
}

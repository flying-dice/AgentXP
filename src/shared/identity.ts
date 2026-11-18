/**
 * One identity per agent everywhere (`docs/AGENT_PRESENCE.md`, section 9): the name and colour that balloons, the Action
 * Center, feed rows, tool rows, the team room and (later) the agent cursor use for the agent of a session.
 *
 * Pure types and functions only.
 */
import type { Id } from './models'
import { colorOfName } from './teams'

export interface AgentIdentity {
  name: string
  /** A CSS colour. Never shown alone: the name is always next to it. */
  color: string
}

export interface IdentitySource {
  sessionId: Id
  /** The team member that owns the session (`RoomMemberDto` name and profile colour), when it is one. */
  member?: { name: string; color: string } | null
  /** The display name of the session's agent program (`AgentDto.name`). */
  agentName?: string | null
}

/** The fallback name of an agent that has none (a deleted agent row). */
export const UNNAMED_AGENT = 'Agent'

/**
 * Resolves the identity of a session's agent: a team member is its profile (name and colour); a plain chat is its
 * agent's display name with a colour picked from the session id, so two chats of the same agent stay apart.
 */
export function agentIdentity({ sessionId, member, agentName }: IdentitySource): AgentIdentity {
  if (member) return { name: member.name.trim() || UNNAMED_AGENT, color: member.color || colorOfName(member.name) }
  return { name: agentName?.trim() || UNNAMED_AGENT, color: colorOfName(String(sessionId)) }
}

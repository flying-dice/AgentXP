import type { Id } from '@shared/models'

/**
 * The skills and MCP tools that a chat has when it is not a plain chat: what a scheduled run chose for it. A chat without a
 * scope gets everything that is switched on (see `AgentCapabilities`).
 */
export interface SessionScope {
  /** Told to the agent with the first prompt, before the skills (profile and team instructions). */
  instructions: string
  skillIds: Id[]
  serverIds: Id[]
  /** Tools of the servers that the agent does not get. */
  hiddenTools: { serverId: Id; tool: string }[]
}

export interface SessionScopeRepository {
  get(sessionId: Id): SessionScope | null
  /** Replaces the scope of the chat. */
  set(sessionId: Id, scope: SessionScope): void
}

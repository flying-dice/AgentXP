import type { PermissionOptionDto } from '@shared/models'
import type { ToolCallPatch } from './AgentSessionEvent'

export interface PermissionPrompt {
  /** The ACP session id. */
  sessionKey: string
  toolCallId: string
  toolCall: ToolCallPatch
  options: PermissionOptionDto[]
  /** Aborted when the turn is cancelled; the prompt should be dismissed. */
  signal: AbortSignal
}

export type PermissionDecision = { outcome: 'selected'; optionId: string } | { outcome: 'cancelled' }

/** Asks the user (or a policy) whether an agent may run a tool call. */
export interface PermissionPrompter {
  prompt(request: PermissionPrompt): Promise<PermissionDecision>
}

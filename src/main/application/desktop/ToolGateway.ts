import { randomUUID } from 'node:crypto'
import type { DesktopState, ToolPolicyDto } from '@shared/desktop'
import type { Id } from '@shared/models'
import { gateRawInput } from '@shared/gateReason'
import type { AgentSessionEvent } from '../../domain/agent/AgentSessionEvent'
import type { PermissionDecision, PermissionPrompt } from '../../domain/agent/PermissionPrompter'
import { ToolRefusedError, type ToolGate, type ToolGateRequest } from '../../domain/agent/ToolGate'
import type { PermissionChange } from '../PermissionBroker'
import { evaluateToolAccess } from './AppToolPolicy'

export interface ToolGatewayDeps {
  desktops: { stateOfSession(sessionId: Id): DesktopState | null; policy(): ToolPolicyDto }
  broker: {
    prompt(sessionId: Id, request: PermissionPrompt): Promise<PermissionDecision>
    observe(observer: (change: PermissionChange) => void): () => void
  }
  /** Agent events of a session (the gate shows its requests as tool calls in the chat). */
  events: { publish(sessionId: Id, event: AgentSessionEvent): void }
  now?: () => number
}

/** Prefix of the tool call ids of Agent7's own permission requests. */
export const GATE_TOOL_CALL_PREFIX = 'agent7-gate:'
/** How long an approval the agent's own prompt obtained also covers the gated call that follows it. */
const APPROVAL_TTL_MS = 60_000

const ALLOW_ONCE = { optionId: 'allow', name: 'Allow', kind: 'allow_once' } as const
const REJECT_ONCE = { optionId: 'reject', name: 'Deny', kind: 'reject_once' } as const

/**
 * Gate for every tool call that reaches a desktop, on both channels (ACP client requests and MCP tools):
 * paused / closed app / policy deny refuse the call, policy ask and "take control" ask the user.
 *
 * Agents such as Claude Code ask permission themselves before a write or a command. An allow the user
 * just gave to such a prompt is kept as an "approval" for the session and consumed by the next gated
 * call, so the user is not asked twice for one action. An agent that does not ask gets asked by us.
 */
export class ToolGateway {
  private readonly approvals = new Map<Id, number>()
  private readonly now: () => number

  constructor(private readonly deps: ToolGatewayDeps) {
    this.now = deps.now ?? Date.now
    deps.broker.observe((change) => this.rememberApproval(change))
  }

  /** A `ToolGate` bound to one session (ACP session ids are only unique per agent process). */
  forSession(sessionId: Id): ToolGate {
    return { check: (_acpSessionId, request) => this.authorize(sessionId, request) }
  }

  /** Resolves when the call may go on; rejects with `ToolRefusedError` otherwise. Sessions without a desktop are not gated. */
  async authorize(sessionId: Id, request: ToolGateRequest): Promise<void> {
    const state = this.deps.desktops.stateOfSession(sessionId)
    if (!state) return
    const access = evaluateToolAccess({ state, group: request.group, policy: this.deps.desktops.policy() })
    if (access.kind === 'refuse') throw new ToolRefusedError(access.message)
    if (access.kind === 'allow' || request.askUser === false) return
    if (this.consumeApproval(sessionId)) return
    if (!(await this.ask(sessionId, request.title, access.reason))) throw new ToolRefusedError(`The user declined: ${request.title}.`)
  }

  /** Puts an Agent7 permission request in front of the user; true when allowed. */
  async ask(sessionId: Id, title: string, reason: string): Promise<boolean> {
    const toolCallId = `${GATE_TOOL_CALL_PREFIX}${randomUUID()}`
    this.deps.events.publish(sessionId, {
      type: 'tool_call_created',
      toolCallId,
      title,
      toolKind: 'other',
      status: 'pending',
      rawInput: gateRawInput(reason),
      rawOutput: null,
      locations: [],
      contents: []
    })
    const decision = await this.deps.broker.prompt(sessionId, {
      sessionKey: String(sessionId),
      toolCallId,
      toolCall: {},
      options: [ALLOW_ONCE, REJECT_ONCE],
      signal: new AbortController().signal
    })
    const allowed = decision.outcome === 'selected' && decision.optionId === ALLOW_ONCE.optionId
    this.deps.events.publish(sessionId, {
      type: 'tool_call_updated',
      toolCallId,
      patch: { status: allowed ? 'completed' : 'failed' }
    })
    return allowed
  }

  private rememberApproval({ kind, request }: PermissionChange): void {
    if (kind !== 'resolved' || request.toolCallId.startsWith(GATE_TOOL_CALL_PREFIX)) return
    const chosen = request.options.find((o) => o.optionId === request.selectedOptionId)
    if (chosen?.kind.startsWith('allow')) this.approvals.set(request.sessionId, this.now())
  }

  private consumeApproval(sessionId: Id): boolean {
    const at = this.approvals.get(sessionId)
    this.approvals.delete(sessionId)
    return at !== undefined && this.now() - at <= APPROVAL_TTL_MS
  }
}

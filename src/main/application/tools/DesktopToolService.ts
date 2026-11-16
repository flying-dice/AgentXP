import type { ToolGroup } from '@shared/desktop'
import type { Id } from '@shared/models'
import type { DesktopStates } from '../desktop/ports'
import { PAUSED_MESSAGE } from '../desktop/AppToolPolicy'
import { ToolRefusedError, type GatedToolGroup, type ToolGateRequest } from '../../domain/agent/ToolGate'
import { TOOL_DEFS, isToolName, type ToolHandlers, type ToolName } from './catalog'
import { errorResult, type DesktopToolHost, type ToolContext, type ToolResult } from './types'

type AllHandlers = { [N in ToolName]: ToolHandlers<N>[N] }

export interface DesktopToolServiceDeps {
  states: DesktopStates
  /** The policy gate (closed app, deny, pause, ask). */
  gate: { authorize(sessionId: Id, request: ToolGateRequest): Promise<void> }
  handlers: AllHandlers
}

const SUMMARY_LENGTH = 80
const summarise = (name: string, args: unknown): string => {
  const text = JSON.stringify(args ?? {})
  return `${name} ${text.length > SUMMARY_LENGTH ? `${text.slice(0, SUMMARY_LENGTH)}...` : text}`
}

/**
 * Serves the agent's MCP tools: lists the groups the open apps enable, and for a call validates the
 * arguments, applies the gate (closed app -> an MCP error result with the "open the app" hint) and runs the handler.
 */
export class DesktopToolService implements DesktopToolHost {
  constructor(private readonly deps: DesktopToolServiceDeps) {}

  enabledGroups(desktopId: Id): ToolGroup[] {
    try {
      return [...this.deps.states.state(desktopId).tools]
    } catch {
      return ['shell']
    }
  }

  async call(context: ToolContext, tool: string, args: unknown): Promise<ToolResult> {
    if (!isToolName(tool)) return errorResult(`Unknown tool "${tool}".`)
    const parsed = TOOL_DEFS[tool].input.safeParse(args ?? {})
    if (!parsed.success) return errorResult(`Invalid arguments for ${tool}: ${parsed.error.message}`)
    try {
      await this.authorize(context, tool, parsed.data)
      const handler = this.deps.handlers[tool] as (args: unknown, context: ToolContext) => Promise<ToolResult>
      return await handler(parsed.data, context)
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : String(error))
    }
  }

  private async authorize(context: ToolContext, tool: ToolName, args: unknown): Promise<void> {
    const group = TOOL_DEFS[tool].group
    if (group === 'shell') {
      // desktop_state stays readable while paused so the agent can see why it is stopped.
      if (tool !== 'desktop_state' && this.deps.states.state(context.desktopId).paused) throw new ToolRefusedError(PAUSED_MESSAGE)
      return
    }
    await this.deps.gate.authorize(context.sessionId, { group: group as GatedToolGroup, title: summarise(tool, args) })
  }
}


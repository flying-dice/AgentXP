import type { ToolGroup } from '@shared/desktop'

/** JSON-RPC server-error code for a request the desktop refuses (closed app, policy, pause). */
export const TOOL_REFUSED_CODE = -32010

export type GatedToolGroup = Exclude<ToolGroup, 'shell'>

export interface ToolGateRequest {
  group: GatedToolGroup
  /** Shown to the user when the call needs approval, e.g. "Write src/a.ts". */
  title: string
  /** False for follow-up calls (terminal output, release...) that must not prompt again. Default true. */
  askUser?: boolean
}

/** The call is not allowed: its app is closed, the policy denies it, Agent7 is paused or the user said no. */
export class ToolRefusedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ToolRefusedError'
  }
}

/** Decides whether an agent may use a client-side tool (ACP fs/terminal requests). Rejects with `ToolRefusedError`. */
export interface ToolGate {
  check(acpSessionId: string, request: ToolGateRequest): Promise<void>
}

export const allowAllTools: ToolGate = { check: async () => {} }

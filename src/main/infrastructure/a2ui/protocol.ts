import type { ToolGroup } from '@shared/desktop'
import type { ToolResult } from '../../application/tools/types'

/**
 * Newline-delimited JSON between the MCP child process (one per agent chat) and the app.
 * Every request gets one response with the same `id`; a `subscribe` socket also receives pushes.
 */
export type BridgeRequest =
  /** Draw A2UI surfaces in the chat. A request without `type` is this one (the original protocol). */
  | { type?: 'a2ui'; id: string; sessionKey: string; messages: unknown[] }
  /** Which tool groups the open apps of the desktop enable. */
  | { type: 'tools'; id: string; desktopId: string }
  /** Run a desktop tool. */
  | { type: 'call'; id: string; sessionKey: string; desktopId: string; tool: string; args: unknown }
  /** Record an A2UI tool call (`phase: 'called'`) or its outcome (`'finished'`) in the Event Viewer's log; no other effect. */
  | { type: 'log'; id: string; sessionKey: string; tool: string; phase: 'called'; args: unknown }
  | { type: 'log'; id: string; sessionKey: string; tool: string; phase: 'finished'; result: ToolResult }
  /** Keep this socket open; the app pushes `toolsChanged` when the groups of the desktop change. */
  | { type: 'subscribe'; id: string; desktopId: string }

export interface BridgeResponse {
  id: string
  ok: boolean
  errors?: string[]
  groups?: ToolGroup[]
  result?: ToolResult
}

export interface BridgePush {
  type: 'toolsChanged'
  groups: ToolGroup[]
}

export const ENV_SOCKET = 'AGENT7_A2UI_SOCKET'
export const ENV_SESSION_KEY = 'AGENT7_SESSION_KEY'
export const ENV_DESKTOP_ID = 'AGENT7_DESKTOP_ID'
export const MCP_SERVER_NAME = 'agent7'


/** Newline-delimited JSON request from the MCP child process to the app. */
export interface BridgeRequest {
  id: string
  sessionKey: string
  messages: unknown[]
}

export interface BridgeResponse {
  id: string
  ok: boolean
  errors?: string[]
}


export const ENV_SOCKET = 'AGENT7_A2UI_SOCKET'
export const ENV_SESSION_KEY = 'AGENT7_SESSION_KEY'
export const MCP_SERVER_NAME = 'agent7-a2ui'


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


export const ENV_SOCKET = 'AGENTXP_A2UI_SOCKET'
export const ENV_SESSION_KEY = 'AGENTXP_SESSION_KEY'
export const MCP_SERVER_NAME = 'agentxp-a2ui'

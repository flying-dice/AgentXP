import type { AgentXPApi } from '../shared/ipc'

declare global {
  interface Window {
    agentxp: AgentXPApi
  }
}

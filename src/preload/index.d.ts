import type { AgentXpApi } from '../shared/ipc'

declare global {
  interface Window {
    agentxp: AgentXpApi
  }
}

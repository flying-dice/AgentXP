import { contextBridge } from 'electron'

// The typed bridge (AgentXpApi from @shared/ipc) is implemented in a later step.
contextBridge.exposeInMainWorld('agentxp', {})

import type { Agent7Api } from '../shared/ipc'

declare global {
  interface Window {
    agent7: Agent7Api
  }
}

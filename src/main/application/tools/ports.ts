import type { Id } from '@shared/models'
import type { Bounds } from '@shared/desktop'
import type { DesktopService } from '../desktop/DesktopService'

export interface PageElement {
  /** The number the agent passes as `ref`. */
  ref: number
  kind: 'link' | 'button' | 'input'
  label: string
  /** Links: the target address. Inputs: the current value. */
  detail?: string
}

export interface PageSnapshot {
  title: string
  url: string
  text: string
  elements: PageElement[]
}

export interface PageInfo {
  title: string
  url: string
}

/** Drives the page of a Browser window, addressed by its app window id. Rejects with a readable message. */
export interface BrowserDriver {
  navigate(windowId: Id, url: string): Promise<PageInfo>
  read(windowId: Id): Promise<PageSnapshot>
  /** PNG, base64. */
  screenshot(windowId: Id): Promise<string>
  click(windowId: Id, ref: number): Promise<PageInfo>
  type(windowId: Id, ref: number, text: string, submit: boolean): Promise<PageInfo>
  back(windowId: Id): Promise<PageInfo>
}

export interface CommandResult {
  exitCode: number | null
  timedOut: boolean
  output: string
}

/** Runs a shell command and waits for it. */
export interface CommandRunner {
  run(command: string, options: { cwd: string; timeoutMs: number; onOutput?: (text: string) => void }): Promise<CommandResult>
}

/** What the tools need from `DesktopService`. */
export type DesktopOps = Pick<
  DesktopService,
  'state' | 'openWindow' | 'closeWindow' | 'focusWindow' | 'updateView' | 'policy'
>

/** Asks an app window in the renderer (see `AppRequestBroker`). Rejects with a readable message on timeout. */
export interface AppRequests {
  request(desktopId: Id, windowId: Id, method: string, params: unknown, timeoutMs?: number): Promise<unknown>
}

/** Writes a file on behalf of the agent of a chat; the write is recorded as one of the chat's file changes. */
export interface AgentFileWriter {
  write(sessionId: Id, path: string, text: string): Promise<void>
}

export type { Bounds }

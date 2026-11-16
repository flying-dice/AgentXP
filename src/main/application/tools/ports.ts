import type { Id } from '@shared/models'
import type { Bounds } from '@shared/desktop'
import type { DesktopService } from '../desktop/DesktopService'

export interface PageInfo {
  title: string
  url: string
}

/** A box in CSS pixels, relative to the page area of the Browser window. */
export interface PageBox {
  x: number
  y: number
  width: number
  height: number
}

/** What an action did: where the page is now, the box it acted on (for the highlight ring) and a short note. */
export interface ActionResult extends PageInfo {
  box?: PageBox
  note?: string
}

export type ReadMode = 'text' | 'tree'

/** The whole readable document as lines (outline lines or text lines); the tool pages through them. */
export interface PageContent extends PageInfo {
  lines: string[]
  /** Scroll position and size of the page, e.g. `scrolled 0 of 5400 px, viewport 1280x720`. */
  viewport?: string
}

export interface FindQuery {
  text?: string
  role?: string
  name?: string
}

export interface FoundElement {
  ref: number
  description: string
  context: string
}

export interface WaitQuery {
  text?: string
  ref?: number
  timeoutMs: number
}

/** Called between the steps of an action and while waiting; throws when the user paused Agent7 or took control. */
export type BrowserGuard = () => void

export type ScrollDirection = 'up' | 'down' | 'left' | 'right' | 'top' | 'bottom'

/** Drives the page of a Browser window, addressed by its app window id. Rejects with a readable message. */
export interface BrowserDriver {
  navigate(windowId: Id, url: string): Promise<PageInfo>
  read(windowId: Id, mode: ReadMode): Promise<PageContent>
  find(windowId: Id, query: FindQuery): Promise<FoundElement[]>
  /** PNG, base64. */
  screenshot(windowId: Id): Promise<string>
  click(windowId: Id, ref: number, options: { button: 'left' | 'right' | 'middle'; double: boolean }, guard: BrowserGuard): Promise<ActionResult>
  /** `ref` absent: the element that has the focus. Selects its content, inserts the text, optionally presses Enter. */
  type(windowId: Id, ref: number | undefined, text: string, submit: boolean, guard: BrowserGuard): Promise<ActionResult>
  press(windowId: Id, keys: string, guard: BrowserGuard): Promise<ActionResult>
  scroll(windowId: Id, target: { ref?: number; direction: ScrollDirection; amount?: number }, guard: BrowserGuard): Promise<ActionResult>
  wait(windowId: Id, query: WaitQuery, guard: BrowserGuard): Promise<{ found: boolean; waitedMs: number }>
  select(windowId: Id, ref: number, option: string, guard: BrowserGuard): Promise<ActionResult>
  /** The role and accessible name of the element a ref points to (for the words of the "Agent is using this page" bar). */
  elementOf(windowId: Id, ref: number): Promise<{ role: string; name: string } | undefined>
  back(windowId: Id): Promise<PageInfo>
  forward(windowId: Id): Promise<PageInfo>
  reload(windowId: Id): Promise<PageInfo>
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

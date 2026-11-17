import {
  DEFAULT_TOOL_POLICY,
  SINGLETON_APPS,
  supportsAside,
  TOOL_GROUPS,
  enabledToolGroups,
  APP_DISPLAY_NAMES,
  type AppKind,
  type AppView,
  type AppWindowState,
  type Bounds,
  type DesktopState,
  type OpenWindowInput,
  type OpenedBy,
  type SurfaceStateDto,
  type PolicyDecision,
  type ToolPolicyDto,
  type WindowState
} from '@shared/desktop'
import { DEFAULT_BOUNDS, atLeastMinSize, SURFACE_FALLBACK_TITLE, asideCwd, initialView, numberDuplicateTitles, placeChatBesideBrowser, placeNewWindow, windowTitle } from '@shared/desktop-views'
import type { Id, SessionDto, SessionRole } from '@shared/models'
import { isSafeRef } from '@shared/review'
import { AGENT_HOME, parseVPath, type DriveDto, type RemovedProjectDto, type VPath } from '@shared/vfs'
import type { A2uiSurfaceRepository } from '../../domain/repositories/a2ui-surface-repository'
import type { AgentRepository } from '../../domain/repositories/agent-repository'
import type { AppWindowRecord, AppWindowRepository } from '../../domain/repositories/app-window-repository'
import type { DesktopRecord, DesktopRepository } from '../../domain/repositories/desktop-repository'
import type { StickyNoteRepository } from '../../domain/repositories/sticky-note-repository'
import type { SessionRepository } from '../../domain/repositories/session-repository'
import type { ToolPolicyRepository } from '../../domain/repositories/tool-policy-repository'
import { AppError, required } from '../errors'
import type { EventPublisher } from '../ports'
import type { DesktopStates } from './ports'

/** What `DesktopService` needs from the chat lifecycle (satisfied by `SessionService`). */
export interface ChatLifecycle {
  create(desktopId: Id, agentId: Id | undefined, cwd: VPath | undefined, role?: SessionRole, options?: { background?: boolean }): Promise<SessionDto>
  cancel(sessionId: Id): Promise<void>
  remove(sessionId: Id): Promise<void>
  /** Keeps a chat pane conversation as a chat (true), or says there is nothing to keep (false: no message yet). */
  keepAsChat(sessionId: Id): boolean
}

export interface DesktopServiceDeps {
  desktops: DesktopRepository
  windows: AppWindowRepository
  policies: ToolPolicyRepository
  agents: AgentRepository
  sessions: SessionRepository
  notes: StickyNoteRepository
  surfaces: Pick<A2uiSurfaceRepository, 'get' | 'list'>
  chats: ChatLifecycle
  /** The drives of a desktop (C: and the plugged-in projects). */
  drives: { list(desktopId: Id): DriveDto[]; removed(desktopId: Id): RemovedProjectDto[] }
  events: EventPublisher
  /** Clock in milliseconds (tests); defaults to `Date.now`. */
  now?: () => number
}

/** Asks the user in the chat whether its agent may go on ("Agent may open apps" set to Ask); true when allowed. */
export type OpenApproval = (sessionId: Id, title: string, reason: string) => Promise<boolean>

/** Why an agent's open is refused with "Agent may open apps" set to Never. */
export const OPEN_APPS_BLOCKED = 'Opening apps is blocked by the permission policy in Control Center.'

/** A window the agent opens does not take the focus from a window the user typed in during this long. */
export const TYPING_GRACE_MS = 2000

const BUSY_STATUSES: SessionDto['status'][] = ['working', 'awaiting_permission']
const PATH_APPS: readonly AppKind[] = ['explorer', 'notepad', 'code']

/** The size a window asks for (a surface's hint), completed with the app's default. */
function sizeOf(app: AppKind, size?: { width?: number; height?: number }): { width: number; height: number } | undefined {
  if (!size || (size.width === undefined && size.height === undefined)) return undefined
  const base = DEFAULT_BOUNDS[app]
  return { width: size.width ?? base.width, height: size.height ?? base.height }
}

/**
 * The source of truth for desktops. Window rows are persisted; focus and the transient view
 * (scroll, selection, caret) live in memory. Every change recomputes the `DesktopState` and
 * publishes `desktop.changed` when it differs from the last one published; the listeners
 * (owning window, AG-UI chats, MCP bridge) hang off that event.
 */
export class DesktopService implements DesktopStates {
  private readonly views = new Map<Id, AppView>()
  private readonly focus = new Map<Id, Id>()
  private readonly lastPublished = new Map<Id, string>()
  /** Windows the agent opened or touched behind the user's chat (taskbar flash), per desktop; cleared when focused. */
  private readonly attention = new Map<Id, Set<Id>>()
  /** Aside sessions being created, per window: two quick first messages share one session. */
  /** When the user last typed or clicked in a window, per desktop. */
  private readonly userActiveAt = new Map<Id, number>()
  private readonly asideStarts = new Map<Id, Promise<Id>>()
  /** The window whose chat pane the operator last focused or typed in, per desktop (`notePaneFocus`). */
  private readonly paneFocus = new Map<Id, Id>()
  /** Asks the user when "Agent may open apps" is set to Ask (the tool gateway, attached after construction). */
  private openApproval: OpenApproval | null = null

  constructor(private readonly deps: DesktopServiceDeps) {}

  /** The gateway is built after this service (it needs the desktop state), so it is attached here. */
  attachOpenApproval(ask: OpenApproval): void {
    this.openApproval = ask
  }

  // ---- desktops ----------------------------------------------------------------------------------
  // Creating, connecting and deleting desktops is the launcher's job (`LauncherService`).

  rename(id: Id, title: string): void {
    const trimmed = title.trim()
    if (!trimmed) throw new AppError('The desktop needs a title')
    this.record(id)
    this.deps.desktops.rename(id, trimmed)
    this.emit(id)
  }

  /** The user is working in a window of the desktop (the renderer reports typing and clicks). */
  noteUserActivity(desktopId: Id): void {
    this.userActiveAt.set(desktopId, (this.deps.now ?? Date.now)())
  }

  /**
   * The operator focused or typed in the chat pane of a window (`active`), or hid the pane (`!active`). While that window
   * has the focus, its pane's chat is the foreground chat (`foregroundSessionId`).
   */
  notePaneFocus(windowId: Id, active: boolean): void {
    const record = this.windowRecord(windowId)
    if (active) this.paneFocus.set(record.desktopId, windowId)
    else if (this.paneFocus.get(record.desktopId) === windowId) this.paneFocus.delete(record.desktopId)
  }

  /**
   * The foreground chat of a desktop (`docs/AGENT_PRESENCE.md`, rule 1): the session of the focused window. A Chat window
   * is its chat, a Code Review window its review session, and an app window whose chat pane the operator last focused or
   * typed in (`notePaneFocus`) is that pane's chat. Null when the focused window shows no chat (or nothing is focused).
   */
  foregroundSessionId(desktopId: Id): Id | null {
    if (!this.deps.desktops.get(desktopId)) return null
    const focused = this.focusedRecord(desktopId)
    if (!focused) return null
    if (focused.app === 'chat' || focused.app === 'code-review') return focused.sessionId
    if (focused.asideSessionId !== null && this.paneFocus.get(desktopId) === focused.id) return focused.asideSessionId
    return null
  }

  private userIsTyping(desktopId: Id): boolean {
    const at = this.userActiveAt.get(desktopId)
    return at !== undefined && (this.deps.now ?? Date.now)() - at < TYPING_GRACE_MS
  }

  /** The desktop is going away (its rows are deleted by the caller): drop what lives only in memory. */
  forget(id: Id): void {
    for (const window of this.deps.windows.list(id)) this.views.delete(window.id)
    this.focus.delete(id)
    this.paneFocus.delete(id)
    this.userActiveAt.delete(id)
    this.attention.delete(id)
    this.lastPublished.delete(id)
  }

  // ---- state -------------------------------------------------------------------------------------

  state(desktopId: Id): DesktopState {
    const desktop = this.record(desktopId)
    const records = this.deps.windows.list(desktopId)
    const windows = numberDuplicateTitles(records.map((r) => this.toWindowState(r)))
    return {
      desktopId,
      title: desktop.title,
      drives: this.deps.drives.list(desktopId),
      removedProjects: this.deps.drives.removed(desktopId),
      home: AGENT_HOME,
      focusedWindowId: this.focusedId(desktopId, windows),
      windows,
      tools: enabledToolGroups(windows.map((w) => w.app)),
      paused: desktop.paused,
      stoppedByPause: this.deps.desktops.stoppedChats(desktopId),
      userInControl: desktop.userInControl,
      policy: this.policy(),
      notes: this.deps.notes.list(desktopId),
      surfaces: this.surfacesOf(desktopId, records)
    }
  }

  stateOfSession(sessionId: Id): DesktopState | null {
    const desktopId = this.deps.sessions.get(sessionId)?.desktopId
    return desktopId == null ? null : this.state(desktopId)
  }

  /** The desktop state as the JSON text of the prompt's `agentxp://desktop/state` resource. */
  contextOfSession(sessionId: Id): string | null {
    const state = this.stateOfSession(sessionId)
    return state ? JSON.stringify(state) : null
  }

  windowsOf(desktopId: Id, app: AppKind): AppWindowState[] {
    return this.state(desktopId).windows.filter((w) => w.app === app)
  }

  // ---- windows -----------------------------------------------------------------------------------

  /**
   * Opens a window (or brings the existing one of a singleton app / chat forward). A new window is tiled
   * beside the focused window instead of over it (`placeNewWindow`) and comes to the front with the focus. When the user
   * typed in another window in the last 2 seconds, an agent's window comes to the front without the focus and its
   * taskbar button flashes until the user focuses it.
   */
  openWindow(input: OpenWindowInput, openedBy: OpenedBy = 'user', size?: { width?: number; height?: number }): AppWindowState {
    const desktopId = this.record(input.desktopId).id
    const focused = this.focusedRecord(desktopId)
    const typing = openedBy === 'agent' && focused !== null && this.userIsTyping(desktopId)
    const existing = this.existingWindow(input)
    if (existing) {
      this.focusWindow(existing.id, openedBy)
      if (input.path !== undefined && existing.app === 'code') this.showInCode(existing, input.path)
      if (input.topic !== undefined && existing.app === 'help') this.updateView(existing.id, { app: 'help', topic: input.topic })
      return this.windowState(existing.id)
    }
    const record = this.createWindow(desktopId, input, focused, openedBy, size)
    if (typing) {
      this.flag(desktopId, record.id) // on top (new rows are), the focus stays where the user types
    } else {
      this.focus.set(desktopId, record.id)
    }
    this.emit(desktopId)
    return this.windowState(record.id)
  }

  /**
   * "Agent may open apps" (Control Center): resolves when the agent of `sessionId` may open a window of `app`, else
   * rejects with a readable message (Never: blocked; Ask: the user is asked in the chat and may decline).
   */
  async assertMayOpen(sessionId: Id, app: AppKind): Promise<void> {
    const decision = this.policy().openApps
    const what = app === 'chat' ? 'a chat window' : `the ${APP_DISPLAY_NAMES[app]} app`
    if (decision === 'deny') throw new AppError(OPEN_APPS_BLOCKED)
    if (decision === 'allow') return
    const allowed = this.openApproval ? await this.openApproval(sessionId, `Open ${what}`, 'Agent may open apps is set to Ask in Control Center') : false
    if (!allowed) throw new AppError(`The user declined to open ${what}.`)
  }

  /**
   * The one path for every window an agent opens (`docs/AGENT_PRESENCE.md`, rule 2): checks "Agent may open apps"
   * (not for a window that is already there and only reused), then `placeOutputWindow`.
   */
  openOutputWindow(sessionId: Id, input: OpenWindowInput, size?: { width?: number; height?: number }): Promise<AppWindowState> {
    try {
      this.record(input.desktopId)
      // No question to ask: the window is placed at once (the caller, e.g. an A2UI render, sees it open when this returns).
      if (this.existingWindow(input) || this.policy().openApps === 'allow') return Promise.resolve(this.placeOutputWindow(input, size))
      return this.assertMayOpen(sessionId, input.app).then(() => this.placeOutputWindow(input, size))
    } catch (error) {
      return Promise.reject(error)
    }
  }

  /**
   * Opens a window for the agent without moving the operator's view: the new window goes just behind the focused
   * window (the focus stays), is marked `openedBy: 'agent'` (the glow) and its taskbar button flashes (`attention`)
   * until the operator focuses it. An existing singleton (or the chat's own window) is reused where it is, never
   * raised; a Code window is told to show `path`. With no window on the desktop the new window simply is the front one.
   */
  placeOutputWindow(input: OpenWindowInput, size?: { width?: number; height?: number }): AppWindowState {
    const desktopId = this.record(input.desktopId).id
    const focused = this.focusedRecord(desktopId)
    const existing = this.existingWindow(input)
    if (existing) {
      if (input.path !== undefined && existing.app === 'code') this.showInCode(existing, input.path)
      if (input.topic !== undefined && existing.app === 'help') this.updateView(existing.id, { app: 'help', topic: input.topic })
      if (focused && focused.id !== existing.id) this.flag(desktopId, existing.id)
      this.emit(desktopId)
      return this.windowState(existing.id)
    }
    const record = this.createWindow(desktopId, input, focused, 'agent', size)
    if (focused) {
      // New rows go on top: put the focused window back over it, so the new one sits right behind it.
      this.deps.windows.raise(focused.id)
      this.focus.set(desktopId, focused.id)
      this.flag(desktopId, record.id)
    } else {
      this.focus.set(desktopId, record.id)
    }
    this.emit(desktopId)
    return this.windowState(record.id)
  }

  /** Creates the window row: below the top bar and beside the focused window (`placeNewWindow`), with its first view. */
  private createWindow(desktopId: Id, input: OpenWindowInput, focused: AppWindowRecord | null, openedBy: OpenedBy, size?: { width?: number; height?: number }): AppWindowRecord {
    // New windows start below the top bar and beside the focused window (`placeNewWindow`).
    const parent = focused && focused.windowState === 'normal' ? { app: focused.app, bounds: focused.bounds } : null
    // A chat the user starts from the Browser opens in the half the Browser does not use (UX-120); the Browser is narrowed to
    // its half. Never for the agent: its window must not move the operator's.
    const beside = openedBy === 'user' && input.app === 'chat' && focused?.app === 'browser' && focused.windowState === 'normal' ? placeChatBesideBrowser(focused.bounds) : null
    if (beside?.browser) this.deps.windows.setBounds(focused!.id, beside.browser)
    const record = this.deps.windows.create({
      desktopId,
      app: input.app,
      bounds: beside?.chat ?? placeNewWindow(input.app, this.deps.windows.list(desktopId).length, parent, undefined, sizeOf(input.app, size)),
      windowState: 'normal',
      openedBy,
      ...this.subtypeOf(input)
    })
    if (input.app === 'help' && input.topic !== undefined) this.views.set(record.id, { app: 'help', topic: input.topic })
    // The file of a review is part of its first view, so the window never shows another file first (the Git list of Code).
    if (input.app === 'code-review' && input.selectedPath !== undefined) this.views.set(record.id, initialView({ app: 'code-review', path: record.path || undefined, sessionId: record.sessionId ?? undefined, baseRef: record.baseRef ?? undefined, selectedPath: input.selectedPath }))
    return record
  }

  closeWindow(windowId: Id): void {
    const record = this.windowRecord(windowId)
    this.deps.windows.remove(windowId)
    this.views.delete(windowId)
    this.attention.get(record.desktopId)?.delete(windowId)
    if (this.focus.get(record.desktopId) === windowId) this.focus.delete(record.desktopId)
    if (this.paneFocus.get(record.desktopId) === windowId) this.paneFocus.delete(record.desktopId)
    this.emit(record.desktopId)
    if (record.sessionId !== null) this.removeOwnedSession(record.sessionId)
    if (record.asideSessionId !== null) this.removeOwnedSession(record.asideSessionId)
  }

  /**
   * A review session lives and dies with its window (its comments go with it); a chat outlives its window. A chat pane
   * conversation is kept as a chat once the user wrote in it (Start > Recent chats opens it again); an empty one goes.
   */
  private removeOwnedSession(sessionId: Id): void {
    const session = this.deps.sessions.get(sessionId)
    if (!session || session.role === 'chat') return
    if (session.role === 'aside' && this.deps.chats.keepAsChat(sessionId)) return
    void this.deps.chats.remove(sessionId).catch(() => {})
  }

  // ---- surface windows ---------------------------------------------------------------------------

  /** True when the surface has a window. */
  hasSurfaceWindow(sessionId: Id, surfaceId: string): boolean {
    return this.deps.windows.findSurfaceWindow(sessionId, surfaceId) !== null
  }

  /**
   * Opens (or focuses) the window of a surface on its chat's desktop. Null when the chat has no desktop.
   * The agent's window follows the usual rules: placed beside the focused chat, in front, taskbar flash when the user is typing.
   */
  openSurfaceWindow(sessionId: Id, surfaceId: string, openedBy: OpenedBy, size?: { width?: number; height?: number }): AppWindowState | null {
    const desktopId = this.deps.sessions.get(sessionId)?.desktopId
    if (desktopId == null) return null
    return this.openWindow({ desktopId, app: 'surface', sessionId, surfaceId }, openedBy, size)
  }

  /**
   * The agent's own surface window (`a2ui_render` with target window): an output window, opened behind the focused
   * window when "Agent may open apps" allows it. Null when the chat has no desktop; rejects when the policy refuses.
   */
  async openAgentSurfaceWindow(sessionId: Id, surfaceId: string, size?: { width?: number; height?: number }): Promise<AppWindowState | null> {
    const desktopId = this.deps.sessions.get(sessionId)?.desktopId
    if (desktopId == null) return null
    return this.openOutputWindow(sessionId, { desktopId, app: 'surface', sessionId, surfaceId }, size)
  }

  /** Closes the window of a surface (the surface stays). False when it had none. */
  closeSurfaceWindow(sessionId: Id, surfaceId: string): boolean {
    const record = this.deps.windows.findSurfaceWindow(sessionId, surfaceId)
    if (!record) return false
    this.closeWindow(record.id)
    return true
  }

  /**
   * Brings a window to the front and focuses it. `by: 'agent'` does not take the focus from a window the user typed
   * in during the last 2 seconds: the window comes to the front and its taskbar button flashes until it is focused.
   */
  focusWindow(windowId: Id, by: OpenedBy = 'user'): void {
    const record = this.windowRecord(windowId)
    const focused = this.focusedRecord(record.desktopId)
    const keepFocus = by === 'agent' && focused !== null && focused.id !== windowId && this.userIsTyping(record.desktopId)
    if (record.windowState === 'minimized') this.deps.windows.setWindowState(windowId, 'normal')
    const top = this.deps.windows.list(record.desktopId).at(-1)
    if (top?.id !== windowId) this.deps.windows.raise(windowId)
    if (keepFocus) this.flag(record.desktopId, windowId)
    else {
      this.focus.set(record.desktopId, windowId)
      this.attention.get(record.desktopId)?.delete(windowId)
    }
    this.emit(record.desktopId)
  }

  /** "Show" and "Open": restores the window if needed, raises it and focuses it (always, whoever opened it). */
  raiseWindow(windowId: Id): void {
    this.focusWindow(windowId, 'user')
  }

  setBounds(windowId: Id, bounds: Bounds): void {
    const record = this.windowRecord(windowId)
    // Never smaller than the app's smallest size: an agent or a stale renderer cannot make a window too small to lay out.
    this.deps.windows.setBounds(windowId, atLeastMinSize(record.app, bounds))
    this.emit(record.desktopId)
  }

  setWindowState(windowId: Id, state: WindowState): void {
    const record = this.windowRecord(windowId)
    this.deps.windows.setWindowState(windowId, state)
    if (state === 'minimized' && this.focus.get(record.desktopId) === windowId) this.focus.delete(record.desktopId)
    this.emit(record.desktopId)
  }

  /** The window's view changed (the user acted, or an agent tool drove it). Path and url are persisted. */
  updateView(windowId: Id, view: AppView): void {
    const record = this.windowRecord(windowId)
    if (view.app !== record.app) throw new AppError(`Window ${windowId} is a ${record.app} window, not ${view.app}`)
    this.views.set(windowId, view)
    this.persistView(record, view)
    this.emit(record.desktopId)
  }

  // ---- control flags -----------------------------------------------------------------------------

  /**
   * Pausing cancels the turns that are running on this desktop and saves which chats they were (`stoppedByPause`), so
   * "Resume agents and continue" can carry each on. Lifting the pause this way forgets the list: the steps stay stopped.
   */
  async setPaused(desktopId: Id, paused: boolean): Promise<void> {
    this.record(desktopId)
    if (!paused) {
      this.deps.desktops.setPaused(desktopId, false)
      this.deps.desktops.setStoppedChats(desktopId, [])
      this.emit(desktopId)
      return
    }
    const busy = this.busyChats(desktopId)
    if (!this.deps.desktops.get(desktopId)?.paused) this.deps.desktops.setStoppedChats(desktopId, busy.map((s) => s.id))
    this.deps.desktops.setPaused(desktopId, true)
    this.emit(desktopId)
    await this.cancelAll(busy)
  }

  /** "Resume agents and continue": lifts the pause and returns the chats that Pause had stopped (the caller continues them). */
  async resumeAgents(desktopId: Id): Promise<Id[]> {
    this.record(desktopId)
    const stopped = this.deps.desktops.stoppedChats(desktopId).filter((id) => this.deps.sessions.get(id)?.desktopId === desktopId)
    await this.setPaused(desktopId, false)
    return stopped
  }

  /**
   * "You are in control" (the check box or the Browser's Take over): the running steps are cancelled at once, so the
   * agent stops reading, and every later action asks first. Handing control back only clears the flag.
   */
  async setUserInControl(desktopId: Id, on: boolean): Promise<void> {
    const wasOn = this.record(desktopId).userInControl
    this.deps.desktops.setUserInControl(desktopId, on)
    this.emit(desktopId)
    if (on && !wasOn) await this.cancelAll(this.busyChats(desktopId))
  }

  private busyChats(desktopId: Id): SessionDto[] {
    return this.deps.sessions.listByDesktop(desktopId).filter((s) => BUSY_STATUSES.includes(s.status))
  }

  private async cancelAll(sessions: readonly SessionDto[]): Promise<void> {
    await Promise.allSettled(sessions.map((s) => this.deps.chats.cancel(s.id)))
  }

  // ---- chats -------------------------------------------------------------------------------------

  async newChat(desktopId: Id, agentId?: Id, cwd?: VPath): Promise<AppWindowState> {
    const desktop = this.record(desktopId)
    // The window always opens: an agent that cannot start is reported in it, not by a missing window.
    const session = await this.deps.chats.create(desktopId, agentId ?? desktop.agentId ?? undefined, cwd, 'chat', { background: true })
    return this.openWindow({ desktopId, app: 'chat', sessionId: session.id })
  }

  /**
   * Starts a code review of `root` against `baseRef`: the review session first (its agent works in `root`), then the
   * Code Review window that owns it. Closing the window deletes the session and its comments.
   */
  async openReview(desktopId: Id, root: VPath, baseRef: string = 'HEAD', agentId?: Id, selectedPath?: string, openedBy: OpenedBy = 'user'): Promise<AppWindowState> {
    const desktop = this.record(desktopId)
    if (!isSafeRef(baseRef)) throw new AppError(`Not a valid git ref: ${baseRef}`)
    const session = await this.deps.chats.create(desktopId, agentId ?? desktop.agentId ?? undefined, root, 'review')
    try {
      const input: OpenWindowInput = { desktopId, app: 'code-review', sessionId: session.id, path: root, baseRef, selectedPath }
      // The agent's review_open checked "Agent may open apps" first; its window opens behind, like every agent window.
      return openedBy === 'agent' ? this.placeOutputWindow(input) : this.openWindow(input)
    } catch (error) {
      await this.deps.chats.remove(session.id).catch(() => {})
      throw error
    }
  }

  /**
   * The chat pane of a window: its `aside` session, created on the first call (the first message of the pane) with the
   * agent working on the window's drive (else at home). The session is owned by the window: `closeWindow` deletes it.
   */
  async openAside(desktopId: Id, windowId: Id, agentId?: Id): Promise<Id> {
    const desktop = this.record(desktopId)
    const record = this.windowRecord(windowId)
    if (record.desktopId !== desktopId) throw new AppError('The window belongs to another desktop')
    if (!supportsAside(record.app)) throw new AppError(`A ${APP_DISPLAY_NAMES[record.app]} window has no chat pane`)
    if (record.asideSessionId !== null && this.deps.sessions.get(record.asideSessionId)) return record.asideSessionId
    const starting = this.asideStarts.get(windowId)
    if (starting) return starting
    const start = this.startAside(desktop, record, agentId)
    this.asideStarts.set(windowId, start)
    try {
      return await start
    } finally {
      this.asideStarts.delete(windowId)
    }
  }

  private async startAside(desktop: DesktopRecord, record: AppWindowRecord, agentId?: Id): Promise<Id> {
    const session = await this.deps.chats.create(desktop.id, agentId ?? desktop.agentId ?? undefined, asideCwd(this.viewOf(record), AGENT_HOME), 'aside')
    if (!this.deps.windows.get(record.id)) {
      await this.deps.chats.remove(session.id).catch(() => {})
      throw new AppError('The window was closed')
    }
    this.deps.windows.setAside(record.id, session.id)
    this.emit(desktop.id)
    return session.id
  }

  /**
   * "New conversation": the window's pane starts blank. The conversation it had is kept as a chat (under Recent chats)
   * when the user wrote in it, else deleted.
   */
  async closeAside(windowId: Id): Promise<void> {
    const record = this.windowRecord(windowId)
    const sessionId = record.asideSessionId
    if (sessionId === null) return
    const session = this.deps.sessions.get(sessionId)
    if (session?.role === 'aside' && this.deps.chats.keepAsChat(sessionId)) this.deps.windows.clearAside(windowId)
    else if (session?.role === 'aside') await this.deps.chats.remove(sessionId)
    this.emit(record.desktopId)
  }

  /**
   * "Open as a chat window" with a conversation in the pane: the conversation moves to a Chat window of its own (it is
   * kept as a chat) and the pane starts blank. Null when the pane has nothing to move (the caller starts a new chat).
   */
  openAsideAsChat(windowId: Id): AppWindowState | null {
    const record = this.windowRecord(windowId)
    const sessionId = record.asideSessionId
    if (sessionId === null || this.deps.sessions.get(sessionId)?.role !== 'aside') return null
    if (!this.deps.chats.keepAsChat(sessionId)) return null
    this.deps.windows.clearAside(windowId)
    return this.openWindow({ desktopId: record.desktopId, app: 'chat', sessionId })
  }

  /** A chat was renamed: its window title follows. */
  onSessionChanged(session: SessionDto): void {
    if (session.desktopId != null) this.emit(session.desktopId)
  }

  /** A chat was deleted (its window row went with it); refresh the desktops that were showing it. */
  onSessionRemoved(): void {
    for (const desktopId of [...this.lastPublished.keys()]) {
      if (this.deps.desktops.get(desktopId)) this.emit(desktopId)
    }
  }

  // ---- policy ------------------------------------------------------------------------------------

  policy(): ToolPolicyDto {
    const stored = this.deps.policies.all()
    const groups = { ...DEFAULT_TOOL_POLICY.groups }
    for (const group of TOOL_GROUPS) {
      const decision = group === 'shell' ? undefined : stored[group]
      if (group !== 'shell' && decision) groups[group] = decision
    }
    return { groups, openApps: stored['openApps'] ?? DEFAULT_TOOL_POLICY.openApps }
  }

  setPolicy(policy: ToolPolicyDto): void {
    const entries: [string, PolicyDecision][] = [...Object.entries(policy.groups), ['openApps', policy.openApps]]
    for (const [key, decision] of entries) this.deps.policies.set(key, decision)
    // The permissions ride with the desktop state: every desktop that was shown tells its top bar.
    for (const id of [...this.lastPublished.keys()]) this.emit(id)
  }

  // ---- internals ---------------------------------------------------------------------------------

  private record(desktopId: Id): DesktopRecord {
    return required(this.deps.desktops.get(desktopId), 'Desktop')
  }

  private windowRecord(windowId: Id): AppWindowRecord {
    return required(this.deps.windows.get(windowId), 'Window')
  }

  private windowState(windowId: Id): AppWindowState {
    const record = this.windowRecord(windowId)
    return this.toWindowState(record)
  }

  private toWindowState(record: AppWindowRecord): AppWindowState {
    const view = this.viewOf(record)
    return {
      id: record.id,
      app: record.app,
      title: windowTitle(view, this.projectNameOf(record.desktopId, view)),
      bounds: record.bounds,
      windowState: record.windowState,
      openedBy: record.openedBy,
      ...(this.attention.get(record.desktopId)?.has(record.id) ? { attention: true } : {}),
      ...(record.asideSessionId !== null ? { asideSessionId: record.asideSessionId } : {}),
      view
    }
  }

  /** The name of the project a Code Review window shows: the label of its drive when it shows the whole drive. */
  private projectNameOf(desktopId: Id, view: AppView): string | undefined {
    if (view.app !== 'code-review') return undefined
    const parsed = parseVPath(view.root)
    if (!parsed || parsed.segments.length > 0) return undefined
    return this.deps.drives.list(desktopId).find((d) => d.letter === parsed.drive)?.label
  }

  /** Chat views follow the session title; the others are the live view or the persisted starting point. */
  private viewOf(record: AppWindowRecord): AppView {
    if (record.app === 'chat') {
      const session = record.sessionId === null ? null : this.deps.sessions.get(record.sessionId)
      return { app: 'chat', sessionId: record.sessionId ?? 0, title: session?.title ?? 'Chat' }
    }
    if (record.app === 'surface') {
      const { sessionId, surfaceId } = record.surface ?? { sessionId: 0, surfaceId: '' }
      const surface = this.deps.surfaces.get(sessionId, surfaceId)
      return { app: 'surface', sessionId, surfaceId, title: surface?.title ?? SURFACE_FALLBACK_TITLE }
    }
    const live = this.views.get(record.id)
    if (live) return live
    const view = initialView({
      app: record.app,
      path: record.path || undefined,
      url: record.url ?? undefined,
      sessionId: record.sessionId ?? undefined,
      baseRef: record.baseRef ?? undefined,
      roomId: record.app === 'team-chat' ? Number(record.path) : undefined
    }, 'Team Chat')
    this.views.set(record.id, view)
    return view
  }

  /** Every surface of the desktop's chats and where it is. */
  private surfacesOf(desktopId: Id, records: AppWindowRecord[]): SurfaceStateDto[] {
    const open = new Set(records.flatMap((r) => (r.surface ? [`${r.surface.sessionId}/${r.surface.surfaceId}`] : [])))
    return this.deps.sessions
      .listByDesktop(desktopId)
      .flatMap((s) => this.deps.surfaces.list(s.id))
      .map((s) => ({
        sessionId: s.sessionId,
        surfaceId: s.surfaceId,
        title: s.title ?? SURFACE_FALLBACK_TITLE,
        target: s.target,
        state:
          s.target === 'inline' || (s.target === 'sidebar' && !s.hidden) || open.has(`${s.sessionId}/${s.surfaceId}`) ? ('open' as const) : ('closed' as const)
      }))
  }

  private flag(desktopId: Id, windowId: Id): void {
    const set = this.attention.get(desktopId) ?? new Set<Id>()
    set.add(windowId)
    this.attention.set(desktopId, set)
  }

  /** The window that has focus (same rule as `state().focusedWindowId`), as its row. */
  private focusedRecord(desktopId: Id): AppWindowRecord | null {
    const records = this.deps.windows.list(desktopId)
    const stored = this.focus.get(desktopId)
    const visible = (r: AppWindowRecord): boolean => r.windowState !== 'minimized'
    return records.find((r) => r.id === stored && visible(r)) ?? records.findLast(visible) ?? null
  }

  private focusedId(desktopId: Id, windows: AppWindowState[]): Id | null {
    const stored = this.focus.get(desktopId)
    const valid = windows.find((w) => w.id === stored && w.windowState !== 'minimized')
    if (valid) return valid.id
    return windows.findLast((w) => w.windowState !== 'minimized')?.id ?? null
  }

  private existingWindow(input: OpenWindowInput): AppWindowRecord | null {
    if (input.app === 'chat') {
      if (input.sessionId === undefined) throw new AppError('A chat window needs a session')
      const open = this.deps.windows.findChatWindow(input.sessionId)
      if (open && open.desktopId !== input.desktopId) throw new AppError('The chat belongs to another desktop')
      return open
    }
    if (input.app === 'surface') {
      if (input.sessionId === undefined || input.surfaceId === undefined) throw new AppError('A surface window needs a session and a surface')
      return this.deps.windows.findSurfaceWindow(input.sessionId, input.surfaceId)
    }
    if (input.app === 'code-review') {
      if (input.sessionId === undefined) throw new AppError('A Code Review window needs its review session. Start a review with desktop.openReview.')
      const open = this.deps.windows.findChatWindow(input.sessionId)
      return open?.app === 'code-review' ? open : null
    }
    if (input.app === 'team-chat') return this.deps.windows.list(input.desktopId).find((w) => w.app === 'team-chat' && w.path === String(input.roomId)) ?? null
    if (!SINGLETON_APPS.includes(input.app)) return null
    return this.deps.windows.list(input.desktopId).find((w) => w.app === input.app) ?? null
  }

  private subtypeOf(input: OpenWindowInput): { sessionId?: Id; path?: string | null; url?: string; baseRef?: string; surface?: { sessionId: Id; surfaceId: string } } {
    if (input.app === 'chat') {
      const session = required(this.deps.sessions.get(input.sessionId ?? 0), 'Session')
      if (session.desktopId !== input.desktopId) throw new AppError('The chat belongs to another desktop')
      return { sessionId: session.id }
    }
    if (PATH_APPS.includes(input.app)) return { path: input.path ?? null }
    // A team chat window keeps its room number in the path column (no table of its own).
    if (input.app === 'team-chat') {
      if (input.roomId === undefined) throw new AppError('A Team Chat window needs a room')
      return { path: String(input.roomId) }
    }
    if (input.app === 'code-review') {
      const session = required(this.deps.sessions.get(input.sessionId ?? 0), 'Session')
      if (session.desktopId !== input.desktopId) throw new AppError('The review belongs to another desktop')
      if (session.role !== 'review') throw new AppError('A Code Review window needs a review session')
      const baseRef = input.baseRef ?? 'HEAD'
      if (!isSafeRef(baseRef)) throw new AppError(`Not a valid git ref: ${baseRef}`)
      return { sessionId: session.id, path: input.path ?? session.cwd, baseRef }
    }
    if (input.app === 'surface') {
      const { sessionId, surfaceId } = input
      const session = required(this.deps.sessions.get(sessionId ?? 0), 'Session')
      if (session.desktopId !== input.desktopId) throw new AppError('The chat belongs to another desktop')
      if (surfaceId === undefined || !this.deps.surfaces.get(session.id, surfaceId)) throw new AppError('The surface does not exist')
      return { surface: { sessionId: session.id, surfaceId } }
    }
    if (input.app === 'browser') return { url: input.url ?? 'about:blank' }
    return {}
  }

  /** An open Code window asked to show another file. */
  private showInCode(record: AppWindowRecord, path: string): void {
    const current = this.viewOf(record)
    if (current.app !== 'code') return
    const tabs = current.tabs.includes(path) ? current.tabs : [...current.tabs, path]
    this.updateView(record.id, { ...current, tabs, activePath: path })
  }

  private persistView(record: AppWindowRecord, view: AppView): void {
    const { windows } = this.deps
    switch (view.app) {
      case 'explorer':
        return windows.setPath(record.id, view.path || null) // '' (Computer) has no row
      case 'notepad':
      case 'paint':
      case 'wordpad':
      case 'diagrams':
        // The file comes back with the window after a restart.
        return windows.setPath(record.id, view.path)
      case 'code':
        return windows.setPath(record.id, view.activePath)
      case 'browser':
        return windows.setUrl(record.id, view.url)
      case 'code-review':
        windows.setPath(record.id, view.root)
        return windows.setBaseRef(record.id, view.baseRef)
      default:
        return
    }
  }

  /** Recomputes the state and publishes it when it changed (for changes that live outside this service, e.g. notes). */
  refresh(desktopId: Id): void {
    if (this.deps.desktops.get(desktopId)) this.emit(desktopId)
  }

  /** Publishes `desktop.changed` unless the state is what was published last. */
  private emit(desktopId: Id): void {
    const state = this.state(desktopId)
    const json = JSON.stringify(state)
    if (this.lastPublished.get(desktopId) === json) return
    this.lastPublished.set(desktopId, json)
    this.deps.events.publish('desktop.changed', state)
  }
}

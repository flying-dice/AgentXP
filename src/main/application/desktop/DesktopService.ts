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
import { DEFAULT_BOUNDS, SURFACE_FALLBACK_TITLE, asideCwd, initialView, placeWindow, windowTitle } from '@shared/desktop-views'
import type { Id, SessionDto, SessionRole } from '@shared/models'
import { isSafeRef } from '@shared/review'
import { AGENT_HOME, type DriveDto, type VPath } from '@shared/vfs'
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
  create(desktopId: Id, agentId: Id | undefined, cwd: VPath | undefined, role?: SessionRole): Promise<SessionDto>
  cancel(sessionId: Id): Promise<void>
  remove(sessionId: Id): Promise<void>
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
  drives: { list(desktopId: Id): DriveDto[] }
  events: EventPublisher
}

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
  private readonly asideStarts = new Map<Id, Promise<Id>>()

  constructor(private readonly deps: DesktopServiceDeps) {}

  // ---- desktops ----------------------------------------------------------------------------------
  // Creating, connecting and deleting desktops is the launcher's job (`LauncherService`).

  rename(id: Id, title: string): void {
    const trimmed = title.trim()
    if (!trimmed) throw new AppError('The desktop needs a title')
    this.record(id)
    this.deps.desktops.rename(id, trimmed)
    this.emit(id)
  }

  /** The desktop is going away (its rows are deleted by the caller): drop what lives only in memory. */
  forget(id: Id): void {
    for (const window of this.deps.windows.list(id)) this.views.delete(window.id)
    this.focus.delete(id)
    this.attention.delete(id)
    this.lastPublished.delete(id)
  }

  // ---- state -------------------------------------------------------------------------------------

  state(desktopId: Id): DesktopState {
    const desktop = this.record(desktopId)
    const records = this.deps.windows.list(desktopId)
    const windows = records.map((r) => this.toWindowState(r))
    return {
      desktopId,
      title: desktop.title,
      drives: this.deps.drives.list(desktopId),
      home: AGENT_HOME,
      focusedWindowId: this.focusedId(desktopId, windows),
      windows,
      tools: enabledToolGroups(windows.map((w) => w.app)),
      paused: desktop.paused,
      userInControl: desktop.userInControl,
      notes: this.deps.notes.list(desktopId),
      surfaces: this.surfacesOf(desktopId, records)
    }
  }

  stateOfSession(sessionId: Id): DesktopState | null {
    const desktopId = this.deps.sessions.get(sessionId)?.desktopId
    return desktopId == null ? null : this.state(desktopId)
  }

  /** The desktop state as the JSON text of the prompt's `agent7://desktop/state` resource. */
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
   * beside the focused chat instead of over it (`placeWindow`). A window the agent opens does not take
   * focus from a chat the user is working in: it opens behind that chat and its taskbar button flashes.
   */
  openWindow(input: OpenWindowInput, openedBy: OpenedBy = 'user', size?: { width?: number; height?: number }): AppWindowState {
    const desktopId = this.record(input.desktopId).id
    const focused = this.focusedRecord(desktopId)
    const typingChat = openedBy === 'agent' && focused?.app === 'chat' ? focused : null
    const existing = this.existingWindow(input)
    if (existing) {
      this.focusWindow(existing.id, openedBy)
      if (input.path !== undefined && existing.app === 'code') this.showInCode(existing, input.path)
      if (input.topic !== undefined && existing.app === 'help') this.updateView(existing.id, { app: 'help', topic: input.topic })
      return this.windowState(existing.id)
    }
    const avoid = focused?.app === 'chat' && focused.windowState === 'normal' ? focused.bounds : null
    const record = this.deps.windows.create({
      desktopId,
      app: input.app,
      bounds: placeWindow(input.app, this.deps.windows.list(desktopId).length, avoid, undefined, sizeOf(input.app, size)),
      windowState: 'normal',
      openedBy,
      ...this.subtypeOf(input)
    })
    if (input.app === 'help' && input.topic !== undefined) this.views.set(record.id, { app: 'help', topic: input.topic })
    if (typingChat) {
      this.deps.windows.raise(typingChat.id) // the new window goes behind the chat
      this.flag(desktopId, record.id)
    } else {
      this.focus.set(desktopId, record.id)
    }
    this.emit(desktopId)
    return this.windowState(record.id)
  }

  closeWindow(windowId: Id): void {
    const record = this.windowRecord(windowId)
    this.deps.windows.remove(windowId)
    this.views.delete(windowId)
    this.attention.get(record.desktopId)?.delete(windowId)
    if (this.focus.get(record.desktopId) === windowId) this.focus.delete(record.desktopId)
    this.emit(record.desktopId)
    if (record.sessionId !== null) this.removeOwnedSession(record.sessionId)
    if (record.asideSessionId !== null) this.removeOwnedSession(record.asideSessionId)
  }

  /** A review or aside session lives and dies with its window (its comments go with it); a chat outlives its window. */
  private removeOwnedSession(sessionId: Id): void {
    const session = this.deps.sessions.get(sessionId)
    if (!session || session.role === 'chat') return
    void this.deps.chats.remove(sessionId).catch(() => {})
  }

  // ---- surface windows ---------------------------------------------------------------------------

  /** True when the surface has a window. */
  hasSurfaceWindow(sessionId: Id, surfaceId: string): boolean {
    return this.deps.windows.findSurfaceWindow(sessionId, surfaceId) !== null
  }

  /**
   * Opens (or focuses) the window of a surface on its chat's desktop. Null when the chat has no desktop.
   * The agent's window follows the usual rules: placed beside the focused chat, behind it, taskbar flash.
   */
  openSurfaceWindow(sessionId: Id, surfaceId: string, openedBy: OpenedBy, size?: { width?: number; height?: number }): AppWindowState | null {
    const desktopId = this.deps.sessions.get(sessionId)?.desktopId
    if (desktopId == null) return null
    return this.openWindow({ desktopId, app: 'surface', sessionId, surfaceId }, openedBy, size)
  }

  /** Closes the window of a surface (the surface stays). False when it had none. */
  closeSurfaceWindow(sessionId: Id, surfaceId: string): boolean {
    const record = this.deps.windows.findSurfaceWindow(sessionId, surfaceId)
    if (!record) return false
    this.closeWindow(record.id)
    return true
  }

  /**
   * Brings a window to the front and focuses it. `by: 'agent'` never takes focus from a chat the user is
   * working in: the window is only flagged (its taskbar button flashes until the user focuses it).
   */
  focusWindow(windowId: Id, by: OpenedBy = 'user'): void {
    const record = this.windowRecord(windowId)
    const focused = this.focusedRecord(record.desktopId)
    if (by === 'agent' && focused?.app === 'chat' && focused.id !== windowId) {
      this.flag(record.desktopId, windowId)
      this.emit(record.desktopId)
      return
    }
    if (record.windowState === 'minimized') this.deps.windows.setWindowState(windowId, 'normal')
    const top = this.deps.windows.list(record.desktopId).at(-1)
    if (top?.id !== windowId) this.deps.windows.raise(windowId)
    this.focus.set(record.desktopId, windowId)
    this.attention.get(record.desktopId)?.delete(windowId)
    this.emit(record.desktopId)
  }

  setBounds(windowId: Id, bounds: Bounds): void {
    const record = this.windowRecord(windowId)
    this.deps.windows.setBounds(windowId, bounds)
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

  /** Pausing also cancels the turns that are running on this desktop. */
  async setPaused(desktopId: Id, paused: boolean): Promise<void> {
    this.record(desktopId)
    this.deps.desktops.setPaused(desktopId, paused)
    this.emit(desktopId)
    if (!paused) return
    const busy = this.deps.sessions.listByDesktop(desktopId).filter((s) => BUSY_STATUSES.includes(s.status))
    await Promise.allSettled(busy.map((s) => this.deps.chats.cancel(s.id)))
  }

  setUserInControl(desktopId: Id, on: boolean): void {
    this.record(desktopId)
    this.deps.desktops.setUserInControl(desktopId, on)
    this.emit(desktopId)
  }

  // ---- chats -------------------------------------------------------------------------------------

  async newChat(desktopId: Id, agentId?: Id, cwd?: VPath): Promise<AppWindowState> {
    const desktop = this.record(desktopId)
    const session = await this.deps.chats.create(desktopId, agentId ?? desktop.agentId ?? undefined, cwd)
    return this.openWindow({ desktopId, app: 'chat', sessionId: session.id })
  }

  /**
   * Starts a code review of `root` against `baseRef`: the review session first (its agent works in `root`), then the
   * Code Review window that owns it. Closing the window deletes the session and its comments.
   */
  async openReview(desktopId: Id, root: VPath, baseRef: string = 'HEAD', agentId?: Id): Promise<AppWindowState> {
    const desktop = this.record(desktopId)
    if (!isSafeRef(baseRef)) throw new AppError(`Not a valid git ref: ${baseRef}`)
    const session = await this.deps.chats.create(desktopId, agentId ?? desktop.agentId ?? undefined, root, 'review')
    try {
      return this.openWindow({ desktopId, app: 'code-review', sessionId: session.id, path: root, baseRef })
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

  /** "New conversation": the window's aside session is deleted; the window keeps its (now blank) pane. */
  async closeAside(windowId: Id): Promise<void> {
    const record = this.windowRecord(windowId)
    const sessionId = record.asideSessionId
    if (sessionId === null) return
    const session = this.deps.sessions.get(sessionId)
    if (session?.role === 'aside') await this.deps.chats.remove(sessionId)
    this.emit(record.desktopId)
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
      title: windowTitle(view),
      bounds: record.bounds,
      windowState: record.windowState,
      openedBy: record.openedBy,
      ...(this.attention.get(record.desktopId)?.has(record.id) ? { attention: true } : {}),
      ...(record.asideSessionId !== null ? { asideSessionId: record.asideSessionId } : {}),
      view
    }
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
      baseRef: record.baseRef ?? undefined
    })
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

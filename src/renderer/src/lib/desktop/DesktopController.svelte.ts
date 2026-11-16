import type { Agent7Api } from '@shared/ipc'
import type { Id, SessionDto } from '@shared/models'
import {
  DESKTOP_CONTEXT_DESCRIPTION,
  type AppView,
  type AppWindowState,
  type Bounds,
  type DesktopState,
  type OpenWindowInput,
  type ToolPolicyDto,
  type WindowState
} from '@shared/desktop'
import { SessionAgentStore } from '../agui/SessionAgentStore.svelte'
import type { DesktopHost } from '../apps/types'
import { isBusy } from '../app/sessionStatus'
import { SessionsStore } from '../stores/SessionsStore.svelte'
import { recentToolCalls, workingText, type ChatActivityInput, type FeedItem } from './activity'
import type { PendingApproval } from './approval'
import { KeyedDebouncer } from './debounce'
import { PermissionInbox } from './PermissionInbox.svelte'
import { nextFocus, raise } from './windowOrder'

export const VIEW_DEBOUNCE_MS = 300
const GLOW_MS = 1800

export interface ShellMessage {
  id: number
  text: string
  at: Date
}

const emptyState = (): DesktopState => ({
  desktopId: 0,
  title: '',
  folder: { id: 0, path: '', name: '' },
  focusedWindowId: null,
  windows: [],
  tools: ['shell'],
  paused: false,
  userInControl: false
})

/**
 * The renderer side of one desktop: the live `DesktopState` (pushed by main), the commands that change
 * it, optimistic local window geometry while dragging, and the shell UI state (Start menu, Action Center,
 * gadgets, selected icon). Implements `DesktopHost` for the apps.
 */
export class DesktopController implements DesktopHost {
  readonly api: Agent7Api
  readonly inbox: PermissionInbox
  readonly sessions: SessionsStore

  /** False until `desktop.current()` answered. */
  loaded = $state(false)
  /** The live desktop; null on first launch (no desktop yet). */
  current = $state.raw<DesktopState | null>(null)
  /** Window geometry while the user drags or resizes (committed on pointer up). */
  liveBounds = $state.raw<Record<Id, Bounds>>({})
  /** Windows the agent just opened (glow). */
  glowing = $state.raw<ReadonlySet<Id>>(new Set())
  messages = $state.raw<ShellMessage[]>([])
  policy = $state.raw<ToolPolicyDto | null>(null)

  // shell UI state
  startOpen = $state(false)
  actionCenterOpen = $state(false)
  gadgetsVisible = $state(true)
  reviewing = $state.raw<PendingApproval | null>(null)
  selectedIcon = $state<string | null>(null)

  get state(): DesktopState {
    return this.current ?? emptyState()
  }
  get needsDesktop(): boolean {
    return this.loaded && this.current === null
  }
  get focusedWindow(): AppWindowState | null {
    const id = this.state.focusedWindowId
    return this.state.windows.find((w) => w.id === id) ?? null
  }
  /** Sessions of this desktop's folder, newest first. */
  get chats(): SessionDto[] {
    return this.sessions.items.filter((s) => s.folderId === this.state.folder.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
  get activityInputs(): ChatActivityInput[] {
    return this.chats.flatMap((s): ChatActivityInput[] => {
      const store = this.inbox.stores.get(s.id)
      return store ? [{ sessionId: s.id, title: store.state.session.title || s.title, status: store.state.session.status === 'closed' ? s.status : store.state.session.status, updatedAt: s.updatedAt, toolCalls: store.state.toolCalls }] : []
    })
  }
  /** "Read src/a.ts", "Waiting for approval" or null (idle). */
  get working(): string | null {
    const inputs = this.activityInputs
    return workingText(inputs.length ? inputs : this.chats.map((s) => ({ sessionId: s.id, title: s.title, status: s.status, toolCalls: {} })))
  }
  get feed(): FeedItem[] {
    return recentToolCalls(this.activityInputs, 8)
  }
  /** Context use of the focused chat window (else the newest chat), as 0..1 plus the raw numbers. */
  get context(): { title: string | null; used: number; size: number; ratio: number } {
    const view = this.focusedWindow?.view
    const session = (view?.app === 'chat' ? this.sessions.byId(view.sessionId) : null) ?? this.chats[0] ?? null
    const store = session ? this.inbox.stores.get(session.id) : undefined
    const used = store?.state.session.contextUsed || session?.contextUsed || 0
    const size = store?.state.session.contextSize || session?.contextSize || 0
    return { title: session?.title ?? null, used, size, ratio: size > 0 ? Math.min(1, used / size) : 0 }
  }
  get busy(): boolean {
    return this.chats.some((s) => isBusy(s.status))
  }

  private readonly views: KeyedDebouncer<Id, AppView>
  private started = false
  private offs: (() => void)[] = []
  private messageId = 0
  private glowTimers = new Set<ReturnType<typeof setTimeout>>()

  constructor(api: Agent7Api, inbox?: PermissionInbox) {
    this.api = api
    // One AG-UI store per chat; the apps take theirs from `inbox.storeFor` (see lib/apps/sessionStores).
    this.inbox = inbox ?? new PermissionInbox((id) => this.createStore(id))
    this.sessions = new SessionsStore(api.sessions)
    this.views = new KeyedDebouncer(VIEW_DEBOUNCE_MS, (id, view) => void this.api.desktop.updateView(id, view).catch(() => {}))
  }

  private createStore(id: Id): SessionAgentStore {
    const store = new SessionAgentStore(id, this.api.agui)
    store.contextProvider = () => [{ description: DESKTOP_CONTEXT_DESCRIPTION, value: JSON.stringify(this.state) }]
    void store.connect()
    return store
  }

  /** Loads the desktop and follows the push events; returns the stop function. */
  async start(): Promise<void> {
    if (this.started) return
    this.started = true
    this.offs = [
      this.api.on('desktop.changed', (s) => this.apply(s)),
      this.sessions.start(this.api, (id) => this.inbox.unregister(id)),
      this.api.on('session.changed', () => this.syncStores()),
      this.api.on('status.message', ({ text }) => this.pushMessage(text))
    ]
    const [state] = await Promise.all([this.api.desktop.current(), this.sessions.load().catch(() => {})])
    if (state) this.apply(state)
    this.loaded = true
    this.syncStores()
  }

  dispose(): void {
    this.offs.forEach((off) => off())
    this.offs = []
    this.started = false
    this.views.dispose()
    this.glowTimers.forEach(clearTimeout)
    this.glowTimers.clear()
    for (const store of this.inbox.stores.values()) if (store instanceof SessionAgentStore) store.dispose()
  }

  /** Re-reads the desktop (after `desktop.create` on first run). */
  async reload(): Promise<void> {
    const state = await this.api.desktop.current()
    if (state) this.apply(state)
  }

  private apply(next: DesktopState): void {
    const known = new Set(this.current?.windows.map((w) => w.id))
    const fresh = this.current ? next.windows.filter((w) => !known.has(w.id) && w.openedBy === 'agent') : []
    if (fresh.length) this.glow(fresh.map((w) => w.id))
    this.current = next
    for (const id of Object.keys(this.liveBounds).map(Number)) {
      if (!next.windows.some((w) => w.id === id)) this.dropLive(id)
    }
    this.syncStores()
  }

  private glow(ids: Id[]): void {
    this.glowing = new Set([...this.glowing, ...ids])
    const timer = setTimeout(() => {
      this.glowTimers.delete(timer)
      const next = new Set(this.glowing)
      ids.forEach((id) => next.delete(id))
      this.glowing = next
    }, GLOW_MS)
    this.glowTimers.add(timer)
  }

  /** Opens a store for every chat that has a window or is busy, so approvals of hidden chats still show up. */
  syncStores(): void {
    for (const w of this.state.windows) if (w.view.app === 'chat' && w.view.sessionId) this.inbox.storeFor(w.view.sessionId)
    for (const s of this.chats) if (isBusy(s.status)) this.inbox.storeFor(s.id)
  }

  private pushMessage(text: string): void {
    this.messages = [{ id: ++this.messageId, text, at: new Date() }, ...this.messages].slice(0, 10)
  }

  // ---- windows ----------------------------------------------------------------------------------

  windowById(id: Id): AppWindowState | undefined {
    return this.state.windows.find((w) => w.id === id)
  }

  /** Optimistic local edit; the next `desktop.changed` replaces it. */
  private patch(id: Id, change: Partial<AppWindowState>, focus?: Id | null): void {
    if (!this.current) return
    const windows = this.current.windows.map((w) => (w.id === id ? { ...w, ...change } : w))
    this.current = { ...this.current, windows, ...(focus !== undefined ? { focusedWindowId: focus } : {}) }
  }

  async openApp(input: Omit<OpenWindowInput, 'desktopId'>): Promise<AppWindowState> {
    this.startOpen = false
    if (input.app === 'chat' && input.sessionId) {
      const existing = this.state.windows.find((w) => w.view.app === 'chat' && w.view.sessionId === input.sessionId)
      if (existing) {
        await this.focusWindow(existing.id)
        return existing
      }
    }
    return this.api.desktop.openWindow({ ...input, desktopId: this.state.desktopId })
  }

  async closeWindow(windowId: Id): Promise<void> {
    this.views.cancel(windowId)
    if (this.current) {
      const windows = this.current.windows.filter((w) => w.id !== windowId)
      this.current = { ...this.current, windows, focusedWindowId: this.current.focusedWindowId === windowId ? nextFocus(windows) : this.current.focusedWindowId }
    }
    await this.api.desktop.closeWindow(windowId)
  }

  async focusWindow(windowId: Id): Promise<void> {
    const w = this.windowById(windowId)
    if (!w) return
    this.startOpen = false
    this.actionCenterOpen = false
    if (this.current && (this.state.focusedWindowId !== windowId || w.windowState === 'minimized')) {
      this.current = {
        ...this.current,
        windows: raise(this.current.windows.map((x) => (x.id === windowId ? { ...x, windowState: x.windowState === 'minimized' ? 'normal' : x.windowState } : x)), windowId),
        focusedWindowId: windowId
      }
      await this.api.desktop.focusWindow(windowId)
    }
  }

  updateView(windowId: Id, view: AppView): void {
    this.views.push(windowId, view)
  }

  async setWindowState(windowId: Id, windowState: WindowState): Promise<void> {
    const w = this.windowById(windowId)
    if (!w) return
    if (windowState === 'minimized') {
      const rest = this.state.windows
      this.patch(windowId, { windowState }, this.state.focusedWindowId === windowId ? nextFocus(rest, windowId) : undefined)
    } else this.patch(windowId, { windowState })
    await this.api.desktop.setWindowState(windowId, windowState)
    if (windowState === 'minimized' && this.state.focusedWindowId === null) {
      // The backend may leave nothing focused after a minimise; hand focus to the topmost visible window.
      const next = nextFocus(this.state.windows, windowId)
      if (next !== null) await this.focusWindow(next)
    }
  }

  minimize = (id: Id): Promise<void> => this.setWindowState(id, 'minimized')
  maximize = (id: Id): Promise<void> => this.setWindowState(id, 'maximized')
  restore = (id: Id): Promise<void> => this.setWindowState(id, 'normal')

  /** Taskbar button click. */
  async toggleFromTaskbar(windowId: Id): Promise<void> {
    const w = this.windowById(windowId)
    if (!w) return
    if (w.windowState === 'minimized') await this.focusWindow(w.id)
    else if (this.state.focusedWindowId === windowId) await this.minimize(windowId)
    else await this.focusWindow(windowId)
  }

  // ---- drag / resize ----------------------------------------------------------------------------

  boundsOf(w: AppWindowState): Bounds {
    return this.liveBounds[w.id] ?? w.bounds
  }

  /** While dragging or resizing: only the local copy moves. */
  moveLocal(id: Id, bounds: Bounds): void {
    this.liveBounds = { ...this.liveBounds, [id]: bounds }
  }

  /** Pointer up: send the final bounds to main once. */
  async commitBounds(id: Id): Promise<void> {
    const bounds = this.liveBounds[id]
    if (!bounds) return
    this.patch(id, { bounds })
    this.dropLive(id)
    await this.api.desktop.setBounds(id, bounds)
  }

  cancelLocal(id: Id): void {
    this.dropLive(id)
  }

  private dropLive(id: Id): void {
    if (!(id in this.liveBounds)) return
    const next = { ...this.liveBounds }
    delete next[id]
    this.liveBounds = next
  }

  // ---- agent controls ---------------------------------------------------------------------------

  async togglePaused(): Promise<void> {
    const paused = !this.state.paused
    if (this.current) this.current = { ...this.current, paused }
    await this.api.desktop.setPaused(this.state.desktopId, paused)
  }

  async toggleUserInControl(): Promise<void> {
    const on = !this.state.userInControl
    if (this.current) this.current = { ...this.current, userInControl: on }
    await this.api.desktop.setUserInControl(this.state.desktopId, on)
  }

  async newChat(): Promise<AppWindowState> {
    this.startOpen = false
    return this.api.desktop.newChat(this.state.desktopId)
  }

  /** Shows the folder picker and creates a desktop (a new OS window in the real app). */
  async createDesktop(): Promise<void> {
    this.startOpen = false
    const created = await this.api.desktop.create()
    if (created && this.needsDesktop) await this.reload()
  }

  // ---- shell ui ---------------------------------------------------------------------------------

  toggleStart(): void {
    this.actionCenterOpen = false
    this.startOpen = !this.startOpen
  }

  toggleActionCenter(): void {
    this.startOpen = false
    this.actionCenterOpen = !this.actionCenterOpen
  }

  closePopups(): void {
    this.startOpen = false
    this.actionCenterOpen = false
  }

  /** Opens the UAC-style dialog for an approval (loads the policy for the reason line). */
  async review(approval: PendingApproval): Promise<void> {
    this.actionCenterOpen = false
    this.reviewing = approval
    try {
      this.policy = await this.api.desktop.policy()
    } catch {
      this.policy = null
    }
  }

  /** The reviewed approval answered (option id) or dismissed without answering (undefined). */
  async answerReview(optionId: string | null): Promise<void> {
    const approval = this.reviewing
    this.reviewing = null
    if (approval) await this.inbox.answer(approval, optionId)
  }
}

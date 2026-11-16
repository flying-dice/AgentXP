import type { Agent7Api } from '@shared/ipc'
import type { FolderDto, Id, SessionDto } from '@shared/models'
import {
  DESKTOP_CONTEXT_DESCRIPTION,
  supportsAside,
  type AppView,
  type AppWindowState,
  type AskChatRequest,
  type Bounds,
  type DesktopState,
  type OpenWindowInput,
  type ToolPolicyDto,
  type WindowState
} from '@shared/desktop'
import { parseVPath, type DriveDto, type DriveLetter, type VPath } from '@shared/vfs'
import { SessionAgentStore } from '../agui/SessionAgentStore.svelte'
import { askChatCwd, askChatDraft, askChatPrompt } from '../apps/askChat'
import { driveRoot, driveTitle } from '../apps/explorer/explorerModel'
import { chooseFolder } from '../apps/shared/chooseFolder'
import { addRemoved, ejectBalloonText, pluggedBalloonText, type RemovedProject } from './projectDrives'
import { showMessageBox } from '../kit/organisms/messageBox'
import type { DesktopHost } from '../apps/types'
import { DELETE_WARNING } from '../launcher/launcherModel'
import { isBusy } from '../app/sessionStatus'
import { SessionsStore } from '../stores/SessionsStore.svelte'
import { recentToolCalls, workingText, type ChatActivityInput, type FeedItem } from './activity'
import type { PendingApproval } from './approval'
import { DEFAULT_PANE, composeAppContext, localStore, paneKey, readPane, writePane, type PaneState } from './chatPane'
import { KeyedDebouncer } from './debounce'
import { PermissionInbox } from './PermissionInbox.svelte'
import { cycleTarget, nextFocus, raise } from './windowOrder'
import { ICON_HINT, takeIconHint } from './shellHints'
import { errorText } from '../apps/shared/listing'
import type { IconName } from '../kit/atoms/icons'

export const VIEW_DEBOUNCE_MS = 300
const GLOW_MS = 1800

/** A screen region the Snipping Tool is asking the user to pick; the overlay resolves it. */
export interface SnipOverlayState {
  mode: 'rect' | 'window'
  /** A rectangle in desktop page coordinates, or null when cancelled. */
  resolve: (region: Bounds | null) => void
}

/** The Win7 notification balloon over the tray ("Safe To Remove Hardware"). */
export interface Balloon {
  title: string
  text: string
  icon: 'usb-safe' | 'info'
}

export const BALLOON_MS = 9000

export interface ShellMessage {
  id: number
  text: string
  at: Date
}

const emptyState = (): DesktopState => ({
  desktopId: 0,
  title: '',
  drives: [],
  home: '',
  focusedWindowId: null,
  windows: [],
  tools: ['shell'],
  paused: false,
  userInControl: false,
  notes: [],
  surfaces: []
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
  /** The "New chat on..." dialog (pick the working drive). */
  newChatDialogOpen = $state(false)
  actionCenterOpen = $state(false)
  gadgetsVisible = $state(true)
  reviewing = $state.raw<PendingApproval | null>(null)
  selectedIcon = $state<string | null>(null)
  /** Set while the Snipping Tool waits for the user to pick a region (dims the desktop). */
  snipOverlay = $state.raw<SnipOverlayState | null>(null)
  /** Items in the Recycle Bin (the desktop icon shows full or empty). */
  recycleCount = $state(0)
  /** A USB drive that was just plugged in: the AutoPlay dialog shows it. */
  autoPlay = $state.raw<DriveDto | null>(null)
  /** Apps being opened (a desktop icon or Start menu was used): the busy cursor and a taskbar button show until the window exists. */
  opening = $state.raw<{ key: number; title: string; icon?: IconName }[]>([])
  private openingKey = 0
  /** Projects ejected from this desktop since it opened, newest first (at most three): Computer's "Recently removed". */
  recentlyRemoved = $state.raw<RemovedProject[]>([])
  /** The tray balloon, auto-hidden after `BALLOON_MS`. */
  balloon = $state.raw<Balloon | null>(null)
  /** The Safely Remove menu of the tray icon is open. */
  usbMenuOpen = $state(false)
  /** The chat pane of each window: collapsed or open, and its width (remembered in localStorage per window). */
  panes = $state.raw<Record<Id, PaneState>>({})
  /** A draft to put into a window's pane composer ("Ask chat..."); the composer reports it applied. */
  prefills = $state.raw<Record<Id, { id: number; text?: string }>>({})
  /** What each app registered for its pane (`setContext`); not reactive: it is read when a prompt is sent. */
  private readonly contexts = new Map<Id, () => Record<string, unknown> | null | undefined>()
  /** Which window an aside session belongs to, known as soon as `openAside` answers (before `desktop.changed`). */
  private readonly asideWindows = new Map<Id, Id>()
  private prefillSeq = 0

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
  /** Every session of this desktop (chats, reviewers and asides), newest first: what runs, what asks for approval. */
  get allSessions(): SessionDto[] {
    return this.sessions.items.filter((s) => s.desktopId === this.state.desktopId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
  /** Chats (role `chat`) of this desktop, newest first. */
  get chats(): SessionDto[] {
    return this.sessions.items.filter((s) => s.desktopId === this.state.desktopId && s.role === 'chat').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
  get activityInputs(): ChatActivityInput[] {
    return this.allSessions.flatMap((s): ChatActivityInput[] => {
      const store = this.inbox.stores.get(s.id)
      return store ? [{ sessionId: s.id, title: store.state.session.title || s.title, status: store.state.session.status === 'closed' ? s.status : store.state.session.status, updatedAt: s.updatedAt, toolCalls: store.state.toolCalls }] : []
    })
  }
  /** "Read src/a.ts", "Waiting for approval" or null (idle). */
  get working(): string | null {
    const inputs = this.activityInputs
    return workingText(inputs.length ? inputs : this.allSessions.map((s) => ({ sessionId: s.id, title: s.title, status: s.status, toolCalls: {} })))
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
    return this.allSessions.some((s) => isBusy(s.status))
  }

  private readonly views: KeyedDebouncer<Id, AppView>
  private started = false
  private offs: (() => void)[] = []
  private messageId = 0
  private glowTimers = new Set<ReturnType<typeof setTimeout>>()
  private balloonTimer: ReturnType<typeof setTimeout> | null = null

  constructor(api: Agent7Api, inbox?: PermissionInbox) {
    this.api = api
    // One AG-UI store per chat; the apps take theirs from `inbox.storeFor` (see lib/apps/sessionStores).
    this.inbox = inbox ?? new PermissionInbox((id) => this.createStore(id))
    this.sessions = new SessionsStore(api.sessions)
    this.views = new KeyedDebouncer(VIEW_DEBOUNCE_MS, (id, view) => void this.api.desktop.updateView(id, view).catch(() => {}))
  }

  private createStore(id: Id): SessionAgentStore {
    const store = new SessionAgentStore(id, this.api.agui)
    store.contextProvider = () => [{ description: DESKTOP_CONTEXT_DESCRIPTION, value: JSON.stringify(this.contextFor(id)) }]
    void store.connect()
    return store
  }

  /** Loads the desktop and follows the push events; returns the stop function. */
  async start(): Promise<void> {
    if (this.started) return
    this.started = true
    this.offs = [
      this.api.on('desktop.changed', (s) => this.apply(s)),
      this.sessions.start(this.api, (id) => this.forgetSession(id)),
      this.api.on('session.changed', () => this.syncStores()),
      this.api.on('status.message', ({ text }) => this.pushMessage(text)),
      this.api.on('recycle.changed', () => void this.refreshRecycle()),
      // A cleared transcript: the chat's store drops its messages and tool cards (nothing streams while idle).
      this.api.on('transcript.cleared', ({ sessionId }) => {
        const store = this.inbox.stores.get(sessionId)
        if (store instanceof SessionAgentStore) void store.reload()
      })
    ]
    const [state] = await Promise.all([this.api.desktop.current(), this.sessions.load().catch(() => {})])
    if (state) this.apply(state)
    this.loaded = true
    this.syncStores()
    void this.refreshRecycle()
  }

  dispose(): void {
    this.offs.forEach((off) => off())
    this.offs = []
    this.started = false
    this.views.dispose()
    this.snipOverlay?.resolve(null)
    this.glowTimers.forEach(clearTimeout)
    this.glowTimers.clear()
    if (this.balloonTimer) clearTimeout(this.balloonTimer)
    for (const store of this.inbox.stores.values()) if (store instanceof SessionAgentStore) store.dispose()
  }

  /** Counts the items in the Recycle Bin. */
  async refreshRecycle(): Promise<void> {
    if (!this.state.desktopId) return
    try {
      this.recycleCount = (await this.api.recycle.list(this.state.desktopId)).length
    } catch {
      this.recycleCount = 0
    }
  }

  /** Asks the user to pick a region on the dimmed desktop. Resolves null when cancelled (Esc). */
  pickSnipRegion(mode: SnipOverlayState['mode']): Promise<Bounds | null> {
    this.snipOverlay?.resolve(null)
    return new Promise((resolve) => {
      this.snipOverlay = {
        mode,
        resolve: (region) => {
          this.snipOverlay = null
          resolve(region)
        }
      }
    })
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
    // A drive that was not there before has just been plugged in (not on the first state).
    const plugged = this.current ? next.drives.find((d) => d.kind === 'removable' && !this.current?.drives.some((o) => o.letter === d.letter)) : undefined
    if (plugged) this.autoPlay = plugged
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
    for (const w of this.state.windows) {
      if (w.view.app === 'chat' && w.view.sessionId) this.inbox.storeFor(w.view.sessionId)
      // A review session's approvals (the reviewer may ask to read files) show up in the Action Center too.
      else if (w.view.app === 'code-review' && w.view.sessionId) this.inbox.storeFor(w.view.sessionId)
    }
    for (const s of this.allSessions) if (isBusy(s.status)) this.inbox.storeFor(s.id)
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

  async startChat(cwd: VPath): Promise<void> {
    await this.newChatIn(cwd)
  }

  /**
   * "Ask chat about this": the requesting window's chat pane opens (expanded) and gets the prompt: "Explain this" and
   * "Send selection to chat" send it, "Ask chat..." fills the composer so the user adds the question. A window without
   * a pane (or one that is gone) starts a full chat instead, like `askChatWindow`.
   */
  async askChat(request: AskChatRequest): Promise<void> {
    const window = this.state.windows.find((w) => w.id === request.windowId)
    if (!window || !supportsAside(window.app) || request.kind === 'window') return this.askChatWindow(request)
    this.setChatPane(window.id, true)
    if (request.kind === 'ask') {
      this.prefillPane(window.id, askChatDraft(request))
      return
    }
    const sessionId = await this.openAside(window.id)
    const store = this.inbox.storeFor(sessionId) as Partial<Pick<SessionAgentStore, 'send' | 'running' | 'whenConnected'>>
    await store.whenConnected?.()
    if (store.running) this.prefillPane(window.id, askChatPrompt(request)) // a turn is running: keep the text for the user to send
    else await store.send?.(askChatPrompt(request))
  }

  /** "Open in Chat window": a new chat on the drive of the request (or home) gets the prompt and its window opens. */
  async askChatWindow(request: AskChatRequest): Promise<void> {
    const cwd = askChatCwd(request, this.state.windows, this.state.home)
    const window = await this.newChatIn(cwd)
    if (window.view.app !== 'chat') return
    const store = this.inbox.storeFor(window.view.sessionId) as Partial<Pick<SessionAgentStore, 'send'>>
    await store.send?.(askChatPrompt(request))
  }

  /** A session was deleted (a chat, or the aside of a window): its store stops listening and the id is forgotten (ids are reused). */
  private forgetSession(id: Id): void {
    ;(this.inbox.stores.get(id) as { dispose?: () => void } | undefined)?.dispose?.()
    this.inbox.unregister(id)
    this.asideWindows.delete(id)
  }

  // ---- chat panes ---------------------------------------------------------------------------------

  setContext(windowId: Id, provider: (() => Record<string, unknown> | null | undefined) | null): void {
    if (provider) this.contexts.set(windowId, provider)
    else this.contexts.delete(windowId)
  }

  /** The app context of a window as the agent gets it (`composeAppContext`); a provider that throws counts as none. */
  contextOf(windowId: Id): Record<string, unknown> | null {
    const window = this.state.windows.find((w) => w.id === windowId)
    if (!window) return null
    let provided: Record<string, unknown> | null | undefined
    try {
      provided = this.contexts.get(windowId)?.()
    } catch {
      provided = null
    }
    return composeAppContext(window, provided)
  }

  /** What a session's runs carry as the desktop context: the state, plus `appContext` for the aside of a window. */
  private contextFor(sessionId: Id): DesktopState & { appContext?: Record<string, unknown> } {
    const windowId = this.asideWindows.get(sessionId) ?? this.state.windows.find((w) => w.asideSessionId === sessionId)?.id
    const appContext = windowId === undefined ? null : this.contextOf(windowId)
    return appContext ? { ...this.state, appContext } : this.state
  }

  /** The window's aside session (created on the first call, see `DesktopApi.openAside`). */
  async openAside(windowId: Id): Promise<Id> {
    const id = await this.api.desktop.openAside(this.state.desktopId, windowId)
    this.asideWindows.set(id, windowId)
    return id
  }

  /** "New conversation": the aside session is deleted (its window keeps the pane, blank). */
  async closeAside(windowId: Id): Promise<void> {
    await this.api.desktop.closeAside(windowId)
  }

  paneOf(windowId: Id): PaneState {
    return this.panes[windowId] ?? DEFAULT_PANE
  }

  chatPaneOpen(windowId: Id): boolean {
    return !this.paneOf(windowId).collapsed
  }

  /** Reads the remembered pane state of a window (call once when its frame appears). */
  loadPane(windowId: Id): void {
    if (windowId in this.panes) return
    this.panes = { ...this.panes, [windowId]: readPane(localStore(), paneKey(this.state.desktopId, windowId)) }
  }

  private patchPane(windowId: Id, patch: Partial<PaneState>): void {
    this.loadPane(windowId)
    const next = { ...this.paneOf(windowId), ...patch }
    this.panes = { ...this.panes, [windowId]: next }
    writePane(localStore(), paneKey(this.state.desktopId, windowId), next)
  }

  /** Shows or hides a window's chat pane; showing it focuses its composer. Windows without a pane ignore it. */
  setChatPane(windowId: Id, open: boolean): void {
    const window = this.state.windows.find((w) => w.id === windowId)
    if (!window || !supportsAside(window.app)) return
    this.patchPane(windowId, { collapsed: !open })
    if (open) this.focusPane(windowId)
  }

  toggleChatPane(windowId: Id): void {
    this.loadPane(windowId)
    this.setChatPane(windowId, !this.chatPaneOpen(windowId))
  }

  setPaneWidth(windowId: Id, width: number): void {
    this.patchPane(windowId, { width })
  }

  /** Puts the cursor in the pane's composer. */
  focusPane(windowId: Id): void {
    this.prefills = { ...this.prefills, [windowId]: { id: ++this.prefillSeq } }
  }

  /** Fills the pane's composer with a draft and focuses it. */
  prefillPane(windowId: Id, text: string): void {
    this.prefills = { ...this.prefills, [windowId]: { id: ++this.prefillSeq, text } }
  }

  /** The composer applied a prefill: forget it, so a remount does not apply it again. */
  prefillApplied(windowId: Id, id: number): void {
    if (this.prefills[windowId]?.id !== id) return
    const { [windowId]: _applied, ...rest } = this.prefills
    this.prefills = rest
  }

  /** Starts a chat; `cwd` (a VPath on a plugged-in drive) is the agent's working directory, default its home on C:. */
  async newChatIn(cwd: VPath): Promise<AppWindowState> {
    this.startOpen = false
    return this.api.desktop.newChat(this.state.desktopId, undefined, cwd)
  }

  /** Disconnect: closes this desktop's window. The agents and their turns keep running; reconnect from the launcher. */
  async disconnect(): Promise<void> {
    this.startOpen = false
    await this.api.window.close()
  }

  /** Asks, then deletes this desktop (its window closes with it). Returns whether it was deleted. */
  async deleteDesktop(): Promise<boolean> {
    this.startOpen = false
    const answer = await showMessageBox({
      text: `Delete the desktop '${this.state.title}'?\n\n${DELETE_WARNING}`,
      caption: 'Agent7 Desktop Connection',
      buttons: 'YesNo',
      icon: 'warning',
      defaultButton: 1
    })
    if (answer !== 'yes') return false
    await this.api.launcher.remove(this.state.desktopId)
    return true
  }

  /** Shows the launcher window (Start menu: Agent7 Desktops...). */
  async showLauncher(): Promise<void> {
    this.startOpen = false
    await this.api.launcher.show()
  }

  // ---- drives -------------------------------------------------------------------------------------

  /** Chats that still run and have their working directory on the drive. */
  chatsOnDrive(letter: DriveLetter): SessionDto[] {
    return this.allSessions.filter((s) => s.status !== 'closed' && parseVPath(s.cwd)?.drive === letter)
  }

  /** Safely Remove: warns when chats work on the drive, ejects it, then shows the balloon. */
  async ejectDrive(letter: DriveLetter): Promise<void> {
    const drive = this.state.drives.find((d) => d.letter === letter)
    if (!drive || drive.kind === 'system') return
    this.usbMenuOpen = false
    this.startOpen = false
    const title = driveTitle(drive)
    const working = this.chatsOnDrive(letter)
    if (working.length > 0) {
      const names = working.map((s) => `"${s.title || 'New chat'}"`).slice(0, 3).join(', ')
      const more = working.length > 3 ? ` and ${working.length - 3} more` : ''
      const answer = await showMessageBox({
        text: `${working.length === 1 ? 'A chat works' : `${working.length} chats work`} on '${title}': ${names}${more}.\n\nIf you remove it now, the agent loses access to its files at once and every file or terminal request on it is refused.\n\nDo you want to remove it anyway?`,
        caption: 'Safely Remove Hardware',
        buttons: 'YesNo',
        icon: 'warning',
        defaultButton: 1
      })
      if (answer !== 'yes') return
    }
    await this.api.drives.eject(this.state.desktopId, letter)
    if (this.current) this.current = { ...this.current, drives: this.current.drives.filter((d) => d.letter !== letter) }
    if (drive.folderId !== null) this.recentlyRemoved = addRemoved(this.recentlyRemoved, { folderId: drive.folderId, label: drive.label })
    this.showBalloon({ title: 'Safe To Remove Hardware', text: ejectBalloonText(title), icon: 'usb-safe' })
  }

  /** Plug in a project: the Browse For Folder dialog, then the drive. Resolves the drive (also when it was plugged in already), or null when cancelled or it failed. */
  async plugInProject(): Promise<DriveDto | null> {
    this.startOpen = false
    let folder: FolderDto | null
    try {
      folder = await chooseFolder(this.api, 'plug-in')
    } catch (error) {
      await this.plugInFailed('the folder', error)
      return null
    }
    return folder ? this.plugInFolder(folder) : null
  }

  /** Plugs a recently removed project in again, without the dialog. */
  async plugInAgain(folderId: Id): Promise<DriveDto | null> {
    const folder = (await this.api.folders.list()).find((f) => f.id === folderId)
    if (!folder) {
      this.recentlyRemoved = this.recentlyRemoved.filter((r) => r.folderId !== folderId)
      return null
    }
    return this.plugInFolder(folder)
  }

  private async plugInFolder(folder: FolderDto): Promise<DriveDto | null> {
    const already = this.state.drives.find((d) => d.kind === 'removable' && d.folderId === folder.id)
    if (already) {
      await showMessageBox({ text: `${folder.name} is already plugged in as drive ${already.letter}:.`, caption: 'Plug in a project', buttons: 'OK', icon: 'information' })
      return already
    }
    try {
      const drive = await this.api.drives.plugIn(this.state.desktopId, folder.id)
      if (!drive) return null
      this.recentlyRemoved = this.recentlyRemoved.filter((r) => r.folderId !== folder.id)
      this.showBalloon({ title: 'Project plugged in', text: pluggedBalloonText(driveTitle(drive)), icon: 'info' })
      return drive
    } catch (error) {
      await this.plugInFailed(folder.name, error)
      return null
    }
  }

  private async plugInFailed(name: string, error: unknown): Promise<void> {
    const reason = error instanceof Error ? error.message : String(error)
    await showMessageBox({ text: `Could not plug in '${name}'. ${reason}`, caption: 'Plug in a project', buttons: 'OK', icon: 'error' })
  }

  /** Start > Eject a project...: opens the tray list of plugged-in projects, or says that there is none. */
  openEjectList(): void {
    this.startOpen = false
    if (this.state.drives.some((d) => d.kind === 'removable')) this.usbMenuOpen = true
    else this.showBalloon({ title: 'Safely Remove Hardware', text: 'No project is plugged in.', icon: 'info' })
  }

  showBalloon(balloon: Balloon): void {
    this.balloon = balloon
    if (this.balloonTimer) clearTimeout(this.balloonTimer)
    this.balloonTimer = setTimeout(() => (this.balloon = null), BALLOON_MS)
  }

  dismissBalloon(): void {
    if (this.balloonTimer) clearTimeout(this.balloonTimer)
    this.balloon = null
  }

  /** AutoPlay choices for the drive that was just plugged in. */
  async autoPlayChoose(choice: 'open' | 'chat' | 'none'): Promise<void> {
    const drive = this.autoPlay
    this.autoPlay = null
    if (!drive || choice === 'none') return
    const root = driveRoot(drive.letter)
    if (choice === 'open') await this.openApp({ app: 'explorer', path: root })
    else await this.newChatIn(root)
  }

  // ---- shell ui ---------------------------------------------------------------------------------

  /**
   * Runs `work` (opens an app) with feedback: `opening` shows the busy cursor and a taskbar button at once. When it fails
   * the user sees a message box, never nothing. Resolves false after a failure.
   */
  async openWithFeedback(title: string, icon: IconName | undefined, work: () => Promise<unknown>): Promise<boolean> {
    const key = ++this.openingKey
    this.opening = [...this.opening, { key, title, icon }]
    try {
      await work()
      return true
    } catch (error) {
      await showMessageBox({ text: `Could not open ${title}. ${errorText(error)}`, caption: title, buttons: 'OK', icon: 'error' })
      return false
    } finally {
      this.opening = this.opening.filter((o) => o.key !== key)
    }
  }

  /** The balloon "Double-click an icon to open it." the first time a user sees a desktop. */
  showIconHint(storage: Pick<Storage, 'getItem' | 'setItem'> | null = localStore()): void {
    if (this.needsDesktop || !takeIconHint(storage)) return
    this.showBalloon({ ...ICON_HINT, icon: 'info' })
  }

  /** Alt+Tab (`1`) and Alt+Shift+Tab (`-1`): switch to the next or previous window in recent order. */
  async cycleWindows(direction: 1 | -1): Promise<void> {
    const id = cycleTarget(this.state.windows, this.state.focusedWindowId, direction)
    if (id !== null) await this.focusWindow(id)
  }

  /** Enter or Space on a taskbar button: brings the window forward (restores it) and never minimizes it. */
  async activateFromTaskbar(windowId: Id): Promise<void> {
    if (this.windowById(windowId)) await this.focusWindow(windowId)
  }

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
    this.usbMenuOpen = false
  }

  /**
   * Starts a code review (Start menu, the Code app's "Review changes"): the review session and its Code Review window.
   * `root` defaults to the folder of the Code window the user is in, else the first plugged-in drive, else the agent's home.
   */
  async openReview(root?: VPath, baseRef?: string): Promise<AppWindowState> {
    this.startOpen = false
    return this.api.desktop.openReview(this.state.desktopId, root ?? this.defaultReviewRoot(), baseRef)
  }

  defaultReviewRoot(): VPath {
    const code = this.state.windows.find((w) => w.view.app === 'code' && w.id === this.state.focusedWindowId) ?? this.state.windows.find((w) => w.view.app === 'code')
    const active = code?.view.app === 'code' ? code.view.activePath : null
    const drive = (active && parseVPath(active)?.drive) || this.state.drives.find((d) => d.kind === 'removable')?.letter
    return drive ? driveRoot(drive) : this.state.home
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

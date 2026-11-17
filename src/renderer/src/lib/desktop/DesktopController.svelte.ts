import type { AgentXPApi } from '@shared/ipc'
import type { FolderDto, Id, SessionDto } from '@shared/models'
import type { RoomStateDto } from '@shared/teams'
import {
  DESKTOP_CONTEXT_DESCRIPTION,
  windowHasAside,
  type AppKind,
  type AppView,
  type AppWindowState,
  type AskChatRequest,
  type Bounds,
  type ControlCentrePage,
  type DesktopState,
  type OpenWindowInput,
  type TaskManagerTab,
  type ToolPolicyDto,
  type WindowState
} from '@shared/desktop'
import { normaliseVPath, parseVPath, REMOVED_PROJECTS_KEPT, type DriveDto, type DriveLetter, type RemovedProjectDto, type VPath } from '@shared/vfs'
import { SessionAgentStore } from '../agui/SessionAgentStore.svelte'
import { chatTitleLabels } from '../app/chatTitles'
import { askChatCwd, askChatDraft, askChatPrompt } from '../apps/askChat'
import { driveRoot, driveTitle, projectRootOf } from '../apps/explorer/explorerModel'
import { chooseFolder } from '../apps/shared/chooseFolder'
import { runningToolTitle } from '../apps/agent-manager/processRows'
import { closeChatBalloon, isTurnRunning } from './closeChat'
import { addRemoved, EJECT_BALLOON_TITLE, ejectBalloonText, pluggedBalloonText, projectQuoted, removeProjectText, RECENTLY_REMOVED_MAX, type RemovedProject } from './projectDrives'
import { showMessageBox } from '../kit/organisms/messageBox'
import type { DesktopHost } from '../apps/types'
import { DELETE_WARNING } from '../launcher/launcherModel'
import { effectiveStatus, isBusy } from '../app/sessionStatus'
import { CONTINUE_TEXT, NOTHING_STOPPED_NOTICE, resumedLine, stoppedLine } from '../app/session/resumeNote'
import { SessionsStore } from '../stores/SessionsStore.svelte'
import { feedTarget, recentToolCalls, workingChatId, workingText, type ChatActivityInput, type FeedItem } from './activity'
import type { ToolShowTarget } from '../app/session/toolShowTarget'
import { nextApproval, waitingLinkText, type PendingApproval } from './approval'
import { DEFAULT_PANE, composeAppContext, localStore, paneKey, readPane, writePane, type PaneState } from './chatPane'
import { KeyedDebouncer } from './debounce'
import { PermissionInbox } from './PermissionInbox.svelte'
import { helpBounds, placeBesideOpener, widenBounds, type BarRect } from './geometry'
import { cycleTarget, nextFocus, raise, taskbarAction, windowsToMoveBelowBar } from './windowOrder'
import { ICON_HINT, PROJECT_HINT, takeIconHint, takeProjectHint } from './shellHints'
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

/** The WinXP notification balloon over the tray ("Project removed" after an eject). */
export interface Balloon {
  title: string
  text: string
  icon: 'usb-safe' | 'info'
  /** A button under the text; clicking it runs `run`, waits for it, and then hides the balloon. */
  action?: { label: string; run: () => void | Promise<unknown> }
  /** How long it stays when the pointer is not on it, in ms (`BALLOON_MS` when absent). `null`: until the user closes it or uses its button. */
  stayMs?: number | null
  /** The balloon is dismissed when this app is opened by any route (its message is done then). */
  closesWith?: AppKind
}

export const BALLOON_MS = 9000
/** A balloon that closes a chat's window or tells a first-time user what to do next stays long enough to read (UX-179, UX-180). */
export const BALLOON_LONG_MS = 15000
/** After the pointer leaves a balloon that it held, the balloon stays this long. */
export const BALLOON_LEAVE_MS = 2000

export interface ShellMessage {
  id: number
  text: string
  at: Date
}

/** How long "Resumed. Nothing was stopped." stands in for "Idle" on the bar. */
export const NOTICE_MS = 6000

/** `noteUserActivity` tells main at most this often (milliseconds). */
const ACTIVITY_THROTTLE_MS = 500

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
 * infopanels, selected icon). Implements `DesktopHost` for the apps.
 */
export class DesktopController implements DesktopHost {
  readonly api: AgentXPApi
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
  /** A short line that stands in for "Idle" on the top bar ("Resumed. Nothing was stopped."); null when there is none. */
  notice = $state<string | null>(null)

  // shell UI state
  startOpen = $state(false)
  /** The "New chat on..." dialog (pick the working drive). */
  newChatDialogOpen = $state(false)
  /** The drive letter of the project the last chat was started in; the New chat dialog preselects it. */
  lastChatDrive = $state<string | null>(null)
  /** The "Code Review" dialog (pick the project and the ref), with the drive root to preselect. */
  reviewDialog = $state.raw<{ root?: VPath } | null>(null)
  actionCenterOpen = $state(false)
  infopanelsVisible = $state(true)
  reviewing = $state.raw<PendingApproval | null>(null)
  /** The sessions of team chat room members: the member's name and its room, so an approval says who asks and where. */
  roomMembers = $state.raw<ReadonlyMap<Id, { member: string; room: string; roomId: Id }>>(new Map())
  /** Requests whose popup the user closed with "Not now": they stay in the Action Center and in the chat's waiting line. */
  private dismissed = $state.raw<ReadonlySet<string>>(new Set())
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
  /** Plug-ins the user started (Plug in a project, Plug in again): they open Explorer, so AutoPlay stays away. */
  private chosenPlugIns = 0
  private lastActivityAt = 0
  /** The tray balloon, auto-hidden after `BALLOON_MS`. */
  balloon = $state.raw<Balloon | null>(null)
  /** The Safely Remove menu of the tray icon is open. */
  usbMenuOpen = $state(false)
  /** The chat pane of each window: collapsed or open, and its width (remembered in localStorage per window). */
  panes = $state.raw<Record<Id, PaneState>>({})
  /** A draft to put into a window's pane composer ("Ask the agent about this..."); the composer reports it applied. */
  prefills = $state.raw<Record<Id, { id: number; text?: string }>>({})
  /** What each app registered for its pane (`setContext`); not reactive: it is read when a prompt is sent. */
  private readonly contexts = new Map<Id, () => Record<string, unknown> | null | undefined>()
  /** Which window an aside session belongs to, known as soon as `openAside` answers (before `desktop.changed`). */
  private readonly asideWindows = new Map<Id, Id>()
  private prefillSeq = 0

  get state(): DesktopState {
    return this.current ?? emptyState()
  }
  /** Projects removed from this desktop, newest first (at most three): Computer's "Recently removed". Saved by main, so it survives a reconnect. */
  get recentlyRemoved(): RemovedProject[] {
    return (this.state.removedProjects ?? []).slice(0, RECENTLY_REMOVED_MAX)
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
      // The status inside the chat's own state can be old (UX-145): `effectiveStatus` prefers the session row for connecting and error.
      return store ? [{ sessionId: s.id, title: store.state.session.title || s.title, status: effectiveStatus(store.state.session.status, s.status) ?? s.status, updatedAt: s.updatedAt, cwd: s.cwd, toolCalls: store.state.toolCalls }] : []
    })
  }
  /** A chat was busy when the user took control: the Activity infopanel says "Stopped: you took control". */
  stoppedStep = $state(false)
  /** Requests that wait for the user's answer: the one count of the bar, the Activity infopanel and the taskbar flag. */
  get waitingCount(): number {
    return this.inbox.pending.length
  }
  /** True while a turn of any chat of this desktop runs or waits for an answer. */
  get agentBusy(): boolean {
    return this.allSessions.some((s) => isTurnRunning(s.status))
  }
  /** "Waiting for you: 2 requests to approve", "Read src/a.ts" or null (idle). */
  get working(): string | null {
    const inputs = this.activityInputs
    return workingText(inputs.length ? inputs : this.allSessions.map((s) => ({ sessionId: s.id, title: s.title, status: s.status, toolCalls: {} })), this.waitingCount, this.focusedChatId)
  }
  /** The chat the user works in: the focused chat window, else null (the status text then follows every working chat). */
  get focusedChatId(): number | null {
    const view = this.focusedWindow?.view
    return view?.app === 'chat' ? view.sessionId : null
  }
  /** The words of the "waiting" link of the bar: the chat that waits longest, named ("Fix login is waiting: run a command"). */
  get waitingLinkText(): string | null {
    return waitingLinkText(this.inbox.pending)
  }
  /** "Agent: not started" while a chat of this desktop has an agent that could not start (the red chip of the bar); else null. */
  get agentProblem(): string | null {
    return this.chats.some((c) => c.problem?.kind === 'start-failed') ? 'Agent: not started' : null
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
    const title = session ? (chatTitleLabels(this.chats).get(session.id) ?? session.title) : null
    return { title, used, size, ratio: size > 0 ? Math.min(1, used / size) : 0 }
  }
  get busy(): boolean {
    return this.allSessions.some((s) => isBusy(s.status))
  }

  private readonly views: KeyedDebouncer<Id, AppView>
  private started = false
  private offs: (() => void)[] = []
  private messageId = 0
  private noticeTimer: ReturnType<typeof setTimeout> | null = null
  private glowTimers = new Set<ReturnType<typeof setTimeout>>()
  private balloonTimer: ReturnType<typeof setTimeout> | null = null

  constructor(api: AgentXPApi, inbox?: PermissionInbox) {
    this.api = api
    // One AG-UI store per chat; the apps take theirs from `inbox.storeFor` (see lib/apps/sessionStores).
    this.inbox = inbox ?? new PermissionInbox((id) => this.createStore(id), (id) => this.roomMembers.get(id)?.room ?? null)
    this.sessions = new SessionsStore(api.sessions)
    this.views = new KeyedDebouncer(VIEW_DEBOUNCE_MS, (id, view) => void this.api.desktop.updateView(id, view).catch(() => {}))
  }

  private createStore(id: Id): SessionAgentStore {
    const store = new SessionAgentStore(id, this.api.agui, () => this.api.sessions)
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
      this.api.on('room.changed', (room) => this.applyRoom(room)),
      this.api.on('room.removed', ({ id }) => this.dropRoom(id)),
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
    void this.loadRooms()
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
    if (this.noticeTimer) clearTimeout(this.noticeTimer)
    for (const store of this.inbox.stores.values()) if (store instanceof SessionAgentStore) store.dispose()
  }

  /** The rooms of this desktop and who their members are (for the approvals of members). */
  private async loadRooms(): Promise<void> {
    try {
      const rooms = await this.api.rooms.list(this.state.desktopId)
      for (const room of rooms) this.applyRoom(await this.api.rooms.state(room.id))
    } catch {
      // Without the room names an approval of a member still shows; it names the member only.
    }
  }

  private applyRoom({ room, members }: RoomStateDto): void {
    if (room.desktopId !== this.state.desktopId) return
    const next = new Map([...this.roomMembers].filter(([, m]) => m.roomId !== room.id))
    for (const m of members) if (m.sessionId !== null) next.set(m.sessionId, { member: m.name, room: room.title, roomId: room.id })
    this.roomMembers = next
  }

  private dropRoom(roomId: Id): void {
    this.roomMembers = new Map([...this.roomMembers].filter(([, m]) => m.roomId !== roomId))
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
    if (plugged && this.chosenPlugIns === 0) this.autoPlay = plugged
    // "Plug in a project..." is wrong once a project is plugged in, whoever plugged it (the agent, Code, Computer).
    if (this.balloon?.title === PROJECT_HINT.title && next.drives.some((d) => d.kind === 'removable')) this.dismissBalloon()
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
    for (const s of this.allSessions) {
      if (!isBusy(s.status)) {
        // Main dropped a request this store still shows (the room's Stop, the program ended in Task Manager): load the chat
        // again, so the popup of a request that no longer exists goes away and the next turn is followed.
        const stale = this.inbox.has(s.id) ? (this.inbox.storeFor(s.id) as Partial<Pick<SessionAgentStore, 'running' | 'pendingInterrupt' | 'connect'>>) : null
        if (stale && stale.running === false && stale.pendingInterrupt) void stale.connect?.()
        continue
      }
      const known = this.inbox.has(s.id)
      const store = this.inbox.storeFor(s.id) as Partial<Pick<SessionAgentStore, 'running' | 'pendingInterrupt' | 'connect' | 'followAfterRun'>>
      // A turn the store did not start (a team room member, a scheduled task) is not streamed to it: a store that was idle when
      // that turn began connects again, so it follows the turn live and shows its permission requests. A new store just connected.
      if (known && s.status !== 'connecting' && store.running === false && !store.pendingInterrupt) void store.connect?.()
      // Still streaming the end of the previous turn (the next one began within microseconds): follow it once that run ends.
      else if (known && s.status === 'working' && store.running === true) store.followAfterRun?.(() => isBusy(this.allSessions.find((x) => x.id === s.id)?.status ?? null))
    }
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
    if (this.balloon?.closesWith === input.app) this.dismissBalloon()
    const existing = this.existingWindowFor(input)
    if (existing) {
      await this.raiseWindow(existing.id)
      return this.windowById(existing.id) ?? existing
    }
    if (input.app === 'help') {
      const opened = await this.api.desktop.openWindow({ ...input, desktopId: this.state.desktopId })
      this.dismissBalloon() // the welcome balloon would cover the Help window's footer (UX-148)
      return this.placeHelp(opened)
    }
    return this.openBesideOpener(() => this.api.desktop.openWindow({ ...input, desktopId: this.state.desktopId }))
  }

  /**
   * Runs a call that opens a window (an app, a new chat). A window that is new lies whole inside the work area and, when it was
   * opened from a chat, beside that chat and not over it (UX-181). The Review window keeps its own placement (against the right edge).
   */
  private async openBesideOpener(open: () => Promise<AppWindowState>): Promise<AppWindowState> {
    const known = new Set(this.state.windows.map((w) => w.id))
    const opener = this.windowById(this.state.focusedWindowId ?? -1)
    const opened = await open()
    if (known.has(opened.id)) return opened
    if (opener && opener.id !== opened.id) this.openers.set(opened.id, opener.id)
    const placed = opened.app === 'code-review' ? opened : await this.placeBesideOpener(opened, opener)
    // A window opened for a task is in front and has the focus, never behind the window it came from (UX-203).
    if (this.state.focusedWindowId !== placed.id) await this.raiseWindow(placed.id)
    return placed
  }

  /** The window each window was opened from, by window id (kept while both exist). */
  private readonly openers = new Map<Id, Id>()

  /**
   * Gives the focus back to the window that opened this one, when it is still there (Control Center after OK, UX-203). Nothing
   * happens when that window was closed or minimized.
   */
  async returnToOpener(windowId: Id): Promise<void> {
    const from = this.openers.get(windowId)
    const opener = from === undefined ? undefined : this.windowById(from)
    if (opener && opener.windowState !== 'minimized') await this.raiseWindow(opener.id)
  }

  private async placeBesideOpener(win: AppWindowState, opener: AppWindowState | undefined): Promise<AppWindowState> {
    const area = this.workArea?.()
    if (!area || area.width <= 0 || area.height <= 0) return win
    const barHeight = this.barRect?.height ?? 0
    // Beside the chat the user is typing in, and with no room beside it 24 px right of and below it, on top (UX-203). From another window main
    // cascades a new one by 24 px (or tiles a tool beside it), so its title bar stays in reach.
    const from = opener?.app === 'chat' && opener.windowState === 'normal' && opener.id !== win.id ? this.boundsOf(opener) : null
    const bounds = placeBesideOpener(win.app, this.boundsOf(win), from, area, barHeight, this.state.windows.length, opener?.app)
    const b = this.boundsOf(win)
    if (bounds.x === b.x && bounds.y === b.y && bounds.width === b.width && bounds.height === b.height) return win
    this.patch(win.id, { bounds })
    await this.api.desktop.setBounds(win.id, bounds)
    return { ...win, bounds }
  }

  /** The size of the area windows live in (the window layer sets it); null until the layer is shown. */
  workArea: (() => { width: number; height: number }) | null = null

  /** The Help window opens centred at 760 x 520 (or the work area minus 40 px), so it is whole on any desktop size (UX-165). */
  private async placeHelp(win: AppWindowState): Promise<AppWindowState> {
    const area = this.workArea?.()
    if (!area || area.width <= 0 || area.height <= 0) return win
    const bounds = helpBounds(area, this.barRect?.height ?? 0)
    this.patch(win.id, { bounds })
    await this.api.desktop.setBounds(win.id, bounds)
    return { ...win, bounds }
  }

  /**
   * The window an open request should raise instead of opening another: the chat's own window, and the single window of
   * Browser (File > New window asks for a second one with `newWindow`). Main does the same for the other single-window apps.
   */
  private existingWindowFor(input: Omit<OpenWindowInput, 'desktopId'>): AppWindowState | undefined {
    if (input.app === 'chat' && input.sessionId) return this.state.windows.find((w) => w.view.app === 'chat' && w.view.sessionId === input.sessionId)
    if (input.app === 'browser' && !input.newWindow && input.url === undefined) return this.state.windows.findLast((w) => w.app === 'browser')
    return undefined
  }

  async closeWindow(windowId: Id): Promise<void> {
    this.views.cancel(windowId)
    // A chat that closes while its turn runs: the agent goes on, and the user is told where to find it (UX-136).
    const view = this.current?.windows.find((w) => w.id === windowId)?.view
    const closing = view?.app === 'chat' ? this.sessions.byId(view.sessionId) : undefined
    const notice = closeChatBalloon(view, closing?.status, closing?.title)
    if (notice) {
      const { action, ...text } = notice
      this.showBalloon({ ...text, icon: 'info', stayMs: BALLOON_LONG_MS, action: { label: action, run: () => this.openTaskManager('chats', closing?.id) } })
    }
    if (this.current) {
      const windows = this.current.windows.filter((w) => w.id !== windowId)
      this.current = { ...this.current, windows, focusedWindowId: this.current.focusedWindowId === windowId ? nextFocus(windows) : this.current.focusedWindowId }
    }
    this.forgetPane(windowId)
    await this.api.desktop.closeWindow(windowId)
  }

  /** A closed window's pane state goes with it: a later window may get the same id and must start collapsed. */
  private forgetPane(windowId: Id): void {
    const { [windowId]: _gone, ...rest } = this.panes
    this.panes = rest
    try {
      localStore()?.removeItem(paneKey(this.state.desktopId, windowId))
    } catch {
      // storage blocked: nothing was remembered either
    }
  }

  async focusWindow(windowId: Id): Promise<void> {
    if (this.bringForward(windowId)) await this.api.desktop.focusWindow(windowId)
  }

  /** The user typed or clicked: main keeps the focus where it is for 2 seconds when the agent opens a window. At most one call per half second. */
  noteUserActivity(): void {
    const now = Date.now()
    if (now - this.lastActivityAt < ACTIVITY_THROTTLE_MS || this.state.desktopId === 0) return
    this.lastActivityAt = now
    void this.api.desktop.userActive(this.state.desktopId).catch(() => {})
  }

  /** Brings a window to the front, restores it when minimized and focuses it ("Show", "Open", the taskbar). Whoever opened it. */
  async raiseWindow(windowId: Id): Promise<void> {
    if (this.bringForward(windowId)) await this.api.desktop.raiseWindow(windowId)
  }

  /**
   * Optimistic part of focusing: restore, raise to the top and focus. False when the window does not exist or is
   * already focused, on top and shown (nothing to ask main for).
   */
  private bringForward(windowId: Id): boolean {
    const w = this.windowById(windowId)
    if (!w || !this.current) return false
    this.startOpen = false
    this.actionCenterOpen = false
    const onTop = nextFocus(this.current.windows) === windowId
    if (this.current.focusedWindowId === windowId && w.windowState !== 'minimized' && onTop) return false
    this.current = {
      ...this.current,
      windows: raise(this.current.windows.map((x) => (x.id === windowId ? { ...x, windowState: x.windowState === 'minimized' ? 'normal' : x.windowState, attention: undefined } : x)), windowId),
      focusedWindowId: windowId
    }
    return true
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

  /** Taskbar button click: a window that is not on top comes forward; the one on top is minimized. */
  async toggleFromTaskbar(windowId: Id): Promise<void> {
    const w = this.windowById(windowId)
    if (!w) return
    if (taskbarAction(w, this.state.focusedWindowId, this.state.windows) === 'minimize') await this.minimize(windowId)
    else await this.raiseWindow(windowId)
  }

  // ---- top bar ----------------------------------------------------------------------------------

  /** The size of the top bar as the page measured it (null until the first measurement). */
  barRect = $state.raw<BarRect | null>(null)

  /**
   * The top bar was measured (first paint, or it grew with the chips row or the status line). Windows that now have their
   * title bar under it move down (UX-88). Idempotent: a window that is clear of the bar stays where it is.
   */
  async setBarRect(rect: BarRect): Promise<void> {
    this.barRect = rect
    for (const move of windowsToMoveBelowBar(this.state.windows, rect)) {
      this.patch(move.id, { bounds: move.bounds })
      await this.api.desktop.setBounds(move.id, move.bounds)
    }
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

  /** Opens Control Center (one window per desktop) at a page, e.g. the top bar chips open Permissions. */
  async openControlCentre(page: ControlCentrePage, row?: string): Promise<void> {
    const window = await this.openApp({ app: 'control-centre' })
    await this.api.desktop.updateView(window.id, { app: 'control-centre', page, ...(row ? { row } : {}) })
  }

  /** Opens Task Manager on one tab (the Chats icon, the toast of a closed chat, "Open Task Manager" in a chat notice); `chatId` selects that chat's row. */
  async openTaskManager(tab: TaskManagerTab = 'chats', chatId?: Id): Promise<void> {
    const window = await this.openApp({ app: 'agent-manager' })
    await this.api.desktop.updateView(window.id, { app: 'agent-manager', tab, ...(chatId === undefined ? {} : { chatId }) })
  }

  /** What a working chat is doing right now: the title of its running tool, else null (Task Manager shows it beside the status). */
  chatProgress(sessionId: Id): string | null {
    const input = this.activityInputs.find((c) => c.sessionId === sessionId)
    return input ? runningToolTitle(input.toolCalls) : null
  }

  /** Opens the Event Viewer (one window per desktop), optionally on one chat and one event: the flag menu and "Show in Event Viewer". */
  async openEventViewer(scope: { sessionId?: Id | null; selectedEventId?: number | null } = {}): Promise<void> {
    const window = await this.openApp({ app: 'event-viewer' })
    await this.api.desktop.updateView(window.id, { app: 'event-viewer', sessionId: scope.sessionId ?? null, level: 'all', selectedEventId: scope.selectedEventId ?? null })
  }

  /**
   * The **Show in...** actions of a chat tool row and of the activity feed (`toolShowTargets`): the operator asked, so
   * the window opens or comes forward with the focus. Code goes to the file and highlights the lines; Show diff selects
   * the chat's recorded change of the file; the Terminal selects the run; the Browser comes forward.
   */
  async showToolTarget(target: ToolShowTarget, sessionId: Id | null = null): Promise<void> {
    switch (target.kind) {
      case 'code':
      case 'diff': {
        const change = target.kind === 'diff' && sessionId !== null ? (await this.api.sessions.changes(sessionId).catch(() => [])).findLast((c) => (normaliseVPath(c.path) ?? c.path).toLowerCase() === target.path.toLowerCase()) : undefined
        const window = await this.openApp({ app: 'code', path: target.path })
        const view = this.windowById(window.id)?.view ?? window.view
        if (view.app !== 'code') return
        const tabs = view.tabs.includes(target.path) ? view.tabs : [...view.tabs, target.path]
        // A view report of the window still waiting in the debouncer goes first, so it cannot land after this one and undo it.
        this.views.flush(window.id)
        await this.api.desktop.updateView(window.id, {
          ...view,
          tabs,
          activePath: target.path,
          selection: null,
          visibleLines: target.kind === 'code' ? target.lines : view.visibleLines,
          ...(change ? { selectedChangeId: change.id } : {})
        })
        return
      }
      case 'terminal': {
        const terminals = sessionId === null ? {} : (this.inbox.stores.get(sessionId)?.state.terminals ?? {})
        const terminalId = target.terminalId ?? Object.entries(terminals).findLast(([, t]) => target.command !== null && t.command === target.command)?.[0] ?? null
        const open = this.state.windows.findLast((w) => w.app === 'terminal')
        const window = open ?? (await this.openApp({ app: 'terminal' }))
        if (open) await this.raiseWindow(open.id)
        const view = this.windowById(window.id)?.view ?? window.view
        this.views.flush(window.id)
        if (view.app === 'terminal' && terminalId !== null) await this.api.desktop.updateView(window.id, { ...view, terminalId })
        return
      }
      case 'browser': {
        const open = (target.windowId !== null ? this.state.windows.find((w) => w.id === target.windowId && w.app === 'browser') : undefined) ?? this.state.windows.findLast((w) => w.app === 'browser')
        if (open) await this.raiseWindow(open.id)
        else await this.openApp({ app: 'browser', ...(target.url ? { url: target.url } : {}) })
        return
      }
    }
  }

  /** A click on a line of the Activity infopanel: its **Show in...** place (Code, Terminal, Browser), else the chat that did it. */
  async showFeedItem(item: FeedItem): Promise<void> {
    const target = feedTarget(item)
    if (target) return this.showToolTarget(target, item.sessionId)
    await this.openChatOf(item.sessionId)
  }

  /** Brings the chat of a session forward: its Chat window, or the window whose chat pane it is, else opens its Chat window. */
  async openChatOf(sessionId: Id): Promise<void> {
    const pane = this.state.windows.find((w) => w.asideSessionId === sessionId)
    if (pane) return this.raiseWindow(pane.id)
    await this.openApp({ app: 'chat', sessionId })
  }

  /** The chat the "Working: ..." link of the top bar opens: the focused working chat, else the first one that works. */
  get workingChatId(): Id | null {
    return workingChatId(this.activityInputs, this.focusedChatId)
  }

  /**
   * Pause all agents / Resume agents and continue. Pause saves in main which chats it stopped; Resume sends each of them
   * `CONTINUE_TEXT` as the user's message, so the stopped step carries on. With nothing to continue the bar says so.
   */
  async togglePaused(): Promise<void> {
    const desktopId = this.state.desktopId
    if (!this.state.paused) {
      if (this.current) this.current = { ...this.current, paused: true }
      await this.api.desktop.setPaused(desktopId, true)
      return
    }
    if (this.current) this.current = { ...this.current, paused: false }
    await this.continueStopped(await this.api.desktop.resumeAgents(desktopId))
  }

  private async continueStopped(sessionIds: readonly Id[]): Promise<void> {
    if (sessionIds.length === 0) return this.showNotice(NOTHING_STOPPED_NOTICE)
    for (const id of sessionIds) this.pushMessage(resumedLine(this.sessions.byId(id)?.title || 'New chat'))
    await Promise.all(
      sessionIds.map(async (id) => {
        const store = this.inbox.storeFor(id) as Partial<Pick<SessionAgentStore, 'send' | 'whenConnected'>>
        await store.whenConnected?.()
        await store.send?.(CONTINUE_TEXT)
      })
    )
  }

  private showNotice(text: string): void {
    this.notice = text
    if (this.noticeTimer) clearTimeout(this.noticeTimer)
    this.noticeTimer = setTimeout(() => (this.notice = null), NOTICE_MS)
  }

  /** True while the desktop is paused and Pause stopped a step of this chat (the saved list in the desktop state). */
  stoppedByPause(sessionId: Id): boolean {
    return this.state.paused && (this.state.stoppedByPause ?? []).includes(sessionId)
  }

  /** What the Action Center lists besides approvals: the chats Pause stopped (from the saved list), then the pushed messages. */
  get centreMessages(): { id: number; text: string }[] {
    const stopped = this.state.paused ? (this.state.stoppedByPause ?? []) : []
    return [
      ...stopped.map((id) => ({ id: -id, text: stoppedLine(this.sessions.byId(id)?.title || 'New chat') })),
      ...this.messages.map((m) => ({ id: m.id, text: m.text }))
    ]
  }

  /**
   * "Ask before every action" and "Resume". Taking control stops the running steps in main; the bar then reads
   * "You are in control" and the chats read "Waiting for you" instead of "Working".
   */
  async toggleUserInControl(): Promise<void> {
    const on = !this.state.userInControl
    this.stoppedStep = on && this.busy
    if (this.current) this.current = { ...this.current, userInControl: on }
    await this.api.desktop.setUserInControl(this.state.desktopId, on)
  }

  async newChat(): Promise<AppWindowState> {
    this.startOpen = false
    return this.openBesideOpener(() => this.api.desktop.newChat(this.state.desktopId))
  }

  /** A new chat on `cwd`; `draft` (the message that failed in another chat) waits in its message box (UX-175). */
  async startChat(cwd: VPath, draft?: string): Promise<void> {
    const chat = await this.newChatIn(cwd)
    if (draft !== undefined && chat.view.app === 'chat') this.prefillPane(chat.id, draft)
  }

  /**
   * "New chat" from the Start menu, the Chats icon and the taskbar: asks where the agent works only when there is a
   * choice. One project plugged in: the chat starts there. Several: the New chat dialog opens with the last used one
   * preselected. None: the agent works on C: and a balloon says so.
   */
  async newChatFlow(): Promise<void> {
    this.startOpen = false
    const projects = this.state.drives.filter((d) => d.kind === 'removable')
    if (projects.length > 1) {
      this.newChatDialogOpen = true
      return
    }
    if (projects.length === 1) {
      await this.newChatIn(`${projects[0]!.letter}:\\`)
      return
    }
    this.showBalloon({ title: 'New chat', text: 'No project is plugged in, so the agent works in its own folder on C:.', icon: 'info' })
    await this.newChat()
  }

  /**
   * "Ask the agent about this": the requesting window's chat pane opens (expanded) and gets the prompt: "Explain this" and
   * "Send selection to chat" send it, "Ask the agent about this..." fills the composer so the user adds the question. A window without
   * a pane (or one that is gone) starts a full chat instead, like `askChatWindow`.
   */
  async askChat(request: AskChatRequest): Promise<void> {
    const window = this.state.windows.find((w) => w.id === request.windowId)
    if (!window || !windowHasAside(window) || request.kind === 'window') return this.askChatWindow(request)
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

  /**
   * "Send to chat" with a file (a saved snip): the window's chat pane opens and gets `text` with the file attached.
   * A window without a pane starts a full chat on C: instead. A turn that is running keeps the text in the box.
   */
  async sendFileToChat(windowId: Id, filePath: string, text: string): Promise<void> {
    const window = this.state.windows.find((w) => w.id === windowId)
    let sessionId: Id
    if (window && windowHasAside(window)) {
      this.setChatPane(window.id, true)
      sessionId = await this.openAside(window.id)
    } else {
      const chat = await this.newChatIn(this.state.home)
      if (chat.view.app !== 'chat') return
      sessionId = chat.view.sessionId
    }
    const store = this.inbox.storeFor(sessionId) as Partial<Pick<SessionAgentStore, 'send' | 'running' | 'whenConnected'>>
    await store.whenConnected?.()
    if (store.running && window) this.prefillPane(window.id, text)
    else await store.send?.(text, [filePath])
  }

  /** "Start a chat here": a new chat on the drive of the request (or home) gets the prompt and its window opens. */
  async askChatWindow(request: AskChatRequest): Promise<void> {
    const cwd = askChatCwd(request, this.state.windows, this.state.home)
    const window = await this.newChatIn(cwd)
    if (window.view.app !== 'chat') return
    // The agent starts in the background and the store loads the chat meanwhile: wait for that, a send during it is ignored.
    const store = this.inbox.storeFor(window.view.sessionId) as Partial<Pick<SessionAgentStore, 'send' | 'whenConnected'>>
    await store.whenConnected?.()
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

  /** "New conversation": the pane starts blank; a conversation with a message in it is kept as a chat (Recent chats). */
  async closeAside(windowId: Id): Promise<void> {
    await this.api.desktop.closeAside(windowId)
  }

  /**
   * "Open as a chat window": the pane's conversation moves to a Chat window of its own (the pane starts blank); a pane
   * with no conversation yet starts a new chat on `cwd`.
   */
  async openAsideAsChat(windowId: Id, cwd: VPath): Promise<void> {
    const moved = await this.api.desktop.openAsideAsChat(windowId)
    if (!moved) await this.startChat(cwd)
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
    if (!window || !windowHasAside(window)) return
    this.patchPane(windowId, { collapsed: !open })
    if (open) this.focusPane(windowId)
    else void this.unwidenAfterPane(window)
  }

  /** Windows that grew to make room for their chat pane: the bounds before and after, so hiding the pane gives the width back. */
  private readonly widenedForPane = new Map<Id, { before: Bounds; after: Bounds }>()

  /**
   * The chat pane opened in a window too narrow to keep 380 px of app beside it: the window grows by `extra` px (as far as the
   * work area allows), so the app keeps its layout. A maximized window, or one with no room to grow, keeps its size (the pane then
   * floats over the app).
   */
  async widenForPane(windowId: Id, extra: number): Promise<void> {
    const window = this.windowById(windowId)
    const area = this.workArea?.()
    if (!window || window.windowState !== 'normal' || extra <= 0 || !area || area.width <= 0) return
    const before = this.boundsOf(window)
    const after = widenBounds(before, extra, area)
    if (after.width <= before.width) return
    this.widenedForPane.set(windowId, { before, after })
    this.patch(windowId, { bounds: after })
    await this.api.desktop.setBounds(windowId, after)
  }

  /** Hiding the pane gives back the width it took, unless the user moved or resized the window since. */
  private async unwidenAfterPane(window: AppWindowState): Promise<void> {
    const widened = this.widenedForPane.get(window.id)
    if (!widened) return
    this.widenedForPane.delete(window.id)
    const now = this.boundsOf(window)
    const same = now.x === widened.after.x && now.y === widened.after.y && now.width === widened.after.width && now.height === widened.after.height
    if (!same || window.windowState !== 'normal') return
    this.patch(window.id, { bounds: widened.before })
    await this.api.desktop.setBounds(window.id, widened.before)
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

  /**
   * Ctrl+N and File > New chat: a chat on the default drive of the desktop, without a question: the drive of the last chat
   * while it is still plugged in, else the first project, else the agent's home on C:. Its composer gets the focus.
   */
  async startDefaultChat(): Promise<void> {
    this.startOpen = false
    const projects = this.state.drives.filter((d) => d.kind === 'removable')
    const drive = projects.find((d) => d.letter === this.lastChatDrive) ?? projects[0]
    if (drive) await this.newChatIn(`${drive.letter}:\\`)
    else await this.newChat()
  }

  /** Starts a chat; `cwd` (a VPath on a plugged-in drive) is the agent's working directory, default its home on C:. */
  async newChatIn(cwd: VPath): Promise<AppWindowState> {
    this.startOpen = false
    const letter = /^([A-Za-z]):/.exec(cwd)?.[1]?.toUpperCase()
    if (letter && letter !== 'C') this.lastChatDrive = letter
    return this.openBesideOpener(() => this.api.desktop.newChat(this.state.desktopId, undefined, cwd))
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
      caption: 'AgentXP Desktop Connection',
      buttons: 'YesNo',
      icon: 'warning',
      defaultButton: 1
    })
    if (answer !== 'yes') return false
    await this.api.launcher.remove(this.state.desktopId)
    return true
  }

  /** Shows the launcher window (Start menu: AgentXP Desktops...). */
  async showLauncher(): Promise<void> {
    this.startOpen = false
    await this.api.launcher.show()
  }

  // ---- drives -------------------------------------------------------------------------------------

  /** Chats that still run and have their working directory on the drive. */
  chatsOnDrive(letter: DriveLetter): SessionDto[] {
    return this.allSessions.filter((s) => s.status !== 'closed' && parseVPath(s.cwd)?.drive === letter)
  }

  /** Eject (remove from this desktop): warns when chats work on the drive, ejects it, then shows the balloon. */
  async ejectDrive(letter: DriveLetter): Promise<void> {
    const drive = this.state.drives.find((d) => d.letter === letter)
    if (!drive || drive.kind === 'system') return
    this.usbMenuOpen = false
    this.startOpen = false
    const working = this.chatsOnDrive(letter)
    if (working.length > 0) {
      const names = working.map((s) => `"${s.title || 'New chat'}"`).slice(0, 3).join(', ')
      const more = working.length > 3 ? ` and ${working.length - 3} more` : ''
      const answer = await showMessageBox({
        text: `${removeProjectText(drive.label)}\n\n${working.length === 1 ? 'A chat works' : `${working.length} chats work`} on it: ${names}${more}. Their file and terminal requests on it are refused until you plug it in again.`,
        caption: 'Remove project',
        buttons: 'YesNo',
        icon: 'warning',
        defaultButton: 1
      })
      if (answer !== 'yes') return
    }
    await this.api.drives.eject(this.state.desktopId, letter)
    if (this.current) {
      const gone: RemovedProjectDto[] = drive.folderId === null ? [] : [{ folderId: drive.folderId, label: drive.label, letter, removedAt: new Date().toISOString() }]
      const removedProjects = gone.length > 0 ? addRemoved(this.current.removedProjects ?? [], gone[0], REMOVED_PROJECTS_KEPT) : this.current.removedProjects
      this.current = { ...this.current, drives: this.current.drives.filter((d) => d.letter !== letter), removedProjects }
    }
    this.showBalloon({ title: EJECT_BALLOON_TITLE, text: ejectBalloonText(drive.label, letter), icon: 'usb-safe' })
  }

  /**
   * Plug in a project: the Browse For Folder dialog, then the drive. Resolves the drive (also when it was plugged in already), or null when
   * cancelled or it failed. No window opens (UX-181): the window the user plugged in from (Computer, Code) shows and selects the new project.
   */
  async plugInProject(options: { explorer?: boolean } = {}): Promise<DriveDto | null> {
    this.startOpen = false
    let folder: FolderDto | null
    try {
      folder = await chooseFolder(this.api, 'plug-in')
    } catch (error) {
      await this.plugInFailed('the folder', error)
      return null
    }
    return folder ? this.plugInFolder(folder, { explorer: options.explorer }) : null
  }

  /**
   * Plugs a recently removed project in again, without the dialog. From Computer the user chose it, so there is no AutoPlay
   * (Computer selects the drive); from the tray (`autoPlay`) AutoPlay asks what to do with the drive.
   */
  async plugInAgain(folderId: Id, options: { autoPlay?: boolean } = {}): Promise<DriveDto | null> {
    const folder = (await this.api.folders.list()).find((f) => f.id === folderId)
    if (!folder) {
      if (this.current) this.current = { ...this.current, removedProjects: (this.current.removedProjects ?? []).filter((r) => r.folderId !== folderId) }
      return null
    }
    return this.plugInFolder(folder, { autoPlay: options.autoPlay })
  }

  /**
   * Plugs a folder in. A drive the user just chose does not open AutoPlay; with `explorer` an Explorer window opens on
   * the drive root (in front, focused).
   */
  private async plugInFolder(folder: FolderDto, options: { explorer?: boolean; autoPlay?: boolean } = {}): Promise<DriveDto | null> {
    const already = this.state.drives.find((d) => d.kind === 'removable' && d.folderId === folder.id)
    if (already) {
      await showMessageBox({ text: `The project ${projectQuoted(folder.name, already.letter)} is already plugged in.`, caption: 'Plug in a project', buttons: 'OK', icon: 'information' })
      return already
    }
    if (!options.autoPlay) this.chosenPlugIns++
    try {
      const drive = await this.api.drives.plugIn(this.state.desktopId, folder.id)
      if (!drive) return null
      if (this.current) this.current = { ...this.current, removedProjects: (this.current.removedProjects ?? []).filter((r) => r.folderId !== folder.id) }
      this.showBalloon({ title: 'Project plugged in', text: pluggedBalloonText(driveTitle(drive)), icon: 'info' })
      if (options.explorer) await this.openApp({ app: 'explorer', path: driveRoot(drive.letter) })
      return drive
    } catch (error) {
      await this.plugInFailed(folder.name, error)
      return null
    } finally {
      if (!options.autoPlay) this.chosenPlugIns--
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
    else this.showBalloon({ title: 'Remove a project', text: 'No project is plugged in.', icon: 'info' })
  }

  showBalloon(balloon: Balloon): void {
    this.balloon = balloon
    this.armBalloon(balloon.stayMs === undefined ? BALLOON_MS : balloon.stayMs)
  }

  private armBalloon(ms: number | null): void {
    if (this.balloonTimer) clearTimeout(this.balloonTimer)
    this.balloonTimer = ms === null ? null : setTimeout(() => (this.balloon = null), ms)
  }

  /** The pointer is on the balloon (it stays) or left it (it goes after `BALLOON_LEAVE_MS`, unless it is a balloon that stays until closed). */
  holdBalloon(held: boolean): void {
    if (!this.balloon) return
    if (held) this.armBalloon(null)
    else this.armBalloon(this.balloon.stayMs === null ? null : BALLOON_LEAVE_MS)
  }

  /** The balloon's button: runs the action, waits until it is done (the window is open), then hides the balloon. A failure leaves the balloon. */
  async runBalloonAction(): Promise<void> {
    const balloon = this.balloon
    if (!balloon?.action) return
    await balloon.action.run()
    if (this.balloon === balloon) this.dismissBalloon()
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

  /** The first-run balloon of a desktop without a project: names Computer and has a button that opens it. True when it was shown. */
  showProjectHint(storage: Pick<Storage, 'getItem' | 'setItem'> | null = localStore()): boolean {
    if (this.needsDesktop || this.state.drives.some((d) => d.kind === 'removable') || !takeProjectHint(storage, this.state.desktopId)) return false
    const { action, ...text } = PROJECT_HINT
    this.showBalloon({ ...text, icon: 'info', stayMs: null, closesWith: 'explorer', action: { label: action, run: () => this.openApp({ app: 'explorer', path: '' }) } })
    return true
  }

  /** Alt+Tab (`1`) and Alt+Shift+Tab (`-1`): switch to the next or previous window in recent order. */
  async cycleWindows(direction: 1 | -1): Promise<void> {
    const id = cycleTarget(this.state.windows, this.state.focusedWindowId, direction)
    if (id !== null) await this.focusWindow(id)
  }

  /** Enter or Space on a taskbar button: brings the window forward (restores it) and never minimizes it. */
  async activateFromTaskbar(windowId: Id): Promise<void> {
    await this.raiseWindow(windowId)
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

  /** Asks what to review (project and ref) instead of opening Code Review at once. `path` preselects its project drive. */
  chooseReview(path?: string | null): void {
    this.startOpen = false
    this.reviewDialog = { root: this.projectRootOf(path ?? this.defaultReviewRoot()) }
  }

  defaultReviewRoot(): VPath {
    const code = this.state.windows.find((w) => w.view.app === 'code' && w.id === this.state.focusedWindowId) ?? this.state.windows.find((w) => w.view.app === 'code')
    const active = code?.view.app === 'code' ? code.view.activePath : null
    return this.projectRootOf(active)
  }

  projectRootOf(path?: string | null): VPath {
    return projectRootOf(this.state.drives, this.state.home, path)
  }

  /** Loads the Control Center policy for the reason line of the approval popup. */
  async loadPolicy(): Promise<void> {
    try {
      this.policy = await this.api.desktop.policy()
    } catch {
      this.policy = null
    }
  }

  /** Opens the UAC-style dialog for an approval, also one the user put off with "Not now". */
  async review(approval: PendingApproval): Promise<void> {
    this.actionCenterOpen = false
    this.reviewing = approval
    await this.loadPolicy()
  }

  /**
   * The approval the desktop blocks on: the one picked in the Action Center, else the oldest waiting request.
   * It pops up over the whole desktop, whatever window or chat it came from, until it is answered or put off.
   */
  get popup(): PendingApproval | null {
    const pending = this.inbox.pending
    const picked = this.reviewing && pending.find((a) => a.key === this.reviewing?.key)
    if (picked) return picked
    return nextApproval(pending.filter((a) => !this.dismissed.has(a.key)))
  }

  /** "Not now" or Esc: closes the popup without answering. */
  closePopup(): void {
    const shown = this.popup
    this.reviewing = null
    if (shown) this.dismissed = new Set(this.dismissed).add(shown.key)
  }

  /**
   * The "waiting" link of the bar: brings the popup of the oldest request back, also after "Not now".
   */
  async openNextRequest(): Promise<void> {
    const next = nextApproval(this.inbox.pending)
    if (next) await this.review(next)
  }

  /** The reviewed approval answered (option id) or dismissed without answering (undefined). */
  async answerReview(optionId: string | null): Promise<void> {
    const approval = this.popup
    this.reviewing = null
    if (approval) await this.inbox.answer(approval, optionId)
  }
}

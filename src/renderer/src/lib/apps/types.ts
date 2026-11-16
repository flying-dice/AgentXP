/**
 * The contract between the desktop shell (lib/desktop) and the virtual apps
 * (lib/apps). The shell owns windows; an app only renders the client area of
 * its window and reports what it shows through `host.updateView`.
 */
import type { Component } from 'svelte'
import type { Agent7Api } from '@shared/ipc'
import type { Id } from '@shared/models'
import type { DriveDto, DriveLetter, VPath } from '@shared/vfs'
import type { AppKind, AppView, AskChatRequest, AppWindowState, DesktopState, OpenWindowInput, TaskManagerTab, ViewOf } from '@shared/desktop'
import type { IconName } from '$lib/kit/atoms/icons'
import type { RemovedProject } from '../desktop/projectDrives'

/** What the shell gives every app. Implemented by lib/desktop/DesktopController. */
export interface DesktopHost {
  /** Reactive (a $state proxy): the live desktop. */
  readonly state: DesktopState
  readonly api: Agent7Api
  openApp(input: Omit<OpenWindowInput, 'desktopId'>): Promise<AppWindowState>
  /** Opens the Event Viewer (one window per desktop), optionally on one chat and one event ("Show in Event Viewer"). */
  openEventViewer(scope?: { sessionId?: Id | null; selectedEventId?: number | null }): Promise<void>
  /** Opens Task Manager on a tab (default Chats); `chatId` selects that chat's row. */
  openTaskManager(tab?: TaskManagerTab, chatId?: Id): Promise<void>
  /** What a working chat is doing now (the title of its running tool), or null. */
  chatProgress(sessionId: Id): string | null
  /** The root to review or work on for a path: its plugged-in project drive, else the first project drive, else home. */
  projectRootOf(path?: string | null): VPath
  /** Opens the "Code Review" dialog, which asks what to review (project and ref); `path` preselects its project drive. */
  chooseReview(path?: string | null): void
  closeWindow(windowId: Id): Promise<void>
  focusWindow(windowId: Id): Promise<void>
  /** Debounced (300 ms) per window; the latest view wins. */
  updateView(windowId: Id, view: AppView): void
  /** Safely Remove: warns when chats work on the drive, ejects it and shows the balloon. */
  ejectDrive(letter: DriveLetter): Promise<void>
  /** Plug in a project: the Browse For Folder dialog, then the drive, a balloon, or a message when it is plugged in already or fails. Resolves the drive, or null. */
  plugInProject(): Promise<DriveDto | null>
  /** Plugs a recently removed project in again, without the dialog. */
  plugInAgain(folderId: Id): Promise<DriveDto | null>
  /** Projects ejected from this desktop, newest first (at most three). */
  readonly recentlyRemoved: readonly RemovedProject[]
  /** Starts a chat whose agent works in `cwd` (a VPath on C: or a plugged-in drive) and opens its Chat window; `draft` is put in its message box. */
  startChat(cwd: VPath, draft?: string): Promise<void>
  /** Text waiting for the message box of a window (a new chat that continues a failed message), by window id; the Chat app applies it and calls `prefillApplied`. */
  readonly prefills?: Readonly<Record<Id, { id: number; text?: string }>>
  prefillApplied?(windowId: Id, id: number): void
  /** File > New chat, Ctrl+N: starts a chat on the default drive of the desktop and focuses its composer. */
  startDefaultChat(): Promise<void>
  /**
   * "Ask the agent about this" (Explain this, Ask the agent about this..., Send selection to chat): opens the requesting window's chat pane
   * and sends the prompt of `askChatPrompt(request)` there ("Ask the agent about this..." only fills the composer, for the user's
   * question). A window without a pane (Chat, Code Review, a surface) starts a chat on its drive and opens its Chat window.
   */
  askChat(request: AskChatRequest): Promise<void>
  /**
   * Registers what the window's chat pane should know about the app (the open file, the selection, the page): the
   * provider is called when a prompt is sent and its result rides with the prompt as `appContext`. `null` removes it
   * (an app does this when its window goes away; `useAppContext` does both).
   */
  setContext(windowId: Id, provider: (() => Record<string, unknown> | null | undefined) | null): void
  /** Shows or hides the chat pane of a window (View > Chat pane, Ctrl+Shift+C); showing it focuses its composer. */
  toggleChatPane(windowId: Id): void
  /** True while the window's chat pane is open (for the checkmark of View > Chat pane). */
  chatPaneOpen(windowId: Id): boolean
  /** "Send to chat" with a file: the window's chat pane (or a new chat) gets the text with the file attached. */
  sendFileToChat(windowId: Id, filePath: string, text: string): Promise<void>
  /** True while the desktop is paused and Pause stopped a step of this chat: the chat says it continues on Resume. */
  stoppedByPause(sessionId: Id): boolean
  /** True while any chat of this desktop has a turn that runs or waits for an answer (the Browser clears its yellow bar when it ends). */
  readonly agentBusy: boolean
}

export interface AppProps<K extends AppKind = AppKind> {
  window: AppWindowState & { view: ViewOf<K> }
  host: DesktopHost
  /** True while this window has focus (apps can grab keyboard focus on change). */
  focused: boolean
}

export interface AppDefinition<K extends AppKind = AppKind> {
  kind: K
  /** Start menu / taskbar name. */
  title: string
  icon: IconName
  /** One-line Start menu description. */
  description: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: Component<AppProps<any>>
}

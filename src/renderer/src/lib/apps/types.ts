/**
 * The contract between the desktop shell (lib/desktop) and the virtual apps
 * (lib/apps). The shell owns windows; an app only renders the client area of
 * its window and reports what it shows through `host.updateView`.
 */
import type { Component } from 'svelte'
import type { Agent7Api } from '@shared/ipc'
import type { Id } from '@shared/models'
import type { DriveLetter, VPath } from '@shared/vfs'
import type { AppKind, AppView, AskChatRequest, AppWindowState, DesktopState, OpenWindowInput, ViewOf } from '@shared/desktop'
import type { IconName } from '$lib/kit/atoms/icons'

/** What the shell gives every app. Implemented by lib/desktop/DesktopController. */
export interface DesktopHost {
  /** Reactive (a $state proxy): the live desktop. */
  readonly state: DesktopState
  readonly api: Agent7Api
  openApp(input: Omit<OpenWindowInput, 'desktopId'>): Promise<AppWindowState>
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
  /** Starts a chat whose agent works in `cwd` (a VPath on C: or a plugged-in drive) and opens its Chat window. */
  startChat(cwd: VPath): Promise<void>
  /**
   * "Ask chat about this" (Explain this, Ask chat..., Send selection to chat): opens the requesting window's chat pane
   * and sends the prompt of `askChatPrompt(request)` there ("Ask chat..." only fills the composer, for the user's
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

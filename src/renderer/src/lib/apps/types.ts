/**
 * The contract between the desktop shell (lib/desktop) and the virtual apps
 * (lib/apps). The shell owns windows; an app only renders the client area of
 * its window and reports what it shows through `host.updateView`.
 */
import type { Component } from 'svelte'
import type { Agent7Api } from '@shared/ipc'
import type { Id } from '@shared/models'
import type { DriveLetter, VPath } from '@shared/vfs'
import type { AppKind, AppView, AppWindowState, DesktopState, OpenWindowInput, ViewOf } from '@shared/desktop'
import type { IconName } from '$lib/kit/atoms/icons'

/** What the shell gives every app. Implemented by lib/desktop/DesktopController. */
export interface DesktopHost {
  /** Reactive (a $state proxy): the live desktop. */
  readonly state: DesktopState
  readonly api: Agent7Api
  openApp(input: Omit<OpenWindowInput, 'desktopId'>): Promise<AppWindowState>
  closeWindow(windowId: Id): Promise<void>
  focusWindow(windowId: Id): Promise<void>
  /** Debounced (300 ms) per window; the latest view wins. */
  updateView(windowId: Id, view: AppView): void
  /** Safely Remove: warns when chats work on the drive, ejects it and shows the balloon. */
  ejectDrive(letter: DriveLetter): Promise<void>
  /** Starts a chat whose agent works in `cwd` (a VPath on C: or a plugged-in drive) and opens its Chat window. */
  startChat(cwd: VPath): Promise<void>
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

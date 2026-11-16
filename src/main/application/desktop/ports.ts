import type { DesktopState } from '@shared/desktop'
import type { Id } from '@shared/models'

/** The OS windows of desktops and the launcher (implemented by the Electron window manager). */
export interface DesktopWindowHost {
  /** Shows the OS window of the desktop, creating it when needed (focuses it when already open). */
  open(desktopId: Id): void
  /** Closes the OS window of the desktop without any "closed by the user" callback; no-op when not open. */
  close(desktopId: Id): void
  /** The desktops that have an OS window right now. */
  connectedIds(): Id[]
  /** Shows (or creates) the launcher window. */
  showLauncher(): void
}

/** A host with no windows (tests); `open` / `close` keep a set so `connectedIds` reads back. */
export function createMemoryWindowHost(): DesktopWindowHost & { launcherShown: number } {
  const open = new Set<Id>()
  const host = {
    launcherShown: 0,
    open: (id: Id) => void open.add(id),
    close: (id: Id) => void open.delete(id),
    connectedIds: () => [...open],
    showLauncher: () => void host.launcherShown++
  }
  return host
}

/** Read access to live desktop state for services that must not depend on `DesktopService`. */
export interface DesktopStates {
  state(desktopId: Id): DesktopState
  /** The desktop the chat lives on; null for chats without a desktop. */
  stateOfSession(sessionId: Id): DesktopState | null
}

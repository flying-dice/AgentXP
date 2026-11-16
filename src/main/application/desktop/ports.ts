import type { DesktopState } from '@shared/desktop'
import type { Id } from '@shared/models'

/** The OS windows of desktops (implemented by the Electron window manager). */
export interface DesktopWindowHost {
  /** Shows the OS window of the desktop, creating it when needed (focuses it when already open). */
  open(desktopId: Id): void
  /** Closes the OS window of the desktop, if open. */
  close(desktopId: Id): void
}

export const noWindowHost: DesktopWindowHost = { open: () => {}, close: () => {} }

/** Read access to live desktop state for services that must not depend on `DesktopService`. */
export interface DesktopStates {
  state(desktopId: Id): DesktopState
  /** The desktop the chat lives on; null for chats without a desktop. */
  stateOfSession(sessionId: Id): DesktopState | null
}

import { getContext, setContext } from 'svelte'
import type { DesktopController } from './DesktopController.svelte'
import type { PermissionInbox } from './PermissionInbox.svelte'

/** What DesktopPage shares with everything rendered on the desktop (apps included). */
export interface DesktopContext {
  desktop: DesktopController
  inbox: PermissionInbox
}

const KEY = Symbol('agentxp.desktop')

export const setDesktopContext = (context: DesktopContext): DesktopContext => setContext(KEY, context)

/** Call during component initialisation. Throws when the component is not rendered inside a DesktopPage. */
export function getDesktopContext(): DesktopContext {
  const context = getContext<DesktopContext | undefined>(KEY)
  if (!context) throw new Error('getDesktopContext(): no desktop on this page')
  return context
}

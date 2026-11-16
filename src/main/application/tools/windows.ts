import { AGENT_OPENABLE_APPS, APP_DISPLAY_NAMES, type AgentOpenableApp, type AppKind, type AppWindowState, type DesktopState, type ViewOf } from '@shared/desktop'
import { AppError } from '../errors'

/** The window of `app` the call means: `windowId` when given, else the focused one, else the front-most. */
export function pickWindow<K extends AppKind>(state: DesktopState, app: K, windowId?: number): AppWindowState & { view: ViewOf<K> } {
  const candidates = state.windows.filter((w) => w.app === app)
  const found =
    windowId !== undefined
      ? candidates.find((w) => w.id === windowId)
      : (candidates.find((w) => w.id === state.focusedWindowId) ?? candidates.at(-1))
  if (!found) {
    const what = windowId === undefined ? `No ${APP_DISPLAY_NAMES[app]} window is open` : `Window ${windowId} is not an open ${APP_DISPLAY_NAMES[app]} window`
    throw new AppError(`${what}. Call desktop_state to see the windows.`)
  }
  return found as AppWindowState & { view: ViewOf<K> }
}

export const isOpenable = (app: AppKind): app is AgentOpenableApp => (AGENT_OPENABLE_APPS as readonly AppKind[]).includes(app)

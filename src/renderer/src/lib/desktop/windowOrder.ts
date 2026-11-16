/** Pure z-order, focus and taskbar logic over `DesktopState.windows` (back to front). */
import type { Id } from '@shared/models'
import type { AppKind, AppWindowState } from '@shared/desktop'
import type { TaskbarItem } from '../kit/organisms/Taskbar.svelte'

/** Moves a window to the front (end of the list) and returns the new list. */
export function raise(windows: readonly AppWindowState[], id: Id): AppWindowState[] {
  const target = windows.find((w) => w.id === id)
  return target ? [...windows.filter((w) => w !== target), target] : [...windows]
}

/** The window that should get focus after `closingId` goes away or minimises: the topmost visible one. */
export function nextFocus(windows: readonly AppWindowState[], closingId?: Id): Id | null {
  for (let i = windows.length - 1; i >= 0; i--) {
    const w = windows[i]
    if (w.id !== closingId && w.windowState !== 'minimized') return w.id
  }
  return null
}

/** Windows that are drawn (everything but minimised), back to front. */
export const visibleWindows = (windows: readonly AppWindowState[]): AppWindowState[] => windows.filter((w) => w.windowState !== 'minimized')

export type TaskbarAction = 'focus' | 'minimize' | 'restore'

/** Click on a taskbar button: minimised -> restore, focused -> minimise, otherwise bring to front. */
export function taskbarAction(w: AppWindowState, focusedId: Id | null): TaskbarAction {
  if (w.windowState === 'minimized') return 'restore'
  return w.id === focusedId ? 'minimize' : 'focus'
}

/** The caption of a taskbar button: a chat that waits for an answer starts with "Waiting: ". */
export function taskbarTitle(w: AppWindowState, waitingChats: ReadonlySet<Id>): string {
  return w.view.app === 'chat' && waitingChats.has(w.view.sessionId) ? `Waiting: ${w.title}` : w.title
}

/**
 * One button per window, in the order the windows were opened (not z-order), so the bar does not jump on focus.
 * `waitingChats` are the sessions that wait for an approval.
 */
export function taskbarItems(
  windows: readonly AppWindowState[],
  focusedId: Id | null,
  icons: Partial<Record<AppKind, TaskbarItem['icon']>>,
  waitingChats: ReadonlySet<Id> = new Set()
): TaskbarItem[] {
  return [...windows]
    .sort((a, b) => a.id - b.id)
    .map((w) => ({
      id: String(w.id),
      title: taskbarTitle(w, waitingChats),
      testid: `taskbar-item-${w.app}`,
      icon: icons[w.app],
      running: true,
      active: w.id === focusedId && w.windowState !== 'minimized',
      flashing: w.attention === true && w.id !== focusedId
    }))
}

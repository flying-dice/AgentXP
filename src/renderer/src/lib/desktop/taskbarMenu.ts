/** The context menu of a taskbar button (Win7 system menu subset): Restore, Minimize, Close window. */
import type { WindowState } from '@shared/desktop'
import type { MenuItemDef } from '../kit/molecules/MenuItem'

export interface TaskbarMenuActions {
  restore: () => void
  minimize: () => void
  close: () => void
}

export function taskbarMenuItems(state: WindowState, a: TaskbarMenuActions): MenuItemDef[] {
  return [
    { id: 'taskbar-ctx-restore', testid: 'taskbar-ctx-restore', label: '&Restore', disabled: state === 'normal', action: a.restore },
    { id: 'taskbar-ctx-minimize', testid: 'taskbar-ctx-minimize', label: 'Mi&nimize', disabled: state === 'minimized', action: a.minimize },
    { separator: true },
    { id: 'taskbar-ctx-close', testid: 'taskbar-ctx-close', label: '&Close window', shortcut: 'Alt+F4', action: a.close }
  ]
}

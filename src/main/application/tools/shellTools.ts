import { APP_DISPLAY_NAMES, type AppKind, type AppWindowState } from '@shared/desktop'
import { AppError } from '../errors'
import type { ToolPaths } from './ToolPaths'
import type { ToolHandlers } from './catalog'
import type { DesktopOps } from './ports'
import { attempt, errorResult, textResult } from './types'
import { isOpenable } from './windows'

export interface ShellToolsDeps {
  desktops: DesktopOps
  paths: ToolPaths
  /** Puts a permission request in front of the user; true when allowed. */
  ask(sessionId: number, title: string, reason: string): Promise<boolean>
}

const describe = (w: AppWindowState): string => `${APP_DISPLAY_NAMES[w.app]} window ${w.id} ("${w.title}")`

/** desktop_*: always available. Opening apps follows the Control Centre policy "Agent may open apps". */
export function createShellTools({ desktops, paths, ask }: ShellToolsDeps): ToolHandlers<'desktop_state' | 'drives_list' | 'desktop_open_app' | 'desktop_close_app' | 'desktop_focus_app'> {
  /** The windows a close/focus call means; only apps the agent may handle. */
  const targets = (desktopId: number, args: { window?: number; app?: AppKind }): AppWindowState[] => {
    const windows = desktops.state(desktopId).windows
    if (args.window !== undefined) {
      const found = windows.find((w) => w.id === args.window)
      if (!found) throw new AppError(`Window ${args.window} does not exist. Call desktop_state to see the windows.`)
      if (!isOpenable(found.app)) throw new AppError(`The ${APP_DISPLAY_NAMES[found.app]} window belongs to the user.`)
      return [found]
    }
    if (!args.app) throw new AppError('Pass a window id or an app.')
    const matching = windows.filter((w) => w.app === args.app)
    if (matching.length === 0) throw new AppError(`No ${APP_DISPLAY_NAMES[args.app]} window is open.`)
    return matching
  }

  return {
    desktop_state: async (_args, { desktopId }) => textResult(JSON.stringify(desktops.state(desktopId), null, 1)),

    drives_list: async (_args, { desktopId }) => {
      const lines = desktops.state(desktopId).drives.map((d) =>
        d.kind === 'system'
          ? `${d.letter}:\\  ${d.label}: your private system disk (home: ${desktops.state(desktopId).home})`
          : `${d.letter}:\\  ${d.label}: USB drive, a project the user plugged in (can be ejected at any time)`
      )
      return textResult(lines.join('\n'))
    },

    desktop_open_app: async (args, context) => {
      const { desktopId, sessionId } = context
      const decision = desktops.policy().openApps
      if (decision === 'deny') return errorResult('Opening apps is blocked by the permission policy in Control Centre.')
      if (decision === 'ask') {
        const allowed = await ask(sessionId, `Open the ${APP_DISPLAY_NAMES[args.app]} app`, 'Agent may open apps is set to Ask in Control Centre')
        if (!allowed) return errorResult(`The user declined to open the ${APP_DISPLAY_NAMES[args.app]} app.`)
      }
      return attempt(() => {
        const path = args.path === undefined || args.path.trim() === '' ? undefined : paths.resolve(context, args.path)
        const window = desktops.openWindow({ desktopId, app: args.app, path, url: args.url }, 'agent')
        return textResult(`Opened ${describe(window)}. Its tools are available now; the tool list updates.`)
      })
    },

    desktop_close_app: (args, { desktopId }) =>
      attempt(() => {
        const closed = targets(desktopId, args)
        for (const w of closed) desktops.closeWindow(w.id)
        return textResult(`Closed ${closed.map(describe).join(', ')}.`)
      }),

    desktop_focus_app: (args, { desktopId }) =>
      attempt(() => {
        const [window] = targets(desktopId, args).slice(-1)
        desktops.focusWindow(window!.id)
        return textResult(`Focused ${describe(window!)}.`)
      })
  }
}

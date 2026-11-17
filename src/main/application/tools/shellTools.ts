import { isSafeRef } from '@shared/review'
import { APP_DISPLAY_NAMES, type AppKind, type AppWindowState } from '@shared/desktop'
import { AppError } from '../errors'
import type { ToolPaths } from './ToolPaths'
import type { ToolHandlers } from './catalog'
import type { DesktopOps } from './ports'
import { attempt, textResult } from './types'
import { isOpenable } from './windows'

export interface ShellToolsDeps {
  desktops: DesktopOps
  paths: ToolPaths
}

const describe = (w: AppWindowState): string => `${APP_DISPLAY_NAMES[w.app]} window ${w.id} ("${w.title}")`

/**
 * desktop_*: always available. Every window they open goes through `openOutputWindow` (behind the user's window, after
 * the Control Center policy "Agent may open apps"). There is no focus tool: only the operator moves the view.
 */
export function createShellTools({ desktops, paths }: ShellToolsDeps): ToolHandlers<'desktop_state' | 'drives_list' | 'desktop_open_app' | 'desktop_close_app' | 'review_open'> {
  /** The windows a close call means; only apps the agent may handle. */
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

    desktop_open_app: (args, context) =>
      attempt(async () => {
        const path = args.path === undefined || args.path.trim() === '' ? undefined : paths.resolve(context, args.path)
        const window = await desktops.openOutputWindow(context.sessionId, { desktopId: context.desktopId, app: args.app, path, url: args.url })
        return textResult(`Opened ${describe(window)} behind the user's window (its taskbar button flashes). Tools that need this window are available now; the tool list updates.`)
      }),

    review_open: (args, context) =>
      attempt(async () => {
        const { desktopId } = context
        const root = paths.resolve(context, args.path)
        const baseRef = args.baseRef?.trim() || 'HEAD'
        if (!isSafeRef(baseRef)) throw new AppError(`Not a valid git ref: ${baseRef}`)
        const open = desktops.state(desktopId).windows.find((w) => w.view.app === 'code-review' && w.view.root === root && w.view.baseRef === baseRef)
        if (!open) await desktops.assertMayOpen(context.sessionId, 'code-review')
        // An output window: it opens behind the user's window (or the open one is used where it is).
        const window = open ?? (await desktops.openReview(desktopId, root, baseRef, undefined, undefined, 'agent'))
        return textResult(
          `${open ? 'Using the open' : 'Opened a'} Code Review window ${window.id} for ${root} against ${baseRef}. Its tools are available now (the tool list updates): ` +
            'review_list_changes, review_read_diff, review_add_comment (your comments appear in that window) and review_submit. Review only; do not edit files.'
        )
      }),

    desktop_close_app: (args, { desktopId }) =>
      attempt(() => {
        const closed = targets(desktopId, args)
        for (const w of closed) desktops.closeWindow(w.id)
        return textResult(`Closed ${closed.map(describe).join(', ')}.`)
      })
  }
}

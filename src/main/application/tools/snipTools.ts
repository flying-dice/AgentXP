import type { ScreenCapturer } from '../ports'
import { AppError } from '../errors'
import type { ToolHandlers } from './catalog'
import { parseImageDataUrl } from './dataUrl'
import type { DesktopOps } from './ports'
import { attempt, imageResult } from './types'

export interface SnipToolsDeps {
  desktops: Pick<DesktopOps, 'state'>
  screen: ScreenCapturer
}

/** screen_capture: the whole desktop, or the area of one window. */
export function createSnipTools({ desktops, screen }: SnipToolsDeps): ToolHandlers<'screen_capture'> {
  return {
    screen_capture: ({ windowId }, { desktopId }) =>
      attempt(async () => {
        const window = windowId === undefined ? null : desktops.state(desktopId).windows.find((w) => w.id === windowId)
        if (windowId !== undefined && !window) throw new AppError(`Window ${windowId} does not exist. Call desktop_state to see the windows.`)
        const { data, mimeType } = parseImageDataUrl(await screen.capture(desktopId, window?.bounds))
        return imageResult(data, mimeType, window ? `Screenshot of "${window.title}".` : 'Screenshot of the desktop.')
      })
  }
}

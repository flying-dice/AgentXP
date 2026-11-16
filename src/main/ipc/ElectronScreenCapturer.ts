import type { WebContents } from 'electron'
import type { Bounds } from '@shared/desktop'
import type { Id } from '@shared/models'
import { AppError } from '../application/errors'
import type { ScreenCapturer } from '../application/ports'

/** Captures the renderer of a desktop's OS window with `webContents.capturePage`. */
export class ElectronScreenCapturer implements ScreenCapturer {
  constructor(private readonly windows: { webContentsOf(desktopId: Id): WebContents | null }) {}

  async capture(desktopId: Id, region?: Bounds): Promise<string> {
    const contents = this.windows.webContentsOf(desktopId)
    if (!contents) throw new AppError('The desktop window is not open, so there is nothing to capture.')
    const image = await contents.capturePage(region ? roundRect(region) : undefined)
    if (image.isEmpty()) throw new AppError('The capture came back empty (is the window minimised?).')
    return `data:image/png;base64,${image.toPNG().toString('base64')}`
  }
}

const roundRect = (b: Bounds): Electron.Rectangle => ({
  x: Math.max(0, Math.round(b.x)),
  y: Math.max(0, Math.round(b.y)),
  width: Math.max(1, Math.round(b.width)),
  height: Math.max(1, Math.round(b.height))
})

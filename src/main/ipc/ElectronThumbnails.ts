import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { net, protocol, type WebContents } from 'electron'
import type { Id } from '@shared/models'
import { THUMBNAIL_SCHEME, parseThumbnailUrl } from '../application/launcher/thumbnailUrl'
import type { ThumbnailCapturer } from '../application/launcher/ThumbnailService'
import type { FileThumbnailStore } from '../infrastructure/fs/FileThumbnailStore'

/** Must run before the app is ready: the launcher renderer loads `<img src="agent7-thumb://...">`. */
export function registerThumbnailScheme(): void {
  protocol.registerSchemesAsPrivileged([{ scheme: THUMBNAIL_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }])
}

/** Serves `agent7-thumb://desktop/<id>.png` from the thumbnail files; nothing else. Call after the app is ready. */
export function handleThumbnailScheme(store: FileThumbnailStore): void {
  protocol.handle(THUMBNAIL_SCHEME, (request) => {
    const id = parseThumbnailUrl(request.url)
    const file = id === null ? null : store.pathOf(id)
    if (file === null || !existsSync(file)) return new Response(null, { status: 404 })
    return net.fetch(pathToFileURL(file).href)
  })
}

/** Captures a desktop's window with `capturePage` and scales it to the thumbnail width. */
export class ElectronThumbnailCapturer implements ThumbnailCapturer {
  constructor(private readonly windows: { webContentsOf(desktopId: Id): WebContents | null }) {}

  async capturePng(desktopId: Id, width: number): Promise<Uint8Array | null> {
    const contents = this.windows.webContentsOf(desktopId)
    if (!contents || contents.isDestroyed()) return null
    const image = await contents.capturePage()
    if (image.isEmpty()) return null
    return image.resize({ width, quality: 'good' }).toPNG()
  }
}

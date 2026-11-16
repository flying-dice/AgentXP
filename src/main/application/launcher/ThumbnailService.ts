import type { Id } from '@shared/models'
import { thumbnailUrl, THUMBNAIL_WIDTH } from './thumbnailUrl'

/** Where thumbnails live: one PNG per desktop in its app-data folder (a file, not a DB column). */
export interface ThumbnailStore {
  write(desktopId: Id, png: Uint8Array): Promise<void>
  /** Version of the stored thumbnail (its modification time in ms); null when there is none. */
  version(desktopId: Id): number | null
}

/** Captures a desktop's OS window as a PNG of the given width; null when the window is not open or shows nothing. */
export interface ThumbnailCapturer {
  capturePng(desktopId: Id, width: number): Promise<Uint8Array | null>
}

export interface ThumbnailServiceDeps {
  store: ThumbnailStore
  capturer: ThumbnailCapturer
  /** The desktops that have an OS window. */
  connected(): Id[]
  /** A thumbnail was written (the launcher list changes). */
  updated(desktopId: Id): void
  intervalMs?: number
  setInterval?: (run: () => void, ms: number) => unknown
  clearInterval?: (handle: unknown) => void
}

export const THUMBNAIL_INTERVAL_MS = 60_000

/** Thumbnails for the launcher: on disconnect (`captureNow`) and every minute while a desktop is connected. */
export class ThumbnailService {
  private timer: unknown = null

  constructor(private readonly deps: ThumbnailServiceDeps) {}

  /** `file`-less URL the launcher renderer loads, or null before the first capture. */
  urlOf(desktopId: Id): string | null {
    const version = this.deps.store.version(desktopId)
    return version === null ? null : thumbnailUrl(desktopId, version)
  }

  /** Never throws: a failed capture keeps the previous thumbnail. */
  async captureNow(desktopId: Id): Promise<void> {
    try {
      const png = await this.deps.capturer.capturePng(desktopId, THUMBNAIL_WIDTH)
      if (!png || png.length === 0) return
      await this.deps.store.write(desktopId, png)
      this.deps.updated(desktopId)
    } catch {
      // The window went away or the disk is full; the old thumbnail stays.
    }
  }

  start(): void {
    if (this.timer !== null) return
    const every = this.deps.setInterval ?? ((run, ms) => setInterval(run, ms))
    this.timer = every(() => void this.captureConnected(), this.deps.intervalMs ?? THUMBNAIL_INTERVAL_MS)
  }

  stop(): void {
    if (this.timer === null) return
    ;(this.deps.clearInterval ?? ((handle) => clearInterval(handle as ReturnType<typeof setInterval>)))(this.timer)
    this.timer = null
  }

  private async captureConnected(): Promise<void> {
    for (const id of this.deps.connected()) await this.captureNow(id)
  }
}

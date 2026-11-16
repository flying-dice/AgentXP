import { statSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Id } from '@shared/models'
import { THUMBNAIL_FILE } from '../../application/launcher/thumbnailUrl'
import type { ThumbnailStore } from '../../application/launcher/ThumbnailService'

/** `<desktopsDir>/<id>/thumbnail.png`: a file next to the desktop's C: disk, deleted with the desktop. */
export class FileThumbnailStore implements ThumbnailStore {
  constructor(private readonly desktopsDir: string) {}

  pathOf(desktopId: Id): string {
    return join(this.desktopsDir, String(desktopId), THUMBNAIL_FILE)
  }

  async write(desktopId: Id, png: Uint8Array): Promise<void> {
    await mkdir(join(this.desktopsDir, String(desktopId)), { recursive: true })
    await writeFile(this.pathOf(desktopId), png)
  }

  version(desktopId: Id): number | null {
    try {
      return Math.trunc(statSync(this.pathOf(desktopId)).mtimeMs)
    } catch {
      return null
    }
  }
}

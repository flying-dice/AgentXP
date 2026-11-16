import type { Id } from '@shared/models'

/** Custom protocol that serves a desktop's thumbnail PNG from its app-data folder to the launcher renderer. */
export const THUMBNAIL_SCHEME = 'agent7-thumb'
export const THUMBNAIL_HOST = 'desktop'
export const THUMBNAIL_WIDTH = 320
export const THUMBNAIL_FILE = 'thumbnail.png'

/** `agent7-thumb://desktop/<id>.png?v=<version>`; the version (file mtime) busts the renderer's image cache. */
export const thumbnailUrl = (desktopId: Id, version: number): string => `${THUMBNAIL_SCHEME}://${THUMBNAIL_HOST}/${desktopId}.png?v=${Math.trunc(version)}`

/** The desktop id of a thumbnail URL; null for any other URL. */
export function parseThumbnailUrl(url: string): Id | null {
  const match = new RegExp(`^${THUMBNAIL_SCHEME}://${THUMBNAIL_HOST}/(\\d+)\\.png(?:\\?.*)?$`).exec(url)
  return match ? Number(match[1]) : null
}

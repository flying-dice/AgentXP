import { sql as initial } from './001_initial'
import { sql as desktops } from './002_desktops'
import { sql as desktopExtras } from './003_desktop_extras'
import { sql as virtualFs } from './004_virtual_fs'
import { sql as surfaceWindows } from './005_surface_windows'

export interface Migration {
  /** Strictly increasing; stored in `PRAGMA user_version`. */
  version: number
  name: string
  sql: string
  /**
   * Rebuilds tables other tables point at (DROP + RENAME). `migrate` turns foreign keys off around it (they cannot be
   * changed inside a transaction) and runs `PRAGMA foreign_key_check` before committing.
   */
  rebuildsTables?: boolean
}

export const MIGRATIONS: readonly Migration[] = [
  { version: 1, name: 'initial', sql: initial },
  { version: 2, name: 'desktops', sql: desktops },
  { version: 3, name: 'desktop_extras', sql: desktopExtras },
  { version: 4, name: 'virtual_fs', sql: virtualFs, rebuildsTables: true },
  { version: 5, name: 'surface_windows', sql: surfaceWindows }
]

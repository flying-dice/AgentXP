import { sql as initial } from './001_initial'
import { sql as desktops } from './002_desktops'
import { sql as desktopExtras } from './003_desktop_extras'

export interface Migration {
  /** Strictly increasing; stored in `PRAGMA user_version`. */
  version: number
  name: string
  sql: string
}

export const MIGRATIONS: readonly Migration[] = [
  { version: 1, name: 'initial', sql: initial },
  { version: 2, name: 'desktops', sql: desktops },
  { version: 3, name: 'desktop_extras', sql: desktopExtras }
]

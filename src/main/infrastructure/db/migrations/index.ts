import { sql as initial } from './001_initial'

export interface Migration {
  /** Strictly increasing; stored in `PRAGMA user_version`. */
  version: number
  name: string
  sql: string
}

export const MIGRATIONS: readonly Migration[] = [{ version: 1, name: 'initial', sql: initial }]

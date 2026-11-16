import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { migrate } from './migrate'

const BUSY_TIMEOUT_MS = 5000

function ensureDirectory(path: string): void {
  if (path !== ':memory:' && path !== '') mkdirSync(dirname(path), { recursive: true })
}

/** Opens (creating if needed) the database, configures pragmas and runs migrations. */
export function openDatabase(path: string): Database.Database {
  ensureDirectory(path)
  const db = new Database(path)
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')
  db.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`)
  migrate(db)
  return db
}

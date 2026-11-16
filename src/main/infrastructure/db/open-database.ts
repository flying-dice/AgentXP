import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { migrate } from './migrate'
import { openRaw, type Database } from './sql'

const BUSY_TIMEOUT_MS = 5000

function ensureDirectory(path: string): void {
  if (path !== ':memory:' && path !== '') mkdirSync(dirname(path), { recursive: true })
}

/** Opens (creating if needed) the database, configures pragmas and runs migrations. */
export function openDatabase(path: string): Database {
  ensureDirectory(path)
  const db = openRaw(path)
  db.exec('PRAGMA foreign_keys = ON')
  // WAL is unavailable for in-memory databases; SQLite then silently keeps journal_mode 'memory'.
  db.exec('PRAGMA journal_mode = WAL')
  db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`)
  migrate(db)
  return db
}

import { DatabaseSync, type StatementSync } from 'node:sqlite'

/** The one place the SQLite driver is named; everything else imports this alias. */
export type Database = DatabaseSync

export function openRaw(path: string): Database {
  return new DatabaseSync(path)
}

type Args<P> = P extends readonly unknown[] ? P : [P]

/**
 * Typed view over `StatementSync`. `P` is the parameter tuple (positional) or a single
 * object (named, bare names), `R` the row shape. Rows are plain column/value records;
 * INTEGER columns come back as numbers, BLOBs as Uint8Array.
 */
export interface Statement<P extends readonly unknown[] | object = [], R = unknown> {
  run(...params: Args<P>): { changes: number; lastInsertRowid: number }
  get(...params: Args<P>): R | undefined
  all(...params: Args<P>): R[]
}

export function prepare<P extends readonly unknown[] | object = [], R = unknown>(db: Database, sql: string): Statement<P, R> {
  const statement: StatementSync = db.prepare(sql)
  return statement as unknown as Statement<P, R>
}

let savepointCounter = 0

/**
 * Runs `fn` atomically: BEGIN IMMEDIATE / COMMIT / ROLLBACK, or a SAVEPOINT when already
 * inside a transaction (so calls nest safely).
 */
export function transaction<T>(db: Database, fn: () => T): T {
  const nested = db.isTransaction
  const savepoint = `sp_${++savepointCounter}`
  db.exec(nested ? `SAVEPOINT ${savepoint}` : 'BEGIN IMMEDIATE')
  try {
    const result = fn()
    db.exec(nested ? `RELEASE ${savepoint}` : 'COMMIT')
    return result
  } catch (error) {
    try {
      db.exec(nested ? `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}` : 'ROLLBACK')
    } catch {
      // The original error is the one worth surfacing.
    }
    throw error
  }
}

/** Reads a single-value pragma such as `user_version` or `foreign_keys`. */
export function readPragma(db: Database, name: string): number | string {
  const row = db.prepare(`PRAGMA ${name}`).get() as Record<string, number | string> | undefined
  return row ? Object.values(row)[0] : 0
}

/** SQL expression producing an ISO-8601 UTC timestamp with millisecond precision. */
export const NOW_SQL = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`

/** Encodes ids for `WHERE col IN (SELECT value FROM json_each(?))` so one cached statement serves any id count. */
export function idsJson(ids: readonly number[]): string {
  return JSON.stringify(ids)
}

export function groupBy<T>(rows: readonly T[], key: (row: T) => number): Map<number, T[]> {
  const groups = new Map<number, T[]>()
  for (const row of rows) {
    const k = key(row)
    const bucket = groups.get(k)
    if (bucket) bucket.push(row)
    else groups.set(k, [row])
  }
  return groups
}

import type { Database } from 'better-sqlite3'
import { MIGRATIONS, type Migration } from './migrations'

function currentVersion(db: Database): number {
  return db.pragma('user_version', { simple: true }) as number
}

function assertOrdered(migrations: readonly Migration[]): void {
  migrations.forEach((m, i) => {
    if (i > 0 && m.version <= migrations[i - 1].version) {
      throw new Error(`Migrations must be strictly ordered: ${m.version} after ${migrations[i - 1].version}`)
    }
  })
}

function apply(db: Database, migration: Migration): void {
  db.transaction(() => {
    db.exec(migration.sql)
    db.pragma(`user_version = ${Math.trunc(migration.version)}`)
  })()
}

/** Applies pending migrations in order, each atomically. Returns the resulting schema version. */
export function migrate(db: Database, migrations: readonly Migration[] = MIGRATIONS): number {
  assertOrdered(migrations)
  const from = currentVersion(db)
  migrations.filter((m) => m.version > from).forEach((m) => apply(db, m))
  return currentVersion(db)
}

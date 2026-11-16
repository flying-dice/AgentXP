import { readPragma, transaction, type Database } from './sql'
import { MIGRATIONS, type Migration } from './migrations'

function currentVersion(db: Database): number {
  return Number(readPragma(db, 'user_version'))
}

function assertOrdered(migrations: readonly Migration[]): void {
  migrations.forEach((m, i) => {
    if (i > 0 && m.version <= migrations[i - 1].version) {
      throw new Error(`Migrations must be strictly ordered: ${m.version} after ${migrations[i - 1].version}`)
    }
  })
}

function apply(db: Database, migration: Migration): void {
  transaction(db, () => {
    db.exec(migration.sql)
    db.exec(`PRAGMA user_version = ${Math.trunc(migration.version)}`)
  })
}

/** Applies pending migrations in order, each atomically. Returns the resulting schema version. */
export function migrate(db: Database, migrations: readonly Migration[] = MIGRATIONS): number {
  assertOrdered(migrations)
  const from = currentVersion(db)
  migrations.filter((m) => m.version > from).forEach((m) => apply(db, m))
  return currentVersion(db)
}

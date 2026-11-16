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
  // foreign_keys cannot be changed inside a transaction, and DROP TABLE would cascade with it on.
  const restore = migration.rebuildsTables ? Number(readPragma(db, 'foreign_keys')) : null
  if (restore !== null) db.exec('PRAGMA foreign_keys = OFF')
  try {
    transaction(db, () => {
      db.exec(migration.sql)
      if (restore !== null) assertNoForeignKeyViolations(db, migration)
      db.exec(`PRAGMA user_version = ${Math.trunc(migration.version)}`)
    })
  } finally {
    if (restore !== null) db.exec(`PRAGMA foreign_keys = ${restore === 1 ? 'ON' : 'OFF'}`)
  }
}

function assertNoForeignKeyViolations(db: Database, migration: Migration): void {
  const violations = db.prepare('PRAGMA foreign_key_check').all()
  if (violations.length > 0) throw new Error(`Migration ${migration.version} (${migration.name}) left ${violations.length} foreign key violations`)
}

/** Applies pending migrations in order, each atomically. Returns the resulting schema version. */
export function migrate(db: Database, migrations: readonly Migration[] = MIGRATIONS): number {
  assertOrdered(migrations)
  const from = currentVersion(db)
  migrations.filter((m) => m.version > from).forEach((m) => apply(db, m))
  return currentVersion(db)
}

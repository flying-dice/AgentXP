import { describe, expect, it } from 'vitest'
import { migrate } from './migrate'
import { MIGRATIONS } from './migrations'
import { openRaw } from './sql'

describe('migration 012 (old text error)', () => {
  it('adds the reason a file could not be read to saved changes, on top of an existing database', () => {
    const db = openRaw(':memory:')
    db.exec('PRAGMA foreign_keys = ON')
    migrate(db, MIGRATIONS.filter((m) => m.version < 12))
    migrate(db)
    expect(MIGRATIONS.find((m) => m.version === 12)).toMatchObject({ name: 'old_text_error' })
    const columns = db.prepare('PRAGMA table_info(tool_call_contents)').all() as Array<{ name: string }>
    expect(columns.map((c) => c.name)).toContain('old_text_error')
  })
})

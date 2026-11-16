import { prepare, type Database, type Statement } from './sql'
import type { SettingsRepository } from '../../domain/repositories/settings-repository'
import { NOW_SQL } from './sql'

export class SqliteSettingsRepository implements SettingsRepository {
  private readonly selectValue: Statement<[string], { value: string }>
  private readonly selectAll: Statement<[], { key: string; value: string }>
  private readonly upsert: Statement<[string, string]>
  private readonly remove: Statement<[string]>

  constructor(db: Database) {
    this.selectValue = prepare(db, 'SELECT value FROM settings WHERE key = ?')
    this.selectAll = prepare(db, 'SELECT key, value FROM settings ORDER BY key')
    this.upsert = prepare(db, 
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = ${NOW_SQL}`
    )
    this.remove = prepare(db, 'DELETE FROM settings WHERE key = ?')
  }

  get(key: string): string | null {
    return this.selectValue.get(key)?.value ?? null
  }

  set(key: string, value: string): void {
    this.upsert.run(key, value)
  }

  delete(key: string): boolean {
    return this.remove.run(key).changes > 0
  }

  all(): Record<string, string> {
    return Object.fromEntries(this.selectAll.all().map((r) => [r.key, r.value]))
  }
}

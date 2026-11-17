import type { Id } from '@shared/models'
import type { SkillDto } from '@shared/teams'
import type { SkillRepository } from '../../domain/repositories/teams-repositories'
import { prepare, type Database } from './sql'

interface Row {
  id: number
  name: string
  description: string
  path: string
  enabled: number
  installed_at: string
}

const toDto = (r: Row): SkillDto => ({ id: r.id, name: r.name, description: r.description, path: r.path, enabled: r.enabled === 1, installedAt: r.installed_at })
const COLS = 'id, name, description, path, enabled, installed_at'

export class SqliteSkillRepository implements SkillRepository {
  constructor(private readonly db: Database) {}

  list(): SkillDto[] {
    return prepare<[], Row>(this.db, `SELECT ${COLS} FROM skills ORDER BY name COLLATE NOCASE`).all().map(toDto)
  }

  get(id: Id): SkillDto | null {
    const row = prepare<[Id], Row>(this.db, `SELECT ${COLS} FROM skills WHERE id = ?`).get(id)
    return row ? toDto(row) : null
  }

  getByName(name: string): SkillDto | null {
    const row = prepare<[string], Row>(this.db, `SELECT ${COLS} FROM skills WHERE name = ? COLLATE NOCASE`).get(name)
    return row ? toDto(row) : null
  }

  add(input: { name: string; description: string; path: string }): SkillDto {
    const id = Number(prepare<[string, string, string]>(this.db, 'INSERT INTO skills (name, description, path) VALUES (?, ?, ?)').run(input.name, input.description, input.path).lastInsertRowid)
    const skill = this.get(id)
    if (!skill) throw new Error(`Skill ${id} vanished after write`)
    return skill
  }

  remove(id: Id): boolean {
    return prepare<[Id]>(this.db, 'DELETE FROM skills WHERE id = ?').run(id).changes > 0
  }

  setEnabled(id: Id, enabled: boolean): boolean {
    return prepare<[number, Id]>(this.db, 'UPDATE skills SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id).changes > 0
  }
}

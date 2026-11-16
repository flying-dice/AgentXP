import type { Id } from '@shared/models'
import type { DesktopRecord, DesktopRepository, NewDesktop } from '../../domain/repositories/desktop-repository'
import { prepare, type Database, type Statement } from './sql'

interface DesktopRow {
  id: number
  folder_id: number
  agent_id: number | null
  title: string
  is_open: number
  paused: number
  user_in_control: number
  created_at: string
}

const COLUMNS = 'id, folder_id, agent_id, title, is_open, paused, user_in_control, created_at'

const toRecord = (row: DesktopRow): DesktopRecord => ({
  id: row.id,
  folderId: row.folder_id,
  agentId: row.agent_id,
  title: row.title,
  isOpen: row.is_open === 1,
  paused: row.paused === 1,
  userInControl: row.user_in_control === 1,
  createdAt: row.created_at
})

export class SqliteDesktopRepository implements DesktopRepository {
  private readonly selectAll: Statement<[], DesktopRow>
  private readonly selectOpen: Statement<[], DesktopRow>
  private readonly selectById: Statement<[Id], DesktopRow>
  private readonly selectByFolder: Statement<[Id], DesktopRow>
  private readonly insert: Statement<[Id, Id | null, string, number]>
  private readonly updateTitle: Statement<[string, Id]>
  private readonly updateFlag: Record<'is_open' | 'paused' | 'user_in_control', Statement<[number, Id]>>
  private readonly remove_: Statement<[Id]>

  constructor(db: Database) {
    this.selectAll = prepare(db, `SELECT ${COLUMNS} FROM desktops ORDER BY id`)
    this.selectOpen = prepare(db, `SELECT ${COLUMNS} FROM desktops WHERE is_open = 1 ORDER BY id`)
    this.selectById = prepare(db, `SELECT ${COLUMNS} FROM desktops WHERE id = ?`)
    this.selectByFolder = prepare(db, `SELECT ${COLUMNS} FROM desktops WHERE folder_id = ? ORDER BY id LIMIT 1`)
    this.insert = prepare(db, 'INSERT INTO desktops (folder_id, agent_id, title, is_open) VALUES (?, ?, ?, ?)')
    this.updateTitle = prepare(db, 'UPDATE desktops SET title = ? WHERE id = ?')
    const flag = (column: string): Statement<[number, Id]> => prepare(db, `UPDATE desktops SET ${column} = ? WHERE id = ?`)
    this.updateFlag = { is_open: flag('is_open'), paused: flag('paused'), user_in_control: flag('user_in_control') }
    this.remove_ = prepare(db, 'DELETE FROM desktops WHERE id = ?')
  }

  list(): DesktopRecord[] {
    return this.selectAll.all().map(toRecord)
  }

  listOpen(): DesktopRecord[] {
    return this.selectOpen.all().map(toRecord)
  }

  get(id: Id): DesktopRecord | null {
    const row = this.selectById.get(id)
    return row ? toRecord(row) : null
  }

  findByFolder(folderId: Id): DesktopRecord | null {
    const row = this.selectByFolder.get(folderId)
    return row ? toRecord(row) : null
  }

  create(input: NewDesktop): DesktopRecord {
    const id = Number(this.insert.run(input.folderId, input.agentId, input.title, input.isOpen ? 1 : 0).lastInsertRowid)
    const record = this.get(id)
    if (!record) throw new Error(`Desktop ${id} vanished after insert`)
    return record
  }

  rename(id: Id, title: string): void {
    this.updateTitle.run(title, id)
  }

  setOpen(id: Id, isOpen: boolean): void {
    this.updateFlag.is_open.run(isOpen ? 1 : 0, id)
  }

  setPaused(id: Id, paused: boolean): void {
    this.updateFlag.paused.run(paused ? 1 : 0, id)
  }

  setUserInControl(id: Id, on: boolean): void {
    this.updateFlag.user_in_control.run(on ? 1 : 0, id)
  }

  remove(id: Id): boolean {
    return this.remove_.run(id).changes > 0
  }
}

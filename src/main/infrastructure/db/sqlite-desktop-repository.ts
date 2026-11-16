import type { Id } from '@shared/models'
import type { DesktopRecord, DesktopRepository, NewDesktop } from '../../domain/repositories/desktop-repository'
import { NOW_SQL, prepare, type Database, type Statement } from './sql'

interface DesktopRow {
  id: number
  agent_id: number | null
  title: string
  is_open: number
  paused: number
  user_in_control: number
  created_at: string
  last_used_at: string
}

const COLUMNS = 'id, agent_id, title, is_open, paused, user_in_control, created_at, last_used_at'

const toRecord = (row: DesktopRow): DesktopRecord => ({
  id: row.id,
  agentId: row.agent_id,
  title: row.title,
  isOpen: row.is_open === 1,
  paused: row.paused === 1,
  userInControl: row.user_in_control === 1,
  createdAt: row.created_at,
  lastUsedAt: row.last_used_at
})

export class SqliteDesktopRepository implements DesktopRepository {
  private readonly selectAll: Statement<[], DesktopRow>
  private readonly selectOpen: Statement<[], DesktopRow>
  private readonly selectById: Statement<[Id], DesktopRow>
  private readonly insert: Statement<[Id | null, string, number]>
  private readonly closeAll_: Statement<[]>
  private readonly touch_: Statement<[Id]>
  private readonly updateTitle: Statement<[string, Id]>
  private readonly updateFlag: Record<'is_open' | 'paused' | 'user_in_control', Statement<[number, Id]>>
  private readonly remove_: Statement<[Id]>
  private readonly selectStopped: Statement<[Id], { session_id: number }>
  private readonly insertStopped: Statement<[Id, Id]>
  private readonly clearStopped: Statement<[Id]>

  constructor(db: Database) {
    this.selectAll = prepare(db, `SELECT ${COLUMNS} FROM desktops ORDER BY id`)
    this.selectOpen = prepare(db, `SELECT ${COLUMNS} FROM desktops WHERE is_open = 1 ORDER BY id`)
    this.selectById = prepare(db, `SELECT ${COLUMNS} FROM desktops WHERE id = ?`)
    this.insert = prepare(db, 'INSERT INTO desktops (agent_id, title, is_open) VALUES (?, ?, ?)')
    this.closeAll_ = prepare(db, 'UPDATE desktops SET is_open = 0 WHERE is_open = 1')
    this.touch_ = prepare(db, `UPDATE desktops SET last_used_at = ${NOW_SQL} WHERE id = ?`)
    this.updateTitle = prepare(db, 'UPDATE desktops SET title = ? WHERE id = ?')
    const flag = (column: string): Statement<[number, Id]> => prepare(db, `UPDATE desktops SET ${column} = ? WHERE id = ?`)
    this.updateFlag = { is_open: flag('is_open'), paused: flag('paused'), user_in_control: flag('user_in_control') }
    this.remove_ = prepare(db, 'DELETE FROM desktops WHERE id = ?')
    this.selectStopped = prepare(db, 'SELECT session_id FROM desktop_stopped_chats WHERE desktop_id = ? ORDER BY rowid')
    this.insertStopped = prepare(db, 'INSERT OR IGNORE INTO desktop_stopped_chats (desktop_id, session_id) VALUES (?, ?)')
    this.clearStopped = prepare(db, 'DELETE FROM desktop_stopped_chats WHERE desktop_id = ?')
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

  create(input: NewDesktop): DesktopRecord {
    const id = Number(this.insert.run(input.agentId, input.title, input.isOpen ? 1 : 0).lastInsertRowid)
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

  closeAll(): void {
    this.closeAll_.run()
  }

  touch(id: Id): void {
    this.touch_.run(id)
  }

  setPaused(id: Id, paused: boolean): void {
    this.updateFlag.paused.run(paused ? 1 : 0, id)
  }

  setUserInControl(id: Id, on: boolean): void {
    this.updateFlag.user_in_control.run(on ? 1 : 0, id)
  }

  stoppedChats(id: Id): Id[] {
    return this.selectStopped.all(id).map((row) => row.session_id)
  }

  setStoppedChats(id: Id, sessionIds: readonly Id[]): void {
    this.clearStopped.run(id)
    for (const sessionId of sessionIds) this.insertStopped.run(id, sessionId)
  }

  remove(id: Id): boolean {
    return this.remove_.run(id).changes > 0
  }
}

import type { AppKind, Bounds, OpenedBy, WindowState } from '@shared/desktop'
import type { Id } from '@shared/models'
import type { AppWindowRecord, AppWindowRepository, NewAppWindow } from '../../domain/repositories/app-window-repository'
import { prepare, transaction, type Database, type Statement } from './sql'

interface WindowRow {
  id: number
  desktop_id: number
  kind: AppKind
  x: number
  y: number
  width: number
  height: number
  window_state: WindowState
  z_order: number
  opened_by: OpenedBy
  session_id: number | null
  path: string | null
  url: string | null
}

const SELECT = `
SELECT w.id, w.desktop_id, w.kind, w.x, w.y, w.width, w.height, w.window_state, w.z_order, w.opened_by,
       c.session_id AS session_id, p.relative_path AS path, b.url AS url
FROM app_windows w
LEFT JOIN chat_windows c ON c.window_id = w.id
LEFT JOIN path_windows p ON p.window_id = w.id
LEFT JOIN browser_windows b ON b.window_id = w.id`

const toRecord = (row: WindowRow): AppWindowRecord => ({
  id: row.id,
  desktopId: row.desktop_id,
  app: row.kind,
  bounds: { x: row.x, y: row.y, width: row.width, height: row.height },
  windowState: row.window_state,
  zOrder: row.z_order,
  openedBy: row.opened_by,
  sessionId: row.session_id,
  path: row.path,
  url: row.url
})

export class SqliteAppWindowRepository implements AppWindowRepository {
  private readonly selectByDesktop: Statement<[Id], WindowRow>
  private readonly selectById: Statement<[Id], WindowRow>
  private readonly selectChat: Statement<[Id], WindowRow>
  private readonly insertWindow: Statement<[Id, string, number, number, number, number, string, string, Id]>
  private readonly insertChat: Statement<[Id, Id]>
  private readonly upsertPath: Statement<[Id, string]>
  private readonly upsertUrl: Statement<[Id, string]>
  private readonly deletePath: Statement<[Id]>
  private readonly deleteWindow: Statement<[Id]>
  private readonly updateBounds: Statement<[number, number, number, number, Id]>
  private readonly updateState: Statement<[string, Id]>
  private readonly raiseWindow: Statement<[Id, Id]>
  private readonly nextZ: Statement<[Id], { z: number }>

  constructor(private readonly db: Database) {
    this.selectByDesktop = prepare(db, `${SELECT} WHERE w.desktop_id = ? ORDER BY w.z_order, w.id`)
    this.selectById = prepare(db, `${SELECT} WHERE w.id = ?`)
    this.selectChat = prepare(db, `${SELECT} WHERE c.session_id = ?`)
    this.nextZ = prepare(db, 'SELECT COALESCE(MAX(z_order), 0) + 1 AS z FROM app_windows WHERE desktop_id = ?')
    this.insertWindow = prepare(
      db,
      `INSERT INTO app_windows (desktop_id, kind, x, y, width, height, window_state, opened_by, z_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    this.insertChat = prepare(db, 'INSERT INTO chat_windows (window_id, session_id) VALUES (?, ?)')
    this.upsertPath = prepare(
      db,
      'INSERT INTO path_windows (window_id, relative_path) VALUES (?, ?) ON CONFLICT (window_id) DO UPDATE SET relative_path = excluded.relative_path'
    )
    this.upsertUrl = prepare(
      db,
      'INSERT INTO browser_windows (window_id, url) VALUES (?, ?) ON CONFLICT (window_id) DO UPDATE SET url = excluded.url'
    )
    this.deletePath = prepare(db, 'DELETE FROM path_windows WHERE window_id = ?')
    this.deleteWindow = prepare(db, 'DELETE FROM app_windows WHERE id = ?')
    this.updateBounds = prepare(db, 'UPDATE app_windows SET x = ?, y = ?, width = ?, height = ? WHERE id = ?')
    this.updateState = prepare(db, 'UPDATE app_windows SET window_state = ? WHERE id = ?')
    this.raiseWindow = prepare(
      db,
      'UPDATE app_windows SET z_order = (SELECT COALESCE(MAX(z_order), 0) + 1 FROM app_windows WHERE desktop_id = ?) WHERE id = ?'
    )
  }

  list(desktopId: Id): AppWindowRecord[] {
    return this.selectByDesktop.all(desktopId).map(toRecord)
  }

  get(id: Id): AppWindowRecord | null {
    const row = this.selectById.get(id)
    return row ? toRecord(row) : null
  }

  findChatWindow(sessionId: Id): AppWindowRecord | null {
    const row = this.selectChat.get(sessionId)
    return row ? toRecord(row) : null
  }

  create(input: NewAppWindow): AppWindowRecord {
    return transaction(this.db, () => {
      const z = this.nextZ.get(input.desktopId)?.z ?? 1
      const { x, y, width, height } = input.bounds
      const id = Number(
        this.insertWindow.run(input.desktopId, input.app, x, y, width, height, input.windowState, input.openedBy, z).lastInsertRowid
      )
      if (input.sessionId !== undefined) this.insertChat.run(id, input.sessionId)
      if (input.path != null) this.upsertPath.run(id, input.path)
      if (input.url !== undefined) this.upsertUrl.run(id, input.url)
      const record = this.get(id)
      if (!record) throw new Error(`Window ${id} vanished after insert`)
      return record
    })
  }

  remove(id: Id): boolean {
    return this.deleteWindow.run(id).changes > 0
  }

  setBounds(id: Id, b: Bounds): void {
    this.updateBounds.run(Math.round(b.x), Math.round(b.y), Math.max(1, Math.round(b.width)), Math.max(1, Math.round(b.height)), id)
  }

  setWindowState(id: Id, state: WindowState): void {
    this.updateState.run(state, id)
  }

  raise(id: Id): void {
    const window = this.get(id)
    if (window) this.raiseWindow.run(window.desktopId, id)
  }

  setPath(id: Id, path: string | null): void {
    if (path === null) this.deletePath.run(id)
    else this.upsertPath.run(id, path)
  }

  setUrl(id: Id, url: string): void {
    this.upsertUrl.run(id, url)
  }
}

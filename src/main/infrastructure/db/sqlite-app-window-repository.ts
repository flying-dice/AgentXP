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
  base_ref: string | null
  surface_id: string | null
  surface_session_id: number | null
}

const SELECT = `
SELECT w.id, w.desktop_id, w.kind, w.x, w.y, w.width, w.height, w.window_state, w.z_order, w.opened_by,
       c.session_id AS session_id, p.path AS path, p.base_ref AS base_ref, b.url AS url,
       sf.surface_id AS surface_id, sf.session_id AS surface_session_id
FROM app_windows w
LEFT JOIN chat_windows c ON c.window_id = w.id
LEFT JOIN path_windows p ON p.window_id = w.id
LEFT JOIN browser_windows b ON b.window_id = w.id
LEFT JOIN surface_windows sw ON sw.window_id = w.id
LEFT JOIN a2ui_surfaces sf ON sf.id = sw.surface_id`

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
  url: row.url,
  baseRef: row.base_ref,
  surface: row.surface_id !== null && row.surface_session_id !== null ? { sessionId: row.surface_session_id, surfaceId: row.surface_id } : null
})

export class SqliteAppWindowRepository implements AppWindowRepository {
  private readonly selectByDesktop: Statement<[Id], WindowRow>
  private readonly selectById: Statement<[Id], WindowRow>
  private readonly selectChat: Statement<[Id], WindowRow>
  private readonly insertWindow: Statement<[Id, string, number, number, number, number, string, string, Id]>
  private readonly selectSurface: Statement<[Id, string], WindowRow>
  private readonly insertChat: Statement<[Id, Id]>
  private readonly insertSurfaceWindow: Statement<[Id, Id, string]>
  private readonly upsertPath: Statement<[Id, string]>
  private readonly upsertUrl: Statement<[Id, string]>
  private readonly updateBaseRef: Statement<[string, Id]>
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
    this.selectSurface = prepare(db, `${SELECT} WHERE sf.session_id = ? AND sf.surface_id = ?`)
    this.insertSurfaceWindow = prepare(
      db,
      'INSERT INTO surface_windows (window_id, surface_id) SELECT ?, id FROM a2ui_surfaces WHERE session_id = ? AND surface_id = ?'
    )
    this.nextZ = prepare(db, 'SELECT COALESCE(MAX(z_order), 0) + 1 AS z FROM app_windows WHERE desktop_id = ?')
    this.insertWindow = prepare(
      db,
      `INSERT INTO app_windows (desktop_id, kind, x, y, width, height, window_state, opened_by, z_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    this.insertChat = prepare(db, 'INSERT INTO chat_windows (window_id, session_id) VALUES (?, ?)')
    this.upsertPath = prepare(
      db,
      'INSERT INTO path_windows (window_id, path) VALUES (?, ?) ON CONFLICT (window_id) DO UPDATE SET path = excluded.path'
    )
    this.upsertUrl = prepare(
      db,
      'INSERT INTO browser_windows (window_id, url) VALUES (?, ?) ON CONFLICT (window_id) DO UPDATE SET url = excluded.url'
    )
    this.updateBaseRef = prepare(db, 'UPDATE path_windows SET base_ref = ? WHERE window_id = ?')
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

  findSurfaceWindow(sessionId: Id, surfaceId: string): AppWindowRecord | null {
    const row = this.selectSurface.get(sessionId, surfaceId)
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
      if (input.surface) {
        const { sessionId, surfaceId } = input.surface
        if (this.insertSurfaceWindow.run(id, sessionId, surfaceId).changes === 0) throw new Error(`Surface ${surfaceId} does not exist`)
      }
      if (input.path != null) this.upsertPath.run(id, input.path)
      if (input.url !== undefined) this.upsertUrl.run(id, input.url)
      if (input.baseRef !== undefined) this.updateBaseRef.run(input.baseRef, id)
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

  setBaseRef(id: Id, baseRef: string): void {
    this.updateBaseRef.run(baseRef, id)
  }
}

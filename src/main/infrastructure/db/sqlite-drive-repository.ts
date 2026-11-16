import type { DriveLetter } from '@shared/vfs'
import type { Id } from '@shared/models'
import type { DriveRecord, DriveRepository } from '../../domain/repositories/drive-repository'
import { prepare, type Database, type Statement } from './sql'

interface Row {
  desktop_id: number
  letter: string
  folder_id: number
  plugged_at: string
}

const toRecord = (row: Row): DriveRecord => ({ desktopId: row.desktop_id, letter: row.letter, folderId: row.folder_id, pluggedAt: row.plugged_at })

export class SqliteDriveRepository implements DriveRepository {
  private readonly selectByDesktop: Statement<[Id], Row>
  private readonly selectOne: Statement<[Id, string], Row>
  private readonly insert: Statement<[Id, string, Id]>
  private readonly delete_: Statement<[Id, string]>
  private readonly selectDesktops: Statement<[Id], { desktop_id: number }>

  constructor(db: Database) {
    this.selectByDesktop = prepare(db, 'SELECT desktop_id, letter, folder_id, plugged_at FROM desktop_drives WHERE desktop_id = ? ORDER BY letter')
    this.selectOne = prepare(db, 'SELECT desktop_id, letter, folder_id, plugged_at FROM desktop_drives WHERE desktop_id = ? AND letter = ?')
    this.insert = prepare(db, 'INSERT INTO desktop_drives (desktop_id, letter, folder_id) VALUES (?, ?, ?)')
    this.delete_ = prepare(db, 'DELETE FROM desktop_drives WHERE desktop_id = ? AND letter = ?')
    this.selectDesktops = prepare(db, 'SELECT desktop_id FROM desktop_drives WHERE folder_id = ? ORDER BY desktop_id')
  }

  list(desktopId: Id): DriveRecord[] {
    return this.selectByDesktop.all(desktopId).map(toRecord)
  }

  add(desktopId: Id, letter: DriveLetter, folderId: Id): DriveRecord {
    this.insert.run(desktopId, letter, folderId)
    return toRecord(this.selectOne.get(desktopId, letter)!)
  }

  remove(desktopId: Id, letter: DriveLetter): boolean {
    return this.delete_.run(desktopId, letter).changes > 0
  }

  desktopsOfFolder(folderId: Id): Id[] {
    return this.selectDesktops.all(folderId).map((r) => r.desktop_id)
  }
}

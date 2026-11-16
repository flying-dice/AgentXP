import { prepare, transaction, type Database, type Statement } from './sql'
import type {
  AvailableCommandDto,
  Id,
  SessionDto,
  SessionModeDto,
  SessionModelDto,
  SessionStatus
} from '@shared/models'
import type { NewSession, SessionRepository } from '../../domain/repositories/session-repository'
import { AGENT_HOME } from '@shared/vfs'
import { NOW_SQL } from './sql'

interface SessionRow {
  id: number
  agent_id: number
  desktop_id: number | null
  cwd: string
  acp_session_id: string | null
  title: string
  status: SessionStatus
  current_mode_id: string | null
  current_model_id: string | null
  context_used: number
  context_size: number
  created_at: string
  updated_at: string
}

interface ListRow {
  name: string
  description: string | null
}
type ModeRow = { id: string } & ListRow
type CommandRow = { name: string; description: string; hint: string | null }

const COLUMNS = `id, agent_id, desktop_id, cwd, acp_session_id, title, status, current_mode_id,
  current_model_id, context_used, context_size, created_at, updated_at`

export class SqliteSessionRepository implements SessionRepository {
  private readonly selectAll: Statement<[], SessionRow>
  private readonly selectById: Statement<[Id], SessionRow>
  private readonly selectByDesktop: Statement<[Id], SessionRow>
  private readonly selectByAcp: Statement<[Id, string], SessionRow>
  private readonly insertSession: Statement<[Id, Id | null, string, string]>
  private readonly updateColumn: Record<
    'title' | 'status' | 'acp_session_id' | 'current_mode_id' | 'current_model_id',
    Statement<[string | null, Id]>
  >
  private readonly updateUsage: Statement<[number, number, Id]>
  private readonly touchSession: Statement<[Id]>
  private readonly deleteSession: Statement<[Id]>
  private readonly selectModes: Statement<[Id], ModeRow>
  private readonly selectModels: Statement<[Id], ModeRow>
  private readonly selectCommands: Statement<[Id], CommandRow>
  private readonly deleteModes: Statement<[Id]>
  private readonly deleteModels: Statement<[Id]>
  private readonly deleteCommands: Statement<[Id]>
  private readonly insertMode: Statement<[Id, number, string, string, string | null]>
  private readonly insertModel: Statement<[Id, number, string, string, string | null]>
  private readonly insertCommand: Statement<[Id, number, string, string, string | null]>

  constructor(private readonly db: Database) {
    const order = 'ORDER BY updated_at DESC, id DESC'
    this.selectAll = prepare(db, `SELECT ${COLUMNS} FROM sessions ${order}`)
    this.selectById = prepare(db, `SELECT ${COLUMNS} FROM sessions WHERE id = ?`)
    this.selectByDesktop = prepare(db, `SELECT ${COLUMNS} FROM sessions WHERE desktop_id = ? ${order}`)
    this.selectByAcp = prepare(db, `SELECT ${COLUMNS} FROM sessions WHERE agent_id = ? AND acp_session_id = ?`)
    this.insertSession = prepare(db, 'INSERT INTO sessions (agent_id, desktop_id, cwd, title) VALUES (?, ?, ?, ?)')
    const setter = (column: string): Statement<[string | null, Id]> =>
      prepare(db, `UPDATE sessions SET ${column} = ?, updated_at = ${NOW_SQL} WHERE id = ?`)
    this.updateColumn = {
      title: setter('title'),
      status: setter('status'),
      acp_session_id: setter('acp_session_id'),
      current_mode_id: setter('current_mode_id'),
      current_model_id: setter('current_model_id')
    }
    this.updateUsage = prepare(db, 
      `UPDATE sessions SET context_used = ?, context_size = ?, updated_at = ${NOW_SQL} WHERE id = ?`
    )
    this.touchSession = prepare(db, `UPDATE sessions SET updated_at = ${NOW_SQL} WHERE id = ?`)
    this.deleteSession = prepare(db, 'DELETE FROM sessions WHERE id = ?')
    this.selectModes = prepare(db, 
      'SELECT mode_id AS id, name, description FROM session_modes WHERE session_id = ? ORDER BY position'
    )
    this.selectModels = prepare(db, 
      'SELECT model_id AS id, name, description FROM session_models WHERE session_id = ? ORDER BY position'
    )
    this.selectCommands = prepare(db, 
      'SELECT name, description, hint FROM session_commands WHERE session_id = ? ORDER BY position'
    )
    this.deleteModes = prepare(db, 'DELETE FROM session_modes WHERE session_id = ?')
    this.deleteModels = prepare(db, 'DELETE FROM session_models WHERE session_id = ?')
    this.deleteCommands = prepare(db, 'DELETE FROM session_commands WHERE session_id = ?')
    this.insertMode = prepare(db, 
      'INSERT INTO session_modes (session_id, position, mode_id, name, description) VALUES (?, ?, ?, ?, ?)'
    )
    this.insertModel = prepare(db, 
      'INSERT INTO session_models (session_id, position, model_id, name, description) VALUES (?, ?, ?, ?, ?)'
    )
    this.insertCommand = prepare(db, 
      'INSERT INTO session_commands (session_id, position, name, description, hint) VALUES (?, ?, ?, ?, ?)'
    )
  }

  list(desktopId?: Id): SessionDto[] {
    const rows = desktopId === undefined ? this.selectAll.all() : this.selectByDesktop.all(desktopId)
    return rows.map((row) => this.toDto(row))
  }

  get(id: Id): SessionDto | null {
    const row = this.selectById.get(id)
    return row ? this.toDto(row) : null
  }

  listByDesktop(desktopId: Id): SessionDto[] {
    return this.selectByDesktop.all(desktopId).map((row) => this.toDto(row))
  }

  getByAcpSessionId(agentId: Id, acpSessionId: string): SessionDto | null {
    const row = this.selectByAcp.get(agentId, acpSessionId)
    return row ? this.toDto(row) : null
  }

  create(input: NewSession): SessionDto {
    const id = Number(this.insertSession.run(input.agentId, input.desktopId ?? null, input.cwd ?? AGENT_HOME, input.title).lastInsertRowid)
    const session = this.get(id)
    if (!session) throw new Error(`Session ${id} vanished after insert`)
    return session
  }

  rename(id: Id, title: string): void {
    this.updateColumn.title.run(title, id)
  }

  setStatus(id: Id, status: SessionStatus): void {
    this.updateColumn.status.run(status, id)
  }

  setAcpSessionId(id: Id, acpSessionId: string | null): void {
    this.updateColumn.acp_session_id.run(acpSessionId, id)
  }

  setCurrentMode(id: Id, modeId: string | null): void {
    this.updateColumn.current_mode_id.run(modeId, id)
  }

  setCurrentModel(id: Id, modelId: string | null): void {
    this.updateColumn.current_model_id.run(modelId, id)
  }

  replaceModes(id: Id, modes: SessionModeDto[]): void {
    this.replaceList(id, this.deleteModes, modes, (position, m) =>
      this.insertMode.run(id, position, m.id, m.name, m.description)
    )
  }

  replaceModels(id: Id, models: SessionModelDto[]): void {
    this.replaceList(id, this.deleteModels, models, (position, m) =>
      this.insertModel.run(id, position, m.id, m.name, m.description)
    )
  }

  replaceCommands(id: Id, commands: AvailableCommandDto[]): void {
    this.replaceList(id, this.deleteCommands, commands, (position, c) =>
      this.insertCommand.run(id, position, c.name, c.description, c.hint)
    )
  }

  setUsage(id: Id, contextUsed: number, contextSize: number): void {
    this.updateUsage.run(contextUsed, contextSize, id)
  }

  touch(id: Id): void {
    this.touchSession.run(id)
  }

  remove(id: Id): boolean {
    return this.deleteSession.run(id).changes > 0
  }

  private replaceList<T>(id: Id, clear: Statement<[Id]>, items: T[], insert: (position: number, item: T) => void): void {
    transaction(this.db, () => {
      clear.run(id)
      items.forEach((item, position) => insert(position, item))
      this.touchSession.run(id)
    })
  }

  private toDto(row: SessionRow): SessionDto {
    return {
      id: row.id,
      agentId: row.agent_id,
      desktopId: row.desktop_id,
      cwd: row.cwd,
      title: row.title,
      status: row.status,
      acpSessionId: row.acp_session_id,
      currentModeId: row.current_mode_id,
      currentModelId: row.current_model_id,
      modes: this.selectModes.all(row.id),
      models: this.selectModels.all(row.id),
      commands: this.selectCommands.all(row.id),
      contextUsed: row.context_used,
      contextSize: row.context_size,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}

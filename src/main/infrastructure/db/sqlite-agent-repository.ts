import type { Database, Statement } from 'better-sqlite3'
import type { AgentDto, Id } from '@shared/models'
import type { AgentRepository, NewAgent } from '../../domain/repositories/agent-repository'

interface AgentRow {
  id: number
  name: string
  command: string
  is_default: number
}

export class SqliteAgentRepository implements AgentRepository {
  private readonly selectAll: Statement<[], AgentRow>
  private readonly selectById: Statement<[Id], AgentRow>
  private readonly selectDefault: Statement<[], AgentRow>
  private readonly selectArgs: Statement<[Id], { value: string }>
  private readonly selectEnv: Statement<[Id], { key: string; value: string }>
  private readonly insertAgent: Statement<[string, string]>
  private readonly updateAgent: Statement<[string, string, Id]>
  private readonly insertArg: Statement<[Id, number, string]>
  private readonly insertEnv: Statement<[Id, string, string]>
  private readonly deleteArgs: Statement<[Id]>
  private readonly deleteEnv: Statement<[Id]>
  private readonly deleteAgent: Statement<[Id]>
  private readonly clearDefault: Statement<[]>
  private readonly markDefault: Statement<[Id]>

  constructor(private readonly db: Database) {
    const cols = 'id, name, command, is_default'
    this.selectAll = db.prepare(`SELECT ${cols} FROM agents ORDER BY id`)
    this.selectById = db.prepare(`SELECT ${cols} FROM agents WHERE id = ?`)
    this.selectDefault = db.prepare(`SELECT ${cols} FROM agents WHERE is_default = 1`)
    this.selectArgs = db.prepare('SELECT value FROM agent_args WHERE agent_id = ? ORDER BY position')
    this.selectEnv = db.prepare('SELECT key, value FROM agent_env WHERE agent_id = ? ORDER BY key')
    this.insertAgent = db.prepare('INSERT INTO agents (name, command) VALUES (?, ?)')
    this.updateAgent = db.prepare('UPDATE agents SET name = ?, command = ? WHERE id = ?')
    this.insertArg = db.prepare('INSERT INTO agent_args (agent_id, position, value) VALUES (?, ?, ?)')
    this.insertEnv = db.prepare('INSERT INTO agent_env (agent_id, key, value) VALUES (?, ?, ?)')
    this.deleteArgs = db.prepare('DELETE FROM agent_args WHERE agent_id = ?')
    this.deleteEnv = db.prepare('DELETE FROM agent_env WHERE agent_id = ?')
    this.deleteAgent = db.prepare('DELETE FROM agents WHERE id = ?')
    this.clearDefault = db.prepare('UPDATE agents SET is_default = 0 WHERE is_default = 1')
    this.markDefault = db.prepare('UPDATE agents SET is_default = 1 WHERE id = ?')
  }

  list(): AgentDto[] {
    return this.selectAll.all().map((row) => this.toDto(row))
  }

  get(id: Id): AgentDto | null {
    const row = this.selectById.get(id)
    return row ? this.toDto(row) : null
  }

  getDefault(): AgentDto | null {
    const row = this.selectDefault.get()
    return row ? this.toDto(row) : null
  }

  create(input: NewAgent): AgentDto {
    const id = this.db.transaction(() => {
      const newId = Number(this.insertAgent.run(input.name, input.command).lastInsertRowid)
      this.writeChildren(newId, input)
      return newId
    })()
    return this.require(id)
  }

  update(id: Id, input: NewAgent): AgentDto | null {
    this.db.transaction(() => {
      if (this.updateAgent.run(input.name, input.command, id).changes === 0) return
      this.deleteArgs.run(id)
      this.deleteEnv.run(id)
      this.writeChildren(id, input)
    })()
    return this.get(id)
  }

  remove(id: Id): boolean {
    return this.deleteAgent.run(id).changes > 0
  }

  setDefault(id: Id): boolean {
    return this.db.transaction(() => {
      if (!this.selectById.get(id)) return false
      this.clearDefault.run()
      this.markDefault.run(id)
      return true
    })()
  }

  private writeChildren(id: Id, input: NewAgent): void {
    input.args.forEach((value, position) => this.insertArg.run(id, position, value))
    Object.entries(input.env).forEach(([key, value]) => this.insertEnv.run(id, key, value))
  }

  private require(id: Id): AgentDto {
    const agent = this.get(id)
    if (!agent) throw new Error(`Agent ${id} vanished after write`)
    return agent
  }

  private toDto(row: AgentRow): AgentDto {
    return {
      id: row.id,
      name: row.name,
      command: row.command,
      args: this.selectArgs.all(row.id).map((a) => a.value),
      env: Object.fromEntries(this.selectEnv.all(row.id).map((e) => [e.key, e.value])),
      isDefault: row.is_default === 1
    }
  }
}

import type { Id } from '@shared/models'
import type { McpServerDto, McpServerInput, McpTestResultDto, McpTransport } from '@shared/teams'
import type { McpServerRepository } from '../../domain/repositories/teams-repositories'
import { prepare, transaction, type Database } from './sql'

interface Row {
  id: number
  name: string
  transport: McpTransport
  command: string
  url: string
  enabled: number
  last_test_ok: number | null
  last_test_text: string | null
  last_test_at: string | null
}

const COLS = 'id, name, transport, command, url, enabled, last_test_ok, last_test_text, last_test_at'

export class SqliteMcpServerRepository implements McpServerRepository {
  constructor(private readonly db: Database) {}

  list(): McpServerDto[] {
    return prepare<[], Row>(this.db, `SELECT ${COLS} FROM mcp_servers ORDER BY name COLLATE NOCASE`).all().map((r) => this.toDto(r))
  }

  get(id: Id): McpServerDto | null {
    const row = prepare<[Id], Row>(this.db, `SELECT ${COLS} FROM mcp_servers WHERE id = ?`).get(id)
    return row ? this.toDto(row) : null
  }

  create(input: McpServerInput): McpServerDto {
    const id = transaction(this.db, () => {
      const newId = Number(prepare<[string, string, string, string]>(this.db, 'INSERT INTO mcp_servers (name, transport, command, url) VALUES (?, ?, ?, ?)').run(input.name, input.transport, input.command, input.url).lastInsertRowid)
      this.writeChildren(newId, input)
      return newId
    })
    return this.require(id)
  }

  update(id: Id, input: McpServerInput): McpServerDto | null {
    transaction(this.db, () => {
      const changes = prepare<[string, string, string, string, Id]>(this.db, 'UPDATE mcp_servers SET name = ?, transport = ?, command = ?, url = ? WHERE id = ?').run(input.name, input.transport, input.command, input.url, id).changes
      if (changes === 0) return
      prepare<[Id]>(this.db, 'DELETE FROM mcp_server_args WHERE server_id = ?').run(id)
      prepare<[Id]>(this.db, 'DELETE FROM mcp_server_vars WHERE server_id = ?').run(id)
      this.writeChildren(id, input)
    })
    return this.get(id)
  }

  remove(id: Id): boolean {
    return prepare<[Id]>(this.db, 'DELETE FROM mcp_servers WHERE id = ?').run(id).changes > 0
  }

  setEnabled(id: Id, enabled: boolean): boolean {
    return prepare<[number, Id]>(this.db, 'UPDATE mcp_servers SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id).changes > 0
  }

  saveTest(id: Id, result: McpTestResultDto, tools: { name: string; description: string }[] | null): McpServerDto | null {
    transaction(this.db, () => {
      if (prepare<[number, string, string, Id]>(this.db, 'UPDATE mcp_servers SET last_test_ok = ?, last_test_text = ?, last_test_at = ? WHERE id = ?').run(result.ok ? 1 : 0, result.message, result.at, id).changes === 0) return
      if (tools === null) return
      const known = new Map(prepare<[Id], { name: string; enabled: number }>(this.db, 'SELECT name, enabled FROM mcp_server_tools WHERE server_id = ?').all(id).map((t) => [t.name, t.enabled]))
      prepare<[Id]>(this.db, 'DELETE FROM mcp_server_tools WHERE server_id = ?').run(id)
      const insert = prepare<[Id, string, string, number]>(this.db, 'INSERT INTO mcp_server_tools (server_id, name, description, enabled) VALUES (?, ?, ?, ?)')
      for (const tool of tools) insert.run(id, tool.name, tool.description, known.get(tool.name) ?? 1)
    })
    return this.get(id)
  }

  setToolEnabled(id: Id, tool: string, enabled: boolean): boolean {
    return prepare<[number, Id, string]>(this.db, 'UPDATE mcp_server_tools SET enabled = ? WHERE server_id = ? AND name = ?').run(enabled ? 1 : 0, id, tool).changes > 0
  }

  private writeChildren(id: Id, input: McpServerInput): void {
    const arg = prepare<[Id, number, string]>(this.db, 'INSERT INTO mcp_server_args (server_id, position, value) VALUES (?, ?, ?)')
    input.args.forEach((value, position) => arg.run(id, position, value))
    const variable = prepare<[Id, string, string, number]>(this.db, 'INSERT INTO mcp_server_vars (server_id, key, value, secret) VALUES (?, ?, ?, ?)')
    for (const v of input.vars) variable.run(id, v.key, v.value, v.secret ? 1 : 0)
  }

  private require(id: Id): McpServerDto {
    const server = this.get(id)
    if (!server) throw new Error(`MCP server ${id} vanished after write`)
    return server
  }

  private toDto(row: Row): McpServerDto {
    return {
      id: row.id,
      name: row.name,
      transport: row.transport,
      command: row.command,
      url: row.url,
      args: prepare<[Id], { value: string }>(this.db, 'SELECT value FROM mcp_server_args WHERE server_id = ? ORDER BY position').all(row.id).map((a) => a.value),
      vars: prepare<[Id], { key: string; value: string; secret: number }>(this.db, 'SELECT key, value, secret FROM mcp_server_vars WHERE server_id = ? ORDER BY key').all(row.id).map((v) => ({ key: v.key, value: v.value, secret: v.secret === 1 })),
      enabled: row.enabled === 1,
      tools: prepare<[Id], { name: string; description: string; enabled: number }>(this.db, 'SELECT name, description, enabled FROM mcp_server_tools WHERE server_id = ? ORDER BY name').all(row.id).map((t) => ({ name: t.name, description: t.description, enabled: t.enabled === 1 })),
      lastTest: row.last_test_ok === null || row.last_test_at === null ? null : { ok: row.last_test_ok === 1, message: row.last_test_text ?? '', at: row.last_test_at }
    }
  }
}

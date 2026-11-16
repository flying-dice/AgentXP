import type { Database, Statement } from 'better-sqlite3'
import type { Id, TerminalDto } from '@shared/models'
import {
  DEFAULT_TERMINAL_OUTPUT_LIMIT,
  type NewTerminal,
  type TerminalRepository
} from '../../domain/repositories/terminal-repository'

interface TerminalRow {
  id: number
  session_id: number
  acp_terminal_id: string
  command: string
  cwd: string | null
  output: string
  exit_code: number | null
  signal: string | null
}

const COLUMNS = 'id, session_id, acp_terminal_id, command, cwd, output, exit_code, signal'

export class SqliteTerminalRepository implements TerminalRepository {
  private readonly selectOne: Statement<[Id, string], TerminalRow>
  private readonly selectBySession: Statement<[Id], TerminalRow>
  private readonly selectArgs: Statement<[Id], { value: string }>
  private readonly insertTerminal: Statement<[Id, string, string, string | null]>
  private readonly insertArg: Statement<[Id, number, string]>
  private readonly appendStmt: Statement<[string, number, Id, string]>
  private readonly exitStmt: Statement<[number | null, string | null, Id, string]>

  constructor(private readonly db: Database) {
    this.selectOne = db.prepare(`SELECT ${COLUMNS} FROM terminals WHERE session_id = ? AND acp_terminal_id = ?`)
    this.selectBySession = db.prepare(`SELECT ${COLUMNS} FROM terminals WHERE session_id = ? ORDER BY id`)
    this.selectArgs = db.prepare('SELECT value FROM terminal_args WHERE terminal_id = ? ORDER BY position')
    this.insertTerminal = db.prepare(
      'INSERT INTO terminals (session_id, acp_terminal_id, command, cwd) VALUES (?, ?, ?, ?)'
    )
    this.insertArg = db.prepare('INSERT INTO terminal_args (terminal_id, position, value) VALUES (?, ?, ?)')
    // substr with a negative start keeps the last N characters.
    this.appendStmt = db.prepare(
      'UPDATE terminals SET output = substr(output || ?, -?) WHERE session_id = ? AND acp_terminal_id = ?'
    )
    this.exitStmt = db.prepare(
      'UPDATE terminals SET exit_code = ?, signal = ? WHERE session_id = ? AND acp_terminal_id = ?'
    )
  }

  create(input: NewTerminal): TerminalDto {
    this.db.transaction(() => {
      const id = Number(
        this.insertTerminal.run(input.sessionId, input.terminalId, input.command, input.cwd).lastInsertRowid
      )
      input.args.forEach((value, position) => this.insertArg.run(id, position, value))
    })()
    return this.require(input.sessionId, input.terminalId)
  }

  get(sessionId: Id, terminalId: string): TerminalDto | null {
    const row = this.selectOne.get(sessionId, terminalId)
    return row ? this.toDto(row) : null
  }

  list(sessionId: Id): TerminalDto[] {
    return this.selectBySession.all(sessionId).map((row) => this.toDto(row))
  }

  appendOutput(
    sessionId: Id,
    terminalId: string,
    chunk: string,
    limit: number = DEFAULT_TERMINAL_OUTPUT_LIMIT
  ): TerminalDto | null {
    this.appendStmt.run(chunk, Math.max(1, Math.trunc(limit)), sessionId, terminalId)
    return this.get(sessionId, terminalId)
  }

  setExit(sessionId: Id, terminalId: string, exitCode: number | null, signal: string | null): TerminalDto | null {
    this.exitStmt.run(exitCode, signal, sessionId, terminalId)
    return this.get(sessionId, terminalId)
  }

  private require(sessionId: Id, terminalId: string): TerminalDto {
    const terminal = this.get(sessionId, terminalId)
    if (!terminal) throw new Error(`Terminal ${terminalId} vanished after insert`)
    return terminal
  }

  private toDto(row: TerminalRow): TerminalDto {
    return {
      id: row.id,
      sessionId: row.session_id,
      terminalId: row.acp_terminal_id,
      command: row.command,
      args: this.selectArgs.all(row.id).map((a) => a.value),
      cwd: row.cwd,
      output: row.output,
      exitCode: row.exit_code,
      signal: row.signal
    }
  }
}

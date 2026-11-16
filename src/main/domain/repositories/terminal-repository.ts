import type { Id, TerminalDto } from '@shared/models'

export interface NewTerminal {
  sessionId: Id
  terminalId: string
  command: string
  args: string[]
  cwd: string | null
}

export const DEFAULT_TERMINAL_OUTPUT_LIMIT = 1_000_000

export interface TerminalRepository {
  create(input: NewTerminal): TerminalDto
  get(sessionId: Id, terminalId: string): TerminalDto | null
  list(sessionId: Id): TerminalDto[]
  /** Appends output, keeping only the last `limit` characters. */
  appendOutput(sessionId: Id, terminalId: string, chunk: string, limit?: number): TerminalDto | null
  setExit(sessionId: Id, terminalId: string, exitCode: number | null, signal: string | null): TerminalDto | null
}

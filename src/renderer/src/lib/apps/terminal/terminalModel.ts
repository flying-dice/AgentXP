/** Pure helpers of the Terminal app: ACP terminals of the desktop's chats and their cmd.exe rendering. */
import type { AguiTerminalState } from '@shared/agui-state'
import type { Id } from '@shared/models'

export interface TerminalEntry {
  /** Unique on the desktop: `<sessionId>:<terminalId>`. */
  key: string
  sessionId: Id
  sessionTitle: string
  terminalId: string
  command: string
  output: string
  exitCode: number | null
  running: boolean
}

export interface TerminalSource {
  sessionId: Id
  sessionTitle: string
  terminals: Record<string, AguiTerminalState>
}

export function collectTerminals(sources: readonly TerminalSource[]): TerminalEntry[] {
  return sources.flatMap((s) =>
    Object.entries(s.terminals).map(([terminalId, t]) => ({
      key: `${s.sessionId}:${terminalId}`,
      sessionId: s.sessionId,
      sessionTitle: s.sessionTitle,
      terminalId,
      command: t.command,
      output: t.output,
      exitCode: t.exitCode,
      running: t.exitCode === null
    }))
  )
}

// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]/g

export const stripAnsi = (text: string): string => text.replace(ANSI, '')

/** The last `count` non-trailing-blank lines of terminal output, escapes removed. */
export function lastLines(output: string, count = 20): string[] {
  const lines = stripAnsi(output).replaceAll('\r\n', '\n').split('\n')
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()
  return lines.slice(-count)
}

export const PROMPT = 'W:\\>'

export const BANNER = 'Agent7 shell  (sandboxed: C:\\ is private, W:\\ is your repo)'

/** The console text of one terminal: banner, prompt with the command, its output and the exit status. */
export function renderTerminal(entry: TerminalEntry | null): string {
  if (!entry) return `${BANNER}\n\n${PROMPT}`
  const out = entry.output.replace(/\n+$/, '')
  const lines = [BANNER, '', `${PROMPT}${entry.command}`]
  if (out) lines.push(out)
  if (!entry.running && entry.exitCode !== 0) lines.push(`\u001b[91m(exit code ${entry.exitCode})\u001b[0m`)
  lines.push('', entry.running ? '' : PROMPT)
  return lines.join('\n')
}

export function terminalLabel(entry: TerminalEntry, withChat: boolean): string {
  const command = entry.command.length > 40 ? `${entry.command.slice(0, 39)}...` : entry.command
  return `${withChat ? `${entry.sessionTitle}: ` : ''}${command}${entry.running ? ' (running)' : ''}`
}

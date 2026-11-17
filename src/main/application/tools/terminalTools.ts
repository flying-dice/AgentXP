import { randomUUID } from 'node:crypto'
import type { Id } from '@shared/models'
import type { ToolHandlers } from './catalog'
import type { TerminalActivity } from '../ports'
import type { VirtualFileSystem } from '../vfs/VirtualFileSystem'
import type { CommandRunner, DesktopOps } from './ports'
import type { ToolPaths } from './ToolPaths'
import { AppError } from '../errors'
import { attempt, errorResult, textResult } from './types'
import { pickWindow } from './windows'

const MAX_OUTPUT_CHARS = 20_000
const VIEW_LINES = 20
const KEPT_LINES = 500
const DEFAULT_TIMEOUT_SECONDS = 60
const MS_PER_SECOND = 1000

const lastLines = (lines: string[], count: number): string[] => lines.slice(-count)
const tail = (text: string, max: number): string => (text.length <= max ? text : `[...truncated]\n${text.slice(-max)}`)

export interface TerminalToolsDeps {
  desktops: DesktopOps
  runner: CommandRunner
  vfs: Pick<VirtualFileSystem, 'realPath'>
  paths: ToolPaths
  /** Records each run as a terminal of the chat (command, streamed output, exit code): the Terminal app lists it. */
  terminals: { record(sessionId: Id, activity: TerminalActivity): void }
  newTerminalId?: () => string
}

/**
 * terminal_run, terminal_read. Every run is also recorded as a terminal of the calling chat (like an ACP
 * terminal), so the Terminal app shows its command, streaming output and exit code in its own tab; the
 * Terminal window's view (cwd, running command, last lines) follows it too.
 */
export function createTerminalTools({ desktops, runner, vfs, paths, terminals, newTerminalId = () => `run-${randomUUID()}` }: TerminalToolsDeps): ToolHandlers<'terminal_run' | 'terminal_read'> {
  /** What terminal_run printed on each desktop, newest last. */
  const buffers = new Map<Id, string[]>()

  const showInTerminal = (desktopId: Id, terminalId: string, cwd: string, runningCommand: string | null, lines: string[]): void => {
    try {
      const window = pickWindow(desktops.state(desktopId), 'terminal')
      desktops.updateView(window.id, {
        app: 'terminal',
        terminalId,
        cwd,
        runningCommand,
        lastLines: lastLines(lines, VIEW_LINES)
      })
    } catch (error) {
      // The Terminal window was closed while the command ran: the output is still recorded for the chat and terminal_read.
      if (!(error instanceof AppError)) throw error
    }
  }

  return {
    terminal_run: ({ command, cwd, timeoutSeconds }, context) =>
      attempt(async () => {
        const { desktopId } = context
        const directory = paths.resolve(context, cwd)
        const real = await vfs.realPath(desktopId, directory)
        const lines = buffers.get(desktopId) ?? []
        buffers.set(desktopId, lines)
        lines.push(`> ${command}`)
        const terminalId = newTerminalId()
        const record = (delta: string, exitStatus: TerminalActivity['exitStatus'] = null): void =>
          terminals.record(context.sessionId, { terminalId, command, args: [], cwd: real, delta, exitStatus })
        record('')
        showInTerminal(desktopId, terminalId, directory, command, lines)
        const result = await runner.run(command, {
          cwd: real,
          timeoutMs: (timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS) * MS_PER_SECOND,
          onOutput: (text) => record(text)
        })
        // A timeout or a signal has no exit code; the terminal still has to end (exit code null means "running").
        record(result.timedOut ? '\n[timed out]\n' : '', { exitCode: result.exitCode ?? (result.timedOut ? 124 : 1), signal: null })
        const printed = result.output.replace(/\r\n/g, '\n').replace(/\n$/, '')
        if (printed) lines.push(...printed.split('\n'))
        if (lines.length > KEPT_LINES) lines.splice(0, lines.length - KEPT_LINES)
        showInTerminal(desktopId, terminalId, directory, null, lines)
        const status = result.timedOut ? 'timed out' : `exit code ${result.exitCode ?? 'unknown'}`
        const text = `${tail(printed, MAX_OUTPUT_CHARS) || '(no output)'}\n[${status}]`
        return result.timedOut || result.exitCode !== 0 ? errorResult(text) : textResult(text)
      }),

    terminal_read: ({ lines }, { desktopId }) =>
      attempt(() => {
        const printed = lastLines(buffers.get(desktopId) ?? [], lines ?? 50)
        return textResult(printed.length > 0 ? printed.join('\n') : '(nothing has been run yet)')
      })
  }
}

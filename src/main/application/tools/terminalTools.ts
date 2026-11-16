import type { Id } from '@shared/models'
import type { ToolHandlers } from './catalog'
import { toWorkspacePath } from './paths'
import type { CommandRunner, DesktopOps } from './ports'
import { attempt, errorResult, textResult } from './types'
import { pickWindow } from './windows'
import { resolve } from 'node:path'

const MAX_OUTPUT_CHARS = 20_000
const VIEW_LINES = 20
const KEPT_LINES = 500
const DEFAULT_TIMEOUT_SECONDS = 60

const lastLines = (lines: string[], count: number): string[] => lines.slice(-count)
const tail = (text: string, max: number): string => (text.length <= max ? text : `[...truncated]\n${text.slice(-max)}`)

export interface TerminalToolsDeps {
  desktops: DesktopOps
  runner: CommandRunner
}

/** terminal_run, terminal_read. Output also goes to the Terminal window's view (cwd, running command, last lines). */
export function createTerminalTools({ desktops, runner }: TerminalToolsDeps): ToolHandlers<'terminal_run' | 'terminal_read'> {
  /** What terminal_run printed on each desktop, newest last. */
  const buffers = new Map<Id, string[]>()

  const showInTerminal = (desktopId: Id, cwd: string, runningCommand: string | null, lines: string[]): void => {
    const window = pickWindow(desktops.state(desktopId), 'terminal')
    desktops.updateView(window.id, {
      app: 'terminal',
      terminalId: 'agent',
      cwd,
      runningCommand,
      lastLines: lastLines(lines, VIEW_LINES)
    })
  }

  return {
    terminal_run: ({ command, cwd, timeoutSeconds }, { desktopId }) =>
      attempt(async () => {
        const root = desktops.state(desktopId).folder.path
        const relative = toWorkspacePath(root, cwd)
        const lines = buffers.get(desktopId) ?? []
        buffers.set(desktopId, lines)
        lines.push(`> ${command}`)
        showInTerminal(desktopId, relative || '.', command, lines)
        const result = await runner.run(command, {
          cwd: resolve(root, relative),
          timeoutMs: (timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS) * 1000
        })
        const printed = result.output.replace(/\r\n/g, '\n').replace(/\n$/, '')
        if (printed) lines.push(...printed.split('\n'))
        if (lines.length > KEPT_LINES) lines.splice(0, lines.length - KEPT_LINES)
        showInTerminal(desktopId, relative || '.', null, lines)
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

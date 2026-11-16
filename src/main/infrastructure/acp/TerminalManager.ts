import { spawn, type ChildProcess } from 'node:child_process'
import { BoundedOutput } from './boundedOutput'
import { killProcessTree, treeSpawnOptions } from './processTree'

const DEFAULT_OUTPUT_BYTE_LIMIT = 1024 * 1024

export interface TerminalExitStatus {
  exitCode: number | null
  signal: string | null
}

export interface TerminalSnapshot {
  output: string
  truncated: boolean
  exitStatus: TerminalExitStatus | null
}

export interface TerminalCreateParams {
  command: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  outputByteLimit?: number
}

/** Emitted whenever a terminal's output changes or it exits. */
export interface TerminalChange extends TerminalSnapshot {
  sessionKey: string
  terminalId: string
  command: string
  args: string[]
  cwd: string | null
  /** Text appended since the previous change ('' on exit without trailing output). */
  delta: string
}

export type TerminalChangeListener = (change: TerminalChange) => void

class ManagedTerminal {
  readonly output: BoundedOutput
  exitStatus: TerminalExitStatus | null = null
  readonly exited: Promise<TerminalExitStatus>

  constructor(
    readonly sessionKey: string,
    readonly id: string,
    readonly command: string,
    readonly args: string[],
    readonly cwd: string | null,
    readonly child: ChildProcess,
    byteLimit: number,
    private readonly notify: (terminal: ManagedTerminal, delta: string) => void
  ) {
    this.output = new BoundedOutput(byteLimit)
    child.stdout?.on('data', (chunk: Buffer) => this.onData(chunk))
    child.stderr?.on('data', (chunk: Buffer) => this.onData(chunk))
    this.exited = new Promise((resolve) => {
      child.once('error', (error) => {
        this.output.append(Buffer.from(`${error.message}\n`))
        this.finish(resolve, { exitCode: 127, signal: null })
      })
      child.once('close', (code, signal) => this.finish(resolve, { exitCode: code, signal }))
    })
  }

  snapshot(): TerminalSnapshot {
    return { output: this.output.value, truncated: this.output.truncated, exitStatus: this.exitStatus }
  }

  private onData(chunk: Buffer): void {
    this.notify(this, this.output.append(chunk))
  }

  private finish(resolve: (status: TerminalExitStatus) => void, status: TerminalExitStatus): void {
    if (this.exitStatus) return
    const delta = this.output.finish()
    this.exitStatus = status
    this.notify(this, delta)
    resolve(status)
  }
}

/** Implements the ACP terminal methods on top of child processes. */
export class TerminalManager {
  private readonly terminals = new Map<string, ManagedTerminal>()
  private counter = 0

  constructor(private readonly onChange: TerminalChangeListener = () => {}) {}

  create(sessionKey: string, params: TerminalCreateParams): string {
    const id = `term-${++this.counter}`
    const child = spawn(params.command, params.args ?? [], {
      cwd: params.cwd,
      env: { ...process.env, ...params.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      ...treeSpawnOptions()
    })
    const limit = params.outputByteLimit ?? DEFAULT_OUTPUT_BYTE_LIMIT
    const terminal = new ManagedTerminal(
      sessionKey,
      id,
      params.command,
      params.args ?? [],
      params.cwd ?? null,
      child,
      limit,
      (t, delta) => this.emit(t, delta)
    )
    this.terminals.set(id, terminal)
    return id
  }

  output(terminalId: string): TerminalSnapshot {
    return this.get(terminalId).snapshot()
  }

  waitForExit(terminalId: string): Promise<TerminalExitStatus> {
    return this.get(terminalId).exited
  }

  async kill(terminalId: string): Promise<void> {
    await killProcessTree(this.get(terminalId).child)
  }

  /** Kills the command if still running and forgets the terminal. */
  async release(terminalId: string): Promise<void> {
    const terminal = this.get(terminalId)
    await killProcessTree(terminal.child)
    this.terminals.delete(terminalId)
  }

  /** Releases every terminal (optionally only those of one session). */
  async releaseAll(sessionKey?: string): Promise<void> {
    const ids = [...this.terminals.values()].filter((t) => !sessionKey || t.sessionKey === sessionKey).map((t) => t.id)
    await Promise.all(ids.map((id) => this.release(id)))
  }

  private get(terminalId: string): ManagedTerminal {
    const terminal = this.terminals.get(terminalId)
    if (!terminal) throw new Error(`Unknown terminal: ${terminalId}`)
    return terminal
  }

  private emit(terminal: ManagedTerminal, delta: string): void {
    this.onChange({
      sessionKey: terminal.sessionKey,
      terminalId: terminal.id,
      command: terminal.command,
      args: terminal.args,
      cwd: terminal.cwd,
      delta,
      ...terminal.snapshot()
    })
  }
}

import { spawn, type ChildProcess } from 'node:child_process'
import { childEnv } from '../process/childEnv'
import { Readable, Writable } from 'node:stream'
import { ndJsonStream, type Stream } from '@agentclientprotocol/sdk'
import { hasExited, killProcessTree, treeSpawnOptions } from './processTree'

export interface AgentProcessOptions {
  command: string
  args: string[]
  env?: Record<string, string>
  cwd?: string
  /** Maximum stderr lines kept (oldest dropped). Default 500. */
  maxLogLines?: number
}

export interface AgentProcessExit {
  code: number | null
  signal: NodeJS.Signals | null
  /** Set when the process could not be spawned or crashed. */
  error: Error | null
}

/** Spawns an ACP agent and exposes its stdio as an SDK stream. */
export class AgentProcess {
  private readonly child: ChildProcess
  private readonly log: string[] = []
  private readonly maxLogLines: number
  private stderrRemainder = ''
  private spawnError: Error | null = null
  readonly stream: Stream
  /** Resolves once the process has ended (or failed to start). Never rejects. */
  readonly exited: Promise<AgentProcessExit>

  constructor(options: AgentProcessOptions) {
    this.maxLogLines = options.maxLogLines ?? 500
    this.child = spawn(options.command, options.args, {
      cwd: options.cwd,
      env: childEnv(options.env),
      stdio: ['pipe', 'pipe', 'pipe'],
      ...treeSpawnOptions()
    })
    this.exited = this.watchExit()
    this.captureStderr()
    this.child.stdin?.on('error', () => {})
    this.stream = this.createStream()
  }

  get pid(): number | undefined {
    return this.child.pid
  }

  /** The last stderr lines, oldest first. */
  get stderrLog(): string[] {
    return this.stderrRemainder ? [...this.log, this.stderrRemainder] : [...this.log]
  }

  get error(): Error | null {
    return this.spawnError
  }

  /** Stops the agent and its children (SIGTERM, then SIGKILL after a grace period). */
  async dispose(): Promise<void> {
    this.child.stdin?.end()
    await killProcessTree(this.child)
    await this.exited
  }

  private createStream(): Stream {
    const { stdin, stdout } = this.child
    if (!stdin || !stdout) throw new Error('Agent process has no stdio pipes')
    const output = Writable.toWeb(stdin) as WritableStream<Uint8Array>
    const input = Readable.toWeb(stdout) as ReadableStream<Uint8Array>
    return ndJsonStream(output, input)
  }

  private watchExit(): Promise<AgentProcessExit> {
    return new Promise((resolve) => {
      this.child.once('error', (error) => {
        this.spawnError = error
        if (this.child.pid === undefined) resolve({ code: null, signal: null, error })
      })
      this.child.once('close', (code, signal) => resolve({ code, signal, error: this.spawnError }))
    })
  }

  private captureStderr(): void {
    this.child.stderr?.setEncoding('utf8')
    this.child.stderr?.on('data', (chunk: string) => this.appendStderr(chunk))
    this.child.stderr?.on('end', () => this.flushStderr())
  }

  private appendStderr(chunk: string): void {
    const lines = (this.stderrRemainder + chunk).split(/\r?\n/)
    this.stderrRemainder = lines.pop() ?? ''
    for (const line of lines) this.pushLine(line)
  }

  private flushStderr(): void {
    if (this.stderrRemainder) this.pushLine(this.stderrRemainder)
    this.stderrRemainder = ''
  }

  private pushLine(line: string): void {
    this.log.push(line)
    if (this.log.length > this.maxLogLines) this.log.splice(0, this.log.length - this.maxLogLines)
  }

  /** True while the process is running. */
  get running(): boolean {
    return this.child.pid !== undefined && !hasExited(this.child)
  }
}

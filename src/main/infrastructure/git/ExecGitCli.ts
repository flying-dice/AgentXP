import { execFile } from 'node:child_process'
import type { GitCli, GitResult } from '../../application/git/ports'

export interface ExecGitCliOptions {
  timeoutMs?: number
  maxBuffer?: number
  /** The executable; default `git`. */
  command?: string
}

/**
 * `git` through `execFile` (no shell, so no quoting and no injection). English messages, no prompts, no optional
 * locks (a status poll never blocks the user's own git commands), a timeout and a bounded output.
 */
export class ExecGitCli implements GitCli {
  private readonly timeout: number
  private readonly maxBuffer: number
  private readonly command: string

  constructor(options: ExecGitCliOptions = {}) {
    this.timeout = options.timeoutMs ?? 10_000
    this.maxBuffer = options.maxBuffer ?? 32 * 1024 * 1024
    this.command = options.command ?? 'git'
  }

  run(cwd: string, args: string[]): Promise<GitResult> {
    return new Promise((resolve) => {
      execFile(
        this.command,
        ['-c', 'core.quotepath=off', '-c', 'core.fsmonitor=false', ...args],
        {
          cwd,
          encoding: 'utf8',
          timeout: this.timeout,
          maxBuffer: this.maxBuffer,
          windowsHide: true,
          env: { ...process.env, LC_ALL: 'C', GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', GIT_PAGER: 'cat' }
        },
        (error, stdout, stderr) => {
          if (!error) return resolve({ ok: true, stdout, stderr })
          const code = (error as NodeJS.ErrnoException).code
          resolve({ ok: false, stdout: stdout ?? '', stderr: stderr || error.message, missing: code === 'ENOENT' || undefined })
        }
      )
    })
  }
}

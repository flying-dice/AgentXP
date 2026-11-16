export interface GitResult {
  /** Exit code 0. */
  ok: boolean
  stdout: string
  stderr: string
  /** `git` is not installed (or cannot be started). */
  missing?: boolean
}

/** Runs the git CLI in a real directory. Never throws: failures come back as `ok: false`. */
export interface GitCli {
  run(cwd: string, args: string[]): Promise<GitResult>
}

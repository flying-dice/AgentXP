/** Text file access on behalf of an agent. Implementations enforce path sandboxing. */
export interface FileAccess {
  /** `line` is 1-based; `limit` is a maximum number of lines. */
  readTextFile(path: string, line?: number, limit?: number): Promise<string>
  writeTextFile(path: string, content: string): Promise<void>
  /**
   * The directory a terminal of the agent starts in: `cwd` when it is allowed, else (no `cwd`) the session's
   * working directory. Rejects when the directory is outside what the agent may touch.
   */
  resolveCwd(cwd?: string): Promise<string>
}

/** Resolves the file access (and so the sandbox root) for one session. */
export interface FileAccessProvider {
  forSession(sessionKey: string): FileAccess
}

/** Text file access on behalf of an agent. Implementations enforce path sandboxing. */
export interface FileAccess {
  /** `line` is 1-based; `limit` is a maximum number of lines. */
  readTextFile(path: string, line?: number, limit?: number): Promise<string>
  writeTextFile(path: string, content: string): Promise<void>
}

/** Resolves the file access (and so the sandbox root) for one session. */
export interface FileAccessProvider {
  forSession(sessionKey: string): FileAccess
}

import { Script, createContext } from 'node:vm'

/** How long one file may take to search with a regular expression before the search stops. */
export const REGEX_FILE_TIMEOUT_MS = 1000

/** A regular expression that runs too long (catastrophic backtracking, such as `(a+)+$`). */
export class RegexTimeoutError extends Error {}

/**
 * Runs an agent's or user's regular expression over the lines of one file in a separate V8 context with a time limit,
 * so a pattern such as `(a+)+$` cannot freeze the main process (every window and IPC call waits on it). Returns, for each
 * line with a match, its 0-based index and the start and length of its first non-empty match.
 */
export class GuardedRegex {
  private readonly context = createContext({ args: null as unknown })
  private readonly script = new Script('scan(args)')

  constructor(private readonly timeoutMs: number = REGEX_FILE_TIMEOUT_MS) {
    // Defined inside the context, so the loop runs under its time limit.
    new Script(`
      globalThis.scan = ({ source, flags, text }) => {
        const re = new RegExp(source, flags + 'g')
        const lines = text.split(/\\r?\\n/)
        const out = []
        for (let i = 0; i < lines.length; i++) {
          re.lastIndex = 0
          for (let m = re.exec(lines[i]); m; m = re.exec(lines[i])) {
            if (m[0].length > 0) { out.push(i, m.index, m[0].length); break }
            re.lastIndex++
          }
        }
        return out.join(',')
      }
    `).runInContext(this.context)
  }

  /** Throws RegexTimeoutError when the file takes longer than the limit. */
  scan(source: string, flags: string, text: string): { line: number; start: number; length: number }[] {
    this.context.args = { source, flags, text }
    let packed: string
    try {
      packed = this.script.runInContext(this.context, { timeout: this.timeoutMs }) as string
    } catch (error) {
      if ((error as { code?: string }).code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') throw new RegexTimeoutError('timeout')
      throw error
    } finally {
      this.context.args = null
    }
    if (packed === '') return []
    const n = packed.split(',').map(Number)
    const hits: { line: number; start: number; length: number }[] = []
    for (let i = 0; i < n.length; i += 3) hits.push({ line: n[i]!, start: n[i + 1]!, length: n[i + 2]! })
    return hits
  }
}

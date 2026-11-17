import { execFileSync } from 'node:child_process'
import { delimiter } from 'node:path'

const START = '__AGENTXP_PATH_START__'
const END = '__AGENTXP_PATH_END__'

/** The PATH printed between the markers (a shell profile may print other text before or after it). */
export function parseMarkedPath(output: string): string | null {
  const start = output.indexOf(START)
  const end = output.indexOf(END, start + START.length)
  if (start < 0 || end < 0) return null
  const value = output.slice(start + START.length, end).trim()
  return value || null
}

/** `current` followed by the entries of `added` it does not have yet, without duplicates. */
export function mergePaths(current: string | undefined, added: string | null): string {
  const seen = new Set<string>()
  const entries: string[] = []
  for (const entry of [...(current ?? '').split(delimiter), ...(added ?? '').split(delimiter)]) {
    if (!entry || seen.has(entry)) continue
    seen.add(entry)
    entries.push(entry)
  }
  return entries.join(delimiter)
}

/** PATH of the user's login shell, or null when it cannot be read within the time limit. */
export function readLoginShellPath(shell: string = process.env['SHELL'] || '/bin/zsh', timeoutMs = 5000): string | null {
  try {
    const output = execFileSync(shell, ['-ilc', `printf '%s' "${START}\${PATH}${END}"`], { encoding: 'utf8', timeout: timeoutMs, stdio: ['ignore', 'pipe', 'ignore'] })
    return parseMarkedPath(output)
  } catch {
    return null
  }
}

/**
 * A packaged app started from Finder or the Dock gets the minimal PATH of launchd (`/usr/bin:/bin:...`), without the
 * node, npx or agent binaries the user's shell finds. Adds the entries of the login shell's PATH to this process, so
 * agents such as `npx @zed-industries/claude-code-acp` start. Not needed on Windows.
 */
export function inheritLoginShellPath(env: NodeJS.ProcessEnv = process.env, read: () => string | null = readLoginShellPath): void {
  if (process.platform === 'win32') return
  env['PATH'] = mergePaths(env['PATH'], read())
}

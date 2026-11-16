// H-94: which build ran a session. The release gate asks for the packaged build; the records must say which one it was.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** The packaged executable named by UX_PACKAGED_EXE, or null (the session then runs the unpackaged build from out/main). */
export const packagedExecutable = (env = process.env) => (env.UX_PACKAGED_EXE && existsSync(env.UX_PACKAGED_EXE) ? env.UX_PACKAGED_EXE : null)

/** `{ packaged, version, commit }` for `session.json` and the record header. `commit` comes from UX_BUILD_COMMIT or the repository head file, or is null. */
export function readBuild({ repoRoot, env = process.env }) {
  let version = null
  try {
    version = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).version ?? null
  } catch {
    version = null
  }
  return { packaged: Boolean(packagedExecutable(env)), version, commit: env.UX_BUILD_COMMIT ?? readCommit(repoRoot) }
}

/** The commit named by the head file of the repository (a loose ref or a detached hash), or null when it cannot be read. */
export function readCommit(repoRoot) {
  try {
    const gitDir = join(repoRoot, '.git')
    const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim()
    const ref = /^ref:\s*(.+)$/.exec(head)?.[1]
    if (!ref) return head || null
    const file = join(gitDir, ref)
    return existsSync(file) ? readFileSync(file, 'utf8').trim() : null
  } catch {
    return null
  }
}

/** The one line the record header shows. */
export const buildLine = (build) => (build ? `${build.packaged ? 'packaged' : 'unpackaged'} build, version ${build.version ?? 'unknown'}, commit ${build.commit ? String(build.commit).slice(0, 10) : 'unknown'}` : 'build not recorded')

/**
 * A round counts for the release gate only when every session ran the packaged build. Returns the refusal text, or null.
 * `checks` are the parsed check.json files of the round (each has `build`).
 */
export function gateProblem(checks) {
  const bad = checks.filter((c) => c?.build?.packaged !== true)
  if (!bad.length) return null
  return `${bad.length} of ${checks.length} session(s) did not run the packaged build (build.packaged is not true): the round does not count for the gate`
}

/** The record text with the build line under the title (once). */
export function withBuildLine(text, build) {
  if (/^- Build:/m.test(text)) return text
  return text.replace(/^(# .*)$/m, (m) => `${m}\n- Build: ${buildLine(build)}`)
}

// H-94: which build ran a session. The release gate asks for the packaged build; the records must say which one it was.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** The packaged executable named by UX_PACKAGED_EXE, or null (the session then runs the unpackaged build from out/main). */
export const packagedExecutable = (env = process.env) => (env.UX_PACKAGED_EXE && existsSync(env.UX_PACKAGED_EXE) ? env.UX_PACKAGED_EXE : null)

/**
 * H-100: the commit the packaged app was built from. `scripts/write-build-info.mjs` writes `build-info.json` ({ commit, version, builtAt })
 * and electron-builder copies it to the `resources` folder beside the executable. Null when there is no such file.
 */
export function readBuildInfo(exe) {
  if (!exe) return null
  try {
    const info = JSON.parse(readFileSync(join(dirname(exe), 'resources', 'build-info.json'), 'utf8'))
    return typeof info?.commit === 'string' && info.commit ? info : null
  } catch {
    return null
  }
}

/**
 * `{ packaged, version, commit }` for `session.json` and the record header. `commit` comes from the build-info file of the packaged
 * app (H-100), else UX_BUILD_COMMIT, else the repository head file, else null.
 */
export function readBuild({ repoRoot, env = process.env }) {
  let version = null
  try {
    version = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).version ?? null
  } catch {
    version = null
  }
  const exe = packagedExecutable(env)
  const info = readBuildInfo(exe)
  return { packaged: Boolean(exe), version, commit: info?.commit ?? env.UX_BUILD_COMMIT ?? readCommit(repoRoot) }
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
  // A placeholder Build line (a panelist copied the template) is replaced; a real one is kept.
  if (/^- Build:.*\bbuild, version\b/m.test(text)) return text
  if (/^- Build:/m.test(text)) return text.replace(/^- Build:.*$/m, `- Build: ${buildLine(build)}`)
  return text.replace(/^(# .*)$/m, (m) => `${m}\n- Build: ${buildLine(build)}`)
}

const SHORT_COMMIT = 10
const shortCommit = (commit) => String(commit).slice(0, SHORT_COMMIT)

/**
 * H-100: a round is one build. Returns the refusal text when `commits` (the commit of each session of the round, null or missing ones
 * ignored) holds a second id, else null. `--confirm-build-change` (the facilitator states that the app code is identical) lifts it.
 */
export function commitProblem(commits, { confirmed = false } = {}) {
  const ids = [...new Set(commits.filter(Boolean).map(shortCommit))]
  if (ids.length < 2 || confirmed) return null
  return `the round has more than one build commit (${ids.join(', ')}): rebuild and rerun the sessions of the older commit, or pass --confirm-build-change to state that the app code is identical`
}

/** The commits recorded in the `session.json` and `check.json` files of the sibling session folders of `out` (the other sessions of the round). */
export function siblingCommits(out) {
  const round = dirname(out)
  const found = []
  let names = []
  try {
    names = readdirSync(round, { withFileTypes: true }).filter((d) => d.isDirectory() && join(round, d.name) !== out).map((d) => d.name)
  } catch {
    return found
  }
  for (const name of names) {
    for (const file of ['session.json', 'check.json']) {
      try {
        const commit = JSON.parse(readFileSync(join(round, name, file), 'utf8'))?.build?.commit
        if (commit) found.push(commit)
      } catch {
        // no such file in this folder
      }
    }
  }
  return found
}

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const pass = (reason, notes = []) => ({ status: 'PASS', reason, notes })
export const fail = (reason, notes = []) => ({ status: 'FAIL', reason, notes })
export const manual = (reason, notes = []) => ({ status: 'MANUAL', reason, notes })

/** Combines state checks (all must hold) into a result. */
export function all(checks, notes = []) {
  const bad = checks.filter(([ok]) => !ok)
  if (bad.length) return fail(`not met: ${bad.map(([, why]) => why).join('; ')}`, notes)
  return pass(checks.map(([, why]) => why).join('; '), notes)
}

/**
 * Answer check. `state` is the result of the state check. When the state check failed the result stays FAIL.
 * With `--answer "<text>"`: every group of `keywords` must have one match (case-insensitive substring) -> PASS else FAIL.
 * Without an answer: MANUAL (the researcher compares the transcript with `expect`).
 */
export function withAnswer(state, answer, { keywords = [], expect }) {
  if (state.status === 'FAIL') return state
  if (answer === undefined || answer === null || answer === '') {
    if (!keywords.length && !expect) return state
    return manual(`state ok (${state.reason}); researcher must verify the panelist's answer: ${expect ?? keywords.map((k) => [k].flat().join('|')).join(' + ')}`, state.notes)
  }
  const lower = answer.toLowerCase()
  const missing = keywords.filter((group) => ![group].flat().some((k) => lower.includes(k.toLowerCase())))
  if (missing.length) return fail(`state ok but the answer lacks: ${missing.map((g) => [g].flat().join('|')).join(' + ')}`, state.notes)
  return pass(`${state.reason}; answer ok`, state.notes)
}

export const readText = (root, rel) => {
  try {
    return readFileSync(join(root, rel), 'utf8')
  } catch {
    return null
  }
}

export const projectRoot = (ctx, i = 0) => ctx.state.projectPaths?.[i] ?? ctx.fixtures.loginApp

export const userMessages = (entries) => entries.filter((e) => e.kind === 'message' && e.role === 'user')
export const agentMessages = (entries) => entries.filter((e) => e.kind === 'message' && e.role === 'agent')
export const textOf = (entry) => (entry.blocks ?? []).map((b) => b.text ?? '').join('')

export const windowsOf = (state, app) => (state?.windows ?? []).filter((w) => w.app === app)

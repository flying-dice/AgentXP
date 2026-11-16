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
  // H-89: a keyword may be a RegExp (tested against the answer as written).
  const hit = (k) => (k instanceof RegExp ? k.test(answer) : lower.includes(k.toLowerCase()))
  const missing = keywords.filter((group) => ![group].flat().some(hit))
  if (missing.length) return fail(`state ok but the answer lacks: ${missing.map((g) => [g].flat().map(String).join('|')).join(' + ')}`, state.notes)
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
/**
 * What the user typed (H-23): only the `text` blocks. The desktop adds a `resource` block (`agent7://desktop/state`, a JSON
 * dump of the desktop) to every prompt; `textOf` folds it in, so it must not be used to test what a user sent.
 */
export const userText = (entry) => (entry.blocks ?? []).filter((b) => (b.kind ?? 'text') === 'text').map((b) => b.text ?? '').join('')
/** The text of the resource blocks of a message (the desktop state and any attached selection). */
export const resourceText = (entry) => (entry.blocks ?? []).filter((b) => b.kind === 'resource').map((b) => `${b.uri ?? ''} ${b.text ?? ''}`).join('\n')

export const windowsOf = (state, app) => (state?.windows ?? []).filter((w) => w.app === app)

/**
 * The Help window of the app, whatever its title ("Help and Support", "Chat Help", "Explorer Help"...): the window with
 * app `help` in the desktop state, plus the text and data-topic of its article. Null when no Help window is open.
 */
export async function helpInfo(ctx) {
  const id = ctx.state?.desktopId
  const state = id ? await ctx.desktopState(id) : null
  const win = windowsOf(state, 'help')[0]
  let topic = win?.view?.topic ?? null
  let text = ''
  const page = id ? ctx.desktopWindow?.(id) : null
  const article = page ? page.getByTestId('help-article') : null
  if (article && (await article.count().catch(() => 0)) > 0) {
    topic = (await article.first().getAttribute('data-topic').catch(() => null)) ?? topic
    text = await article.first().innerText().catch(() => '')
  }
  return win || topic || text ? { topic, text } : null
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

/** Keyword group for a count: the digits and the word ("5", "five"). */
export const countWords = (n) => [String(n), ...(NUMBER_WORDS[n] ? [NUMBER_WORDS[n]] : [])]

/**
 * H-60: the whole numbers of a text ("1, 3 and 4" -> 1 3 4). A digit inside a longer number or a decimal ("13", "1.5") is not a
 * line number. With `{ ranges: true }` a range is expanded too ("lines 1-4" or "1 to 4" -> 1 2 3 4); the default does NOT expand
 * ranges (H-77): "lines 1 to 5" names 1 and 5 only, so an answer that merely lists the whole file does not get credit for 3 and 4.
 */
export function numbersIn(text, { ranges = false } = {}) {
  const found = new Set()
  const t = String(text ?? '')
  if (ranges) {
    for (const m of t.matchAll(/(?<![\d.])(\d+)\s*(?:-|\u2013|to|through)\s*(\d+)(?![\d.])/gi)) {
      const [a, b] = [Number(m[1]), Number(m[2])]
      if (b >= a && b - a <= 200) for (let n = a; n <= b; n++) found.add(n)
    }
  }
  for (const m of t.matchAll(/(?<![\d.])\d+(?![\d]|\.\d)/g)) found.add(Number(m[0]))
  NUMBER_WORDS.forEach((word, n) => {
    if (n > 0 && new RegExp(`\\b${word}\\b`, 'i').test(t)) found.add(n)
  })
  return found
}

/** H-60/H-77: the wanted numbers that the text does not name as written (no range expansion). */
export const missingNumbers = (text, wanted) => wanted.filter((n) => !numbersIn(text).has(n))

/** H-77: the answer says that the panelist could not tell ("could not say which lines", "cannot tell", "no idea", "unclear"). */
export const saysCouldNotTell = (text) => /\b(?:cannot|can't|could\s?not|couldn't|unable to|not able to)\s+(?:\w+\s+)?(?:tell|say|see|find|know|show)\b|\bno idea\b|\bunclear\b|\bnot sure\b/i.test(String(text ?? ''))

/** Keyword group for a file path: the base name with and without the extension ("README.md", "README"). */
export function nameWords(path) {
  const base = String(path).split(/[\\/]/).pop() ?? ''
  const bare = base.replace(/\.[^.]+$/, '')
  return bare && bare !== base ? [base, bare] : [base]
}

/** Highest "N of M" progress number in the text of the transcript (messages, tool titles), or 0. */
export function lastProgress(entries) {
  let max = 0
  for (const e of entries) {
    const text = [textOf(e), e.title ?? ''].join(' ')
    for (const m of text.matchAll(/(\d+)\s+of\s+\d+/gi)) max = Math.max(max, Number(m[1]))
  }
  return max
}

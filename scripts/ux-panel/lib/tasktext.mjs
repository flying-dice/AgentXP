// Reads task scenarios, Min and budgets from docs/ux/tasks.md (the facilitator gives only the scenario to the panelist).
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { TEST_PAGE_URL } from './fixtures.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

export function parseTasks(markdown) {
  const tasks = {}
  const parts = markdown.split(/^\*\*(T\d+\.\d+b?) - (.+?)\*\*.*$/m)
  // split with two groups: [pre, id, title, body, id, title, body...]
  for (let i = 1; i < parts.length; i += 3) {
    const [id, title, body] = [parts[i], parts[i + 1], parts[i + 2]]
    const scenario = /- Scenario: "([\s\S]*?)"\s*\n- /.exec(body)?.[1]?.replace(/\s*\n\s*/g, ' ')
    const budget = /Budget (\d+) \/ (\d+)/.exec(body)
    const min = /- Min (\d+)/.exec(body)
    const answer = /^- Answer: (.+)$/m.exec(body)?.[1]?.trim() ?? null
    tasks[id] = { id, title, scenario, answer, min: min ? Number(min[1]) : null, budgetExpert: budget ? Number(budget[1]) : null, budgetNovice: budget ? Number(budget[2]) : null, planned: /\[planned\]/.test(body) }
  }
  return tasks
}

export function loadTasks() {
  return parseTasks(readFileSync(join(repoRoot, 'docs/ux/tasks.md'), 'utf8'))
}

/** H-48: the panel levels. `novice` (Haiku) gets 4 x Min, `intermediate` (Sonnet) and `expert` (Opus) get 3 x Min. The model names are aliases. */
export const LEVELS = { novice: 'novice', intermediate: 'intermediate', expert: 'expert', haiku: 'novice', sonnet: 'intermediate', opus: 'expert' }
export function normalizeLevel(level) {
  const found = LEVELS[String(level ?? '').toLowerCase()]
  if (!found) throw new Error(`unknown level "${level}"; use ${Object.keys(LEVELS).join(', ')}`)
  return found
}

/** Step budget for a level (tasks.md gives both numbers). No level: the 3 x Min budget. An unknown level name is an error (H-48). */
export const budgetFor = (task, level) => {
  if (level === undefined || level === null) return task.budgetExpert
  return normalizeLevel(level) === 'novice' ? task.budgetNovice : task.budgetExpert
}

/** `T18.1-inline` -> `T18.1`: the id of tasks.md (variant suffixes belong to tasks.mjs only). */
export const baseTaskId = (id) => (id === 'T23.1-twice' ? 'T23.1b' : String(id).replace(/-(inline|sidebar|window)$/, ''))

/** H-54: a task asks a question when its tasks.md entry has an `Answer:` line (the scenario wording is not guessed). */
export const asksQuestion = (task) => Boolean(task?.answer)

/** H-59: `check` refuses a verdict for an answer task unless the facilitator passes `--answer` or says `--no-answer`. Returns the error text or null. */
export const answerProblem = (task, { answer, noAnswer } = {}) =>
  asksQuestion(task) && !answer && !noAnswer
    ? 'this task asks a question: pass the "Answer: ..." line of the final report with --answer "<text>", or --no-answer when the panelist gave none'
    : null

/** H-53: the rating from a record's `- SEQ: <n>` line (1 to 7), or null. */
export const seqFromRecord = (text) => {
  const m = /^[-*]?\s*SEQ:\s*(\d)\b/im.exec(text ?? '')
  return m && Number(m[1]) >= 1 && Number(m[1]) <= 7 ? Number(m[1]) : null
}

/** The text after the number on the record's `- SEQ:` line (the panelist's one sentence), or ''. */
export const seqSentence = (text) => /^[-*]?\s*SEQ:\s*\d+\s*[-:.,;)]*\s*(.*)$/im.exec(text ?? '')?.[1]?.trim() ?? ''

const EASY_WORDS = /\b(very easy|easy|easily|simple|straightforward|smooth|no trouble|without trouble|quick)\b/i
const NOT_EASY = /\b(not|n't|never|hardly|wasn'?t|isn'?t)\s+(very |that |so |at all )?(easy|simple|straightforward|smooth)\b/i
const HARD_WORDS = /\b(difficult|hard|confusing|confused|struggl\w*|frustrat\w*|lost|could not|couldn'?t|gave up)\b/i
const VERY_HARD = /\b(very (difficult|hard)|extremely|impossible|gave up|could not (finish|do|complete))\b/i
const NONE_WORDS = /^(none|no|nothing|n\/a|no problems?|no errors?|no stuck points?)\b[.,;]?/i

/**
 * H-72 (SEQ scale guard): the scale is 1 = very difficult ... 7 = very easy, and in R4 twenty panelists reversed it. Returns
 * the reason a rating cannot be right, or null. A low rating (1 to 3) contradicts a record that calls the task easy or lists no
 * stuck points or errors; a high rating (5 to 7) contradicts a record that calls it difficult or hard. `stop --record` refuses
 * such a record unless the facilitator passes --seq-confirmed after asking the panelist.
 */
export function seqProblem(seq, text) {
  if (seq === null || seq === undefined) return null
  const sentence = seqSentence(text)
  const stuck = /^[-*]?\s*(?:Errors|Stuck points)[^:\n]*:\s*(.*)$/im.exec(text ?? '')?.[1]?.trim() ?? ''
  const easy = EASY_WORDS.test(sentence) && !NOT_EASY.test(sentence)
  const hard = HARD_WORDS.test(sentence) || NOT_EASY.test(sentence)
  const scale = 'The scale is 1 = very difficult ... 7 = very easy. Ask the panelist to confirm the number (or correct the record), then pass --seq-confirmed.'
  if (seq <= 3 && easy && !hard) return `SEQ ${seq} (difficult) contradicts the record, which calls the task easy ("${sentence.slice(0, 80)}"). ${scale}`
  if (seq <= 3 && NONE_WORDS.test(stuck) && !hard) return `SEQ ${seq} (difficult) contradicts the record, which lists no stuck points or errors ("${stuck.slice(0, 60)}"). ${scale}`
  if (seq >= 5 && VERY_HARD.test(sentence) && !easy) return `SEQ ${seq} (easy) contradicts the record, which calls the task difficult ("${sentence.slice(0, 80)}"). ${scale}`
  return null
}

/** H-67: an answer of fewer than five words is a placeholder ("x"), not an answer. Returns the error text or null. */
export const answerTooShort = (answer) =>
  typeof answer === 'string' && answer.trim() && answer.trim().split(/\s+/).length < 5
    ? `the answer has fewer than 5 words ("${answer.trim().slice(0, 40)}"): pass the whole text after "Answer:" of the final report, or --no-answer if there was none`
    : null

/**
 * H-66: what `start` does with an existing session.json: `fresh` (none), `reuse` (the same task and level, ready and alive: print
 * the panelist block again), `replace` (failed or dead: the lock is released, the old file is kept aside) or `busy` (another live session).
 */
export function startDecision(existing, { task, level, alive }) {
  if (!existing) return 'fresh'
  if (existing.error || !alive) return 'replace'
  if (existing.task === task && existing.level === level && existing.ready) return 'reuse'
  return 'busy'
}

/**
 * H-72: the new check.json for a record. Returns { check, seq, problem }; `problem` is a refusal text (no SEQ line, out of range,
 * or the scale guard) unless `confirmed`.
 */
export function syncSeq(check, recordText, { confirmed = false } = {}) {
  const seq = seqFromRecord(recordText)
  if (seq === null) return { check, seq: null, problem: /SEQ:/i.test(recordText ?? '') ? 'the SEQ in the record is not a whole number from 1 to 7' : 'no "- SEQ: <1-7>" line in the record' }
  const guard = confirmed ? null : seqProblem(seq, recordText)
  if (guard) return { check, seq, problem: guard }
  return { check: withSeq(check, seq), seq, problem: null }
}

/** H-53: check.json with the rating of the record; the weak flag is recomputed from the rating, the steps and the budget. */
export const withSeq = (check, seq) => ({ ...check, seq, weak: budgetVerdict(check.status, check.steps, check.budget, seq).weak })

/** The scenario as the panelist gets it: `{TEST_PAGE_URL}` becomes the address of the session's test page. */
export const scenarioText = (scenario, { testPageUrl } = {}) => (scenario ?? '').replaceAll('{TEST_PAGE_URL}', testPageUrl ?? TEST_PAGE_URL)

/** Budget verdict of a finished check: FAIL over budget; a PASS within +25 percent of the budget is flagged as a near miss. */
export function budgetVerdict(status, steps, budget, seq) {
  // H-46: a PASS at the budget limit, or rated below 5 (--seq), is a weak pass.
  const atLimit = Boolean(budget) && steps === budget
  const lowSeq = seq !== undefined && seq !== null && Number(seq) < 5
  const weak = status === 'PASS' && Boolean(budget) && steps <= budget && (atLimit || lowSeq)
  const weakLines = weak ? [`weak pass: ${[atLimit ? 'at the budget limit' : '', lowSeq ? `SEQ ${seq} is below 5` : ''].filter(Boolean).join(' and ')}`] : []
  if (!budget || steps <= budget) return { status, nearMiss: false, weak, lines: weakLines }
  const near = status === 'PASS' && steps <= Math.floor(budget * 1.25)
  return {
    status: 'FAIL',
    nearMiss: near,
    weak: false,
    lines: [`BUDGET EXCEEDED (${steps} > ${budget}): the task counts as FAILED`, ...(near ? [`within +25 percent: review (limit ${Math.floor(budget * 1.25)}); the researcher may flag this as a near miss`] : [])]
  }
}

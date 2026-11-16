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
    const scenario = /- Scenario: "([\s\S]*?)"\s*\n- /.exec(body)?.[1]?.split(/\n[ \t]*\n/).map((part) => part.replace(/\s*\n\s*/g, ' ').trim()).join('\n\n')
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
export const baseTaskId = (id) => String(id).replace(/^T23\.1-twice$/, 'T23.1b').replace(/-(inline|sidebar|window)$/, '')

/** H-86: the one id of the second-crash task is T23.1b; the old name T23.1-twice is only accepted on the command line. */
export const canonicalTaskId = (id) => (id === 'T23.1-twice' ? 'T23.1b' : id)

/**
 * H-80: what a task teaches the next one. A panelist context that ran one of the `teachers` must not run the task (T21.1 tests whether
 * a person finds Ctrl+N and Alt+A; T22.x and T31.x test whether a person finds Help). Patterns match the id of a task (variants too).
 */
const START_MENU_OR_HELP = ['T13.1', 'T20.*', 'T22.*', 'T30.2', 'T31.*']
const APPROVAL_HINTS = ['T05.*', 'T06.*', 'T07.1']
export const CONTEXT_RULES = {
  'T21.1': { teachers: [...START_MENU_OR_HELP, ...APPROVAL_HINTS], why: 'they show the Start menu, Help or the approval hints (Ctrl+N, Alt+A)' },
  'T22.*': { teachers: START_MENU_OR_HELP, why: 'they show Help or the Start menu' },
  'T31.*': { teachers: START_MENU_OR_HELP, why: 'they show Help or the Start menu' }
}
const matchesId = (pattern, id) => (pattern.endsWith('*') ? baseTaskId(id).startsWith(pattern.slice(0, -1)) : baseTaskId(id) === pattern)

/** H-80: the earlier tasks of a panelist context that make `task` invalid (empty = fine). */
export function contextConflicts(task, previous = []) {
  const rule = Object.entries(CONTEXT_RULES).find(([pattern]) => matchesId(pattern, task))?.[1]
  if (!rule) return []
  return previous.filter((p) => rule.teachers.some((t) => matchesId(t, p)))
}

/** H-80: `--previous T20.1,T22.1` -> ['T20.1', 'T22.1'] (canonical ids). */
export const parsePrevious = (text) => String(text ?? '').split(/[\s,]+/).filter(Boolean).map(canonicalTaskId)

/** H-80: the refusal text, or null. `task` must be run by a fresh panelist, so the previous tasks of the context must not teach it. */
export function contextProblem(task, previous = []) {
  const bad = contextConflicts(task, previous)
  if (!bad.length) return null
  const rule = Object.entries(CONTEXT_RULES).find(([pattern]) => matchesId(pattern, task))[1]
  return `${task} cannot run in a context that already ran ${bad.join(', ')} (${rule.why}). Spawn a FRESH panelist for ${task} (one panelist per task, H-80) and start it without --previous.`
}

/** H-83: the Result line of a record gets "Steps: N of M" when the panelist left it out. Returns the new text (unchanged when present or no Result line). */
export function withStepsLine(text, steps, budget) {
  if (/Steps:\s*\d+\s+of\s+\d+/i.test(text)) return text
  const line = `Steps: ${steps}${budget ? ` of ${budget}` : ''}`
  return text.replace(/^(- Result:.*)$/m, (m) => `${m.replace(/\s+$/, '')}   ${line}`)
}

/** H-54: a task asks a question when its tasks.md entry has an `Answer:` line (the scenario wording is not guessed). */
export const asksQuestion = (task) => Boolean(task?.answer)

/**
 * H-59, H-90: `check` refuses a verdict for an answer task unless the facilitator passes `--answer`. `--no-answer` alone is refused too
 * (H-82 came back in R4, R5 and R6: a MANUAL verdict with no Answer line); it needs `--accept-no-answer` as well, for a panelist
 * that really gave none. Returns the error text or null.
 */
export const answerProblem = (task, { answer, noAnswer, acceptNoAnswer } = {}) => {
  if (!asksQuestion(task) || answer) return null
  if (noAnswer && acceptNoAnswer) return null
  if (noAnswer) return 'this task asks a question and --no-answer alone is not accepted (H-90): pass the "Answer: ..." line of the final report with --answer "<text>"; when the panelist really gave none, pass --no-answer --accept-no-answer and say so in the record'
  return 'this task asks a question: pass the "Answer: ..." line of the final report with --answer "<text>" (or, when the panelist gave none, --no-answer --accept-no-answer)'
}

/**
 * H-90: `stop` refuses a record without an `Answer:` line (more than a placeholder) for a task that has an Answer field in
 * tasks.md, unless `acceptNoAnswer`. Returns the error text or null.
 */
export function recordAnswerProblem(task, recordText, { acceptNoAnswer = false } = {}) {
  if (!asksQuestion(task) || acceptNoAnswer) return null
  const value = /^[-*]?\s*Answer:\s*(.*)$/im.exec(recordText ?? '')?.[1]?.trim() ?? ''
  if (value && !/^(none|n\/a|no answer|-|\.\.\.|<.*>)\.?$/i.test(value)) return null
  return 'the record has no "- Answer: <text>" line, but this task asks a question (H-90): add the panelist\'s answer to the record, or pass --accept-no-answer when the panelist really gave none'
}

/** H-92: the steps that count for the budget and the weak rule: the steps when the check first held (`stepsToPass`), never more than the steps taken. */
export const effectiveSteps = (steps, stepsToPass) => (Number.isInteger(stepsToPass) && stepsToPass >= 0 ? Math.min(steps, stepsToPass) : steps)

/**
 * H-92: the steps when the check first held. An explicit value (`--steps-to-pass`, read from the log by the facilitator) wins; else
 * the steps of the first earlier run whose checker said PASS; else the steps now when the checker says PASS; else null.
 */
export function stepsToPassOf({ explicit, runs = [], checkerStatus, steps }) {
  if (Number.isInteger(explicit)) return explicit
  const first = runs.find((r) => r.checkerStatus === 'PASS')
  if (first) return first.steps
  return checkerStatus === 'PASS' ? steps : null
}

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
export const withSeq = (check, seq) => ({ ...check, seq, weak: budgetVerdict(check.status, effectiveSteps(check.steps, check.stepsToPass), check.budget, seq).weak })

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

/** H-109: minutes between the first and the last log entry (one decimal), or null when the log has fewer than two timed entries. */
export function minutesFromLog(entries) {
  const times = entries.map((e) => Date.parse(e.ts)).filter(Number.isFinite)
  if (times.length < 2) return null
  return Math.max(0.1, Math.round(((Math.max(...times) - Math.min(...times)) / 60_000) * 10) / 10)
}

/** H-109: the Result line of a record gets `Time: <n> min` measured from the log, replacing whatever the panelist wrote (a placeholder, "not measured", a bare number). Without a Result line the text is unchanged. */
export function withTimeLine(text, minutes) {
  if (minutes === null || minutes === undefined) return text
  const time = `Time: ${minutes} min`
  return text.replace(/^(- Result:.*)$/m, (line) => (/\bTime:/i.test(line) ? line.replace(/\bTime:.*$/i, time) : `${line.replace(/\s+$/, '')}   ${time}`))
}

const TEMPLATE_PLACEHOLDER = /<(?:stop fills[^<>\n]*|leave this line as it is[^<>\n]*|min|n|budget|reason from check|task|title|level|round|1-7|one sentence[^<>\n]*|packaged\|unpackaged[^<>\n]*)>/gi

/** H-109: the template placeholders that are still in a finished record (`<stop fills in>`, `<min>`, `<n>`, ...), without repeats. */
export const recordPlaceholders = (text) => [...new Set(String(text ?? '').match(TEMPLATE_PLACEHOLDER) ?? [])]

/** H-109: the refusal text for a record with a placeholder, or null. */
export const recordPlaceholderProblem = (text) => {
  const found = recordPlaceholders(text)
  return found.length ? `the record still has template placeholders: ${found.join(' ')}. Fill them in (Time, Steps and Build are filled by stop; the rest is the panelist's report) and run stop again` : null
}

/** H-110: check.json with the rerun and finished-by-facilitator flags set, and the reason in `notes`. A flag that is not given keeps its value. */
export function withRunFlags(check, { rerun, finishedByFacilitator } = {}) {
  const notes = [...(check.notes ?? [])]
  if (rerun && !notes.includes(`rerun: ${rerun}`)) notes.push(`rerun: ${rerun}`)
  if (finishedByFacilitator && !notes.includes('finished by the facilitator')) notes.push('finished by the facilitator')
  return { ...check, ...(rerun ? { rerun: { reason: rerun } } : {}), ...(finishedByFacilitator ? { finishedByFacilitator: true } : {}), notes }
}

/**
 * H-110: a session whose lost first run is kept as `<task>-<level>-session-lost` is a rerun; `stop` refuses without `--rerun "<reason>"`
 * (the flag goes into check.json, so the synthesis can count it). `lostRunExists` is true when that folder exists beside the record.
 */
export const rerunProblem = ({ lostRunExists, rerun, check }) =>
  lostRunExists && !rerun && !check?.rerun ? 'a "-session-lost" folder of this task exists, so this session is a rerun: pass --rerun "<why the first run was lost>" (H-110)' : null

/** H-111: `stop` needs the record, because the rating (`seq`) is read from it; `--no-record` is for a session that has no record. */
export const stopRecordProblem = ({ hasCheck, record, noRecord, noCheck }) =>
  hasCheck && !record && !noRecord && !noCheck ? 'stop needs --record <record.md>: the rating (SEQ) in check.json is read from the record\'s "- SEQ:" line (H-111). Pass --no-record only when there is no record' : null

/**
 * H-119: what `check` prints. The panelist must not learn what the check needs, so a result other than PASS shows no reason and no
 * notes (they are in check.json for the facilitator); `--facilitator` prints everything.
 */
export function checkLines({ result, steps, budget, facilitator = false }) {
  const shown = facilitator || result.status === 'PASS'
  return [
    shown ? `${result.status}: ${result.reason}` : `${result.status}: (the reason is kept for the facilitator in check.json, H-119)`,
    ...(shown ? result.notes.map((n) => `  note: ${n}`) : []),
    `steps: ${steps}${budget ? ` of budget ${budget}` : ''}`
  ]
}

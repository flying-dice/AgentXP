// Reads task scenarios, Min and budgets from docs/ux/tasks.md (the facilitator gives only the scenario to the panelist).
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { TEST_PAGE_URL } from './fixtures.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

export function parseTasks(markdown) {
  const tasks = {}
  const parts = markdown.split(/^\*\*(T\d+\.\d+) - (.+?)\*\*.*$/m)
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
export const baseTaskId = (id) => String(id).replace(/-(inline|sidebar|window|twice)$/, '')

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

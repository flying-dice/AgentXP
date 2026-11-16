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
    tasks[id] = { id, title, scenario, min: min ? Number(min[1]) : null, budgetExpert: budget ? Number(budget[1]) : null, budgetNovice: budget ? Number(budget[2]) : null, planned: /\[planned\]/.test(body) }
  }
  return tasks
}

export function loadTasks() {
  return parseTasks(readFileSync(join(repoRoot, 'docs/ux/tasks.md'), 'utf8'))
}

/** Step budget for a level: 3 x Min for opus/sonnet, 4 x Min for haiku (tasks.md gives both numbers). */
export const budgetFor = (task, level) => (level === 'haiku' ? task.budgetNovice : task.budgetExpert)

/** `T18.1-inline` -> `T18.1`: the id of tasks.md (variant suffixes belong to tasks.mjs only). */
export const baseTaskId = (id) => String(id).replace(/-(inline|sidebar|window)$/, '')

/** H-29: does the scenario ask a question? Then the facilitator must pass the panelist's `Answer:` line to `check --answer`. */
export const asksQuestion = (scenario) => /\?|\b(tell me|find out|show me|which|how many|what)\b/i.test(scenario ?? '')

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

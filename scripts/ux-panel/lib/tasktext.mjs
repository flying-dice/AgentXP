// Reads task scenarios, Min and budgets from docs/ux/tasks.md (the facilitator gives only the scenario to the panelist).
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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

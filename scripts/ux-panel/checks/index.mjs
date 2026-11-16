import { TASKS } from '../tasks.mjs'
import { checks as advanced } from './advanced.mjs'
import { checks as changes } from './changes.mjs'
import { checks as chat } from './chat.mjs'
import { checks as desktop } from './desktop.mjs'
import { checks as launch } from './launch.mjs'
import { checks as settings } from './settings.mjs'
import { checks as features } from './features.mjs'

export const CHECKS = { ...launch, ...chat, ...changes, ...desktop, ...settings, ...advanced, ...features }
// Variants of one task share the checker of the base task.
const baseId = (id) => id.replace(/-(inline|sidebar|window|twice)$/, '')

/** Runs the checker of a task: { status: 'PASS'|'FAIL'|'MANUAL', reason, notes }. */
export async function runCheck(ctx, taskId, options = {}) {
  const fn = CHECKS[taskId] ?? CHECKS[baseId(taskId)]
  if (!fn) return { status: 'FAIL', reason: `no checker for task ${taskId}`, notes: [] }
  try {
    return await fn(ctx, options)
  } catch (error) {
    return { status: 'FAIL', reason: `checker error: ${error instanceof Error ? error.message : String(error)}`, notes: [] }
  }
}

export const uncovered = () => Object.keys(TASKS).filter((id) => !CHECKS[id] && !CHECKS[baseId(id)])

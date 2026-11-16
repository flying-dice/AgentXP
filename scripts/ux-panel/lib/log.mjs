// Session log (JSONL). One line per command: { ts, cmd, args, flags?, screenshot?, window?, ok, note?, ms? }.
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { ACTION_COMMANDS } from './args.mjs'

export function createLog(file) {
  return {
    file,
    append(entry) {
      const line = { ts: new Date().toISOString(), ...entry }
      appendFileSync(file, `${JSON.stringify(line)}\n`)
      return line
    }
  }
}

export function readLog(file) {
  if (!existsSync(file)) return []
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l))
}

/** Step counting for budgets: every successful action command (click, move, drag, scroll, type, key) is one step. */
export function countSteps(entries) {
  return entries.filter((e) => ACTION_COMMANDS.includes(e.cmd) && e.ok !== false).length
}

/** H-101: the tasks whose state is checked after every action, so that the log says when the check first held (the check has no answer to wait for). */
export const REPLAY_TASKS = ['T01.1', 'T02.1']

/**
 * H-101: the steps when the check first held, from the log: the number of successful actions up to and including the first one
 * with `checkHeld: true`. Null when no entry says so (the task is not replayed, or the check never held).
 */
export function stepsToPassFromLog(entries) {
  let steps = 0
  for (const e of entries) {
    if (ACTION_COMMANDS.includes(e.cmd) && e.ok !== false) steps += 1
    if (e.checkHeld === true) return steps
  }
  return null
}

export function summarize(entries) {
  const byCmd = {}
  for (const e of entries) byCmd[e.cmd] = (byCmd[e.cmd] ?? 0) + 1
  const times = entries.map((e) => Date.parse(e.ts)).filter(Number.isFinite)
  return { commands: entries.length, steps: countSteps(entries), byCmd, errors: entries.filter((e) => e.ok === false).length, seconds: times.length > 1 ? Math.round((Math.max(...times) - Math.min(...times)) / 1000) : 0, screenshots: entries.filter((e) => e.screenshot).length }
}

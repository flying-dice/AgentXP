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

export function summarize(entries) {
  const byCmd = {}
  for (const e of entries) byCmd[e.cmd] = (byCmd[e.cmd] ?? 0) + 1
  const times = entries.map((e) => Date.parse(e.ts)).filter(Number.isFinite)
  return { commands: entries.length, steps: countSteps(entries), byCmd, errors: entries.filter((e) => e.ok === false).length, seconds: times.length > 1 ? Math.round((Math.max(...times) - Math.min(...times)) / 1000) : 0, screenshots: entries.filter((e) => e.screenshot).length }
}

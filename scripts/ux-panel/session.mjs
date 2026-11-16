#!/usr/bin/env node
// Facilitator tool. NOT for panelists.
//   node scripts/ux-panel/session.mjs start --task T01.1 --level haiku --out <dir>
//   node scripts/ux-panel/session.mjs task  --task T01.1 [--level haiku]
//   node scripts/ux-panel/session.mjs check --out <dir> [--task T01.1] [--answer "<panelist answer>"]
//   node scripts/ux-panel/session.mjs stop  --out <dir>
//   node scripts/ux-panel/session.mjs list
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from './lib/args.mjs'
import { countSteps, readLog, summarize } from './lib/log.mjs'
import { request } from './lib/rpc.mjs'
import { budgetFor, loadTasks } from './lib/tasktext.mjs'
import { TASKS, TASK_NOTES } from './tasks.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const [command, ...rest] = process.argv.slice(2)
const { flags } = parseArgs(rest, { task: 'string', level: 'string', out: 'string', answer: 'string', 'no-xvfb': 'bool', timeout: 'string' })
const outDir = () => resolve(flags.out ?? process.env.UX_SESSION ?? '.')
const sessionInfo = () => {
  const file = join(outDir(), 'session.json')
  if (!existsSync(file)) throw new Error(`no session in ${outDir()}`)
  return JSON.parse(readFileSync(file, 'utf8'))
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function taskLines(task, level) {
  const tasks = loadTasks()
  const t = tasks[task]
  if (!t) return [`(task ${task} not found in docs/ux/tasks.md)`]
  return [`Task ${t.id} - ${t.title}${t.planned ? ' [planned feature]' : ''}`, `Scenario (give ONLY this text to the panelist): ${t.scenario}`, `Min ${t.min}; step budget for ${level ?? 'opus/sonnet'}: ${budgetFor(t, level)}${level ? '' : ` (haiku: ${t.budgetNovice})`}; time budget 10 minutes`]
}

async function start() {
  if (!flags.task || !TASKS[flags.task]) throw new Error(`--task <id> required; known: ${Object.keys(TASKS).join(', ')}`)
  const out = outDir()
  if (!flags.out) throw new Error('--out <dir> required')
  if (existsSync(join(out, 'session.json'))) throw new Error(`${out} already holds a session; use a new folder`)
  mkdirSync(out, { recursive: true })
  if (!existsSync(join(here, '../../out/main/index.js'))) throw new Error('the app is not built: run `npx electron-vite build` first')
  const args = [join(here, 'server.mjs'), '--session', out, '--task', flags.task, '--level', flags.level ?? 'sonnet']
  const useXvfb = !flags['no-xvfb'] && !process.env.DISPLAY && spawnSync('which', ['xvfb-run']).status === 0
  const log = openSync(join(out, 'server.log'), 'a')
  const child = useXvfb
    ? spawn('xvfb-run', ['-a', '-s', '-screen 0 1920x1200x24', process.execPath, ...args], { detached: true, stdio: ['ignore', log, log] })
    : spawn(process.execPath, args, { detached: true, stdio: ['ignore', log, log] })
  child.unref()
  const deadline = Date.now() + Number(flags.timeout ?? 120_000)
  for (;;) {
    await sleep(300)
    const file = join(out, 'session.json')
    if (existsSync(file)) {
      const info = JSON.parse(readFileSync(file, 'utf8'))
      if (info.error) throw new Error(`start state failed:\n${info.error}\n(see ${join(out, 'server.log')})`)
      if (info.ready) break
    }
    if (Date.now() > deadline) throw new Error(`the session did not become ready (see ${join(out, 'server.log')})`)
  }
  const info = sessionInfo()
  console.log(`Session ready: ${out}`)
  console.log(`Task ${flags.task}, level ${flags.level ?? 'sonnet'}, preset ${info.preset}${info.note ? ` (${info.note})` : ''}`)
  console.log(taskLines(flags.task, flags.level).join('\n'))
  if (TASK_NOTES[flags.task]) console.log(`Facilitator note: ${TASK_NOTES[flags.task]}`)
  console.log(`\nPanelist command prefix:\n  UX_SESSION=${out} node ${join(here, 'ux.mjs')} <command>`)
}

async function check() {
  const info = sessionInfo()
  const task = flags.task ?? info.task
  const reply = await request(info.admin, { op: 'check', task, answer: flags.answer })
  if (!reply.ok) throw new Error(reply.text)
  const result = reply.result
  const entries = readLog(join(outDir(), 'log.jsonl'))
  const steps = countSteps(entries)
  const t = loadTasks()[task.replace(/-(inline|sidebar|window)$/, '')]
  const level = flags.level ?? info.level
  const budget = t ? budgetFor(t, level) : null
  const lines = [`${result.status}: ${result.reason}`, ...result.notes.map((n) => `  note: ${n}`), `steps: ${steps}${budget ? ` of budget ${budget}` : ''}`]
  let status = result.status
  if (budget && steps > budget) {
    lines.push(`BUDGET EXCEEDED (${steps} > ${budget}): the task counts as FAILED`)
    status = 'FAIL'
  }
  console.log(lines.join('\n'))
  writeFileSync(join(outDir(), 'check.json'), JSON.stringify({ task, level, status, checkerStatus: result.status, reason: result.reason, notes: result.notes, steps, budget, answer: flags.answer ?? null, checkedAt: new Date().toISOString() }, null, 2))
  process.exitCode = status === 'PASS' ? 0 : status === 'FAIL' ? 1 : 2
}

async function stop() {
  const out = outDir()
  const info = sessionInfo()
  await request(info.admin, { op: 'shutdown' }).catch(() => undefined)
  for (let i = 0; i < 100; i++) {
    try {
      process.kill(info.pid, 0)
    } catch {
      break
    }
    await sleep(100)
  }
  try {
    process.kill(info.pid, 'SIGKILL')
  } catch {
    // already gone
  }
  const entries = readLog(join(out, 'log.jsonl'))
  const summary = { ...summarize(entries), task: info.task, level: info.level, archivedAt: new Date().toISOString() }
  writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2))
  if (existsSync(join(out, 'state.json'))) writeFileSync(join(out, 'state.json'), readFileSync(join(out, 'state.json')))
  rmSync(info.tmp, { recursive: true, force: true })
  console.log(`Session stopped. Archive in ${out}: log.jsonl (${summary.commands} commands, ${summary.steps} steps), shots/ (${summary.screenshots}), summary.json${existsSync(join(out, 'check.json')) ? ', check.json' : ''}`)
}

try {
  if (command === 'start') await start()
  else if (command === 'check') await check()
  else if (command === 'stop') await stop()
  else if (command === 'task') console.log(taskLines(flags.task, flags.level).join('\n'))
  else if (command === 'list') {
    const tasks = loadTasks()
    for (const id of Object.keys(TASKS)) console.log(`${id}\t${TASKS[id].preset}\t${tasks[id.replace(/-(inline|sidebar|window)$/, '')]?.title ?? ''}`)
  } else {
    console.log('usage: session.mjs start|check|stop|task|list (see FACILITATOR.md)')
    process.exitCode = 64
  }
} catch (error) {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}

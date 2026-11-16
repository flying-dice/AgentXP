#!/usr/bin/env node
// Facilitator tool. NOT for panelists.
//   node scripts/ux-panel/session.mjs start --task T01.1 --level haiku --out <dir>
//   node scripts/ux-panel/session.mjs task  --task T01.1 [--level haiku]
//   node scripts/ux-panel/session.mjs check --out <dir> [--task T01.1] [--answer "<panelist answer>"]
//   node scripts/ux-panel/session.mjs stop  --out <dir>
//   node scripts/ux-panel/session.mjs list
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from './lib/args.mjs'
import { countSteps, readLog, summarize } from './lib/log.mjs'
import { request } from './lib/rpc.mjs'
import { baseTaskId, budgetFor, budgetVerdict, loadTasks, scenarioText } from './lib/tasktext.mjs'
import { TASKS, TASK_NOTES } from './tasks.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const [command, ...rest] = process.argv.slice(2)
const { flags } = parseArgs(rest, { task: 'string', level: 'string', out: 'string', answer: 'string', 'no-xvfb': 'bool', timeout: 'string', port: 'string', facilitator: 'bool' })
const outDir = () => resolve(flags.out ?? process.env.UX_SESSION ?? '.')
const sessionInfo = () => {
  const file = join(outDir(), 'session.json')
  if (!existsSync(file)) throw new Error(`no session in ${outDir()}`)
  return JSON.parse(readFileSync(file, 'utf8'))
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** A free TCP port (each session serves its own test page, so parallel sessions never clash). */
const freePort = () =>
  new Promise((resolvePort, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => resolvePort(port))
    })
  })

/** The block for the panelist: scenario, budget, command prefix. Nothing else (no task id, no preset, no notes). */
function panelistBlock(task, level, { testPageUrl, out } = {}) {
  const t = loadTasks()[baseTaskId(task)]
  if (!t) return [`(task ${task} not found in docs/ux/tasks.md)`]
  return [
    `Session folder: ${out}`,
    `Step budget: ${budgetFor(t, level)} actions; time limit 10 minutes`,
    `Scenario: ${scenarioText(t.scenario, { testPageUrl })}`,
    `Command prefix: UX_SESSION=${out} node ${join(here, 'ux.mjs')} <command>`
  ]
}

/** Facilitator-only lines: id, title, Min, both budgets, preset, notes. */
function facilitatorLines(task, level, info = {}) {
  const t = loadTasks()[baseTaskId(task)]
  if (!t) return [`(task ${task} not found in docs/ux/tasks.md)`]
  return [
    `Task ${task} - ${t.title}${t.planned ? ' [planned feature]' : ''}`,
    `Min ${t.min}; step budget for ${level ?? 'opus/sonnet'}: ${budgetFor(t, level)}${level ? '' : ` (haiku: ${t.budgetNovice})`}; time budget 10 minutes`,
    ...(info.preset ? [`Preset ${info.preset}${info.note ? ` (${info.note})` : ''}`] : []),
    ...(TASK_NOTES[task] ? [`Facilitator note: ${TASK_NOTES[task]}`] : [])
  ]
}

async function start() {
  if (!flags.task || !TASKS[flags.task]) throw new Error(`--task <id> required; known: ${Object.keys(TASKS).join(', ')}`)
  const out = outDir()
  if (!flags.out) throw new Error('--out <dir> required')
  if (existsSync(join(out, 'session.json'))) throw new Error(`${out} already holds a session; use a new folder`)
  mkdirSync(out, { recursive: true })
  if (!existsSync(join(here, '../../out/main/index.js'))) throw new Error('the app is not built: run `npx electron-vite build` first')
  const args = [join(here, 'server.mjs'), '--session', out, '--task', flags.task, '--level', flags.level ?? 'sonnet', '--port', String(flags.port ?? (await freePort()))]
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
  // stdout is the panelist block only; facilitator notes go to stderr (or to stdout with --facilitator).
  const facilitator = [`Session ready: ${out}`, `Level ${flags.level ?? 'sonnet'}`, ...facilitatorLines(flags.task, flags.level ?? 'sonnet', info), `Test page: ${info.testPageUrl}`]
  const note = facilitator.map((l) => `[facilitator] ${l}`).join('\n')
  if (flags.facilitator) console.log(`${note}\n`)
  else console.error(note)
  console.log(['=== FOR THE PANELIST (give exactly this, nothing else) ===', ...panelistBlock(flags.task, flags.level ?? 'sonnet', { testPageUrl: info.testPageUrl, out }), '=== END ==='].join('\n'))
}

async function check() {
  const info = sessionInfo()
  const task = flags.task ?? info.task
  const reply = await request(info.admin, { op: 'check', task, answer: flags.answer })
  if (!reply.ok) throw new Error(reply.text)
  const result = reply.result
  const entries = readLog(join(outDir(), 'log.jsonl'))
  const steps = countSteps(entries)
  const t = loadTasks()[baseTaskId(task)]
  const level = flags.level ?? info.level
  const budget = t ? budgetFor(t, level) : null
  const lines = [`${result.status}: ${result.reason}`, ...result.notes.map((n) => `  note: ${n}`), `steps: ${steps}${budget ? ` of budget ${budget}` : ''}`]
  const verdict = budgetVerdict(result.status, steps, budget)
  const status = verdict.status
  lines.push(...verdict.lines)
  console.log(lines.join('\n'))
  writeFileSync(join(outDir(), 'check.json'), JSON.stringify({ task, level, status, nearMiss: verdict.nearMiss, checkerStatus: result.status, reason: result.reason, notes: result.notes, steps, budget, answer: flags.answer ?? null, checkedAt: new Date().toISOString() }, null, 2))
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
  else if (command === 'task') {
    const info = existsSync(join(outDir(), 'session.json')) ? sessionInfo() : {}
    console.log(panelistBlock(flags.task, flags.level, { testPageUrl: info.testPageUrl, out: flags.out ?? '<session folder>' }).join('\n'))
    if (flags.facilitator) console.log(facilitatorLines(flags.task, flags.level, {}).join('\n'))
  }
  else if (command === 'list') {
    const tasks = loadTasks()
    for (const id of Object.keys(TASKS)) console.log(`${id}\t${TASKS[id].preset}\t${tasks[baseTaskId(id)]?.title ?? ''}`)
  } else {
    console.log('usage: session.mjs start|check|stop|task|list (see FACILITATOR.md)')
    process.exitCode = 64
  }
} catch (error) {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}

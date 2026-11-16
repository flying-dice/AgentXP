#!/usr/bin/env node
// Facilitator tool. NOT for panelists.
//   node scripts/ux-panel/session.mjs start --task T01.1 --level novice --out <dir>   (novice | intermediate | expert)
//   node scripts/ux-panel/session.mjs task  --task T01.1 [--level novice]
//   node scripts/ux-panel/session.mjs check --out <dir> [--task T01.1] [--answer "<panelist answer>" | --no-answer]
//   node scripts/ux-panel/session.mjs stop  --out <dir> [--record <record.md>]   (reads "- SEQ: n" from the record)
//   node scripts/ux-panel/session.mjs seq   --out <dir> --record <record.md> [--seq-confirmed]   (copies the record's SEQ into a stopped session's check.json)
//   node scripts/ux-panel/session.mjs seq   --records <records dir> --sessions <sessions dir>     (the same for every <name>.md with a <name>/check.json)
//   node scripts/ux-panel/session.mjs list
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { existsSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from './lib/args.mjs'
import { countSteps, readLog, summarize } from './lib/log.mjs'
import { request } from './lib/rpc.mjs'
import { answerProblem, answerTooShort, baseTaskId, budgetFor, budgetVerdict, loadTasks, normalizeLevel, scenarioText, startDecision, syncSeq } from './lib/tasktext.mjs'
import { TASKS, TASK_NOTES } from './tasks.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const [command, ...rest] = process.argv.slice(2)
const { flags } = parseArgs(rest, { task: 'string', level: 'string', out: 'string', answer: 'string', 'no-answer': 'bool', record: 'string', 'no-check': 'bool', 'no-xvfb': 'bool', timeout: 'string', port: 'string', facilitator: 'bool', 'seq-confirmed': 'bool', records: 'string', sessions: 'string' })
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
    `Min ${t.min}; step budget for ${level ?? 'intermediate/expert'}: ${budgetFor(t, level)}${level ? '' : ` (novice: ${t.budgetNovice})`}; time budget 10 minutes`,
    ...(info.preset ? [`Preset ${info.preset}${info.note ? ` (${info.note})` : ''}`] : []),
    ...(TASK_NOTES[task] ? [`Facilitator note: ${TASK_NOTES[task]}`] : [])
  ]
}

async function start() {
  if (!flags.task || !TASKS[flags.task]) throw new Error(`--task <id> required; known: ${Object.keys(TASKS).join(', ')}`)
  const out = outDir()
  if (!flags.out) throw new Error('--out <dir> required')
  const level = normalizeLevel(flags.level ?? 'intermediate') // H-48: unknown level names are refused
  // H-66: start is idempotent for the same task and level; a failed or dead session releases the folder (its session.json is kept aside as session.failed-<time>.json, server.log stays).
  const existingFile = join(out, 'session.json')
  const existing = existsSync(existingFile) ? JSON.parse(readFileSync(existingFile, 'utf8')) : null
  const decision = startDecision(existing, { task: flags.task, level, alive: existing ? isAlive(existing.pid) : false })
  if (decision === 'busy') throw new Error(`${out} already holds a running session for ${existing.task} (${existing.level}); stop it or use a new folder`)
  if (decision === 'reuse') {
    announce(out, level, existing)
    return
  }
  if (decision === 'replace') {
    renameSync(existingFile, join(out, `session.failed-${Date.now()}.json`))
    if (existing.tmp) rmSync(existing.tmp, { recursive: true, force: true })
  }
  mkdirSync(out, { recursive: true })
  if (!existsSync(join(here, '../../out/main/index.js'))) throw new Error('the app is not built: run `npx electron-vite build` first')
  const args = [join(here, 'server.mjs'), '--session', out, '--task', flags.task, '--level', level, '--port', String(flags.port ?? (await freePort()))]
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
      if (info.error) {
        // H-66: the server has closed the app; make sure nothing is left, release the lock and keep server.log.
        if (isAlive(info.pid)) {
          try {
            process.kill(info.pid, 'SIGKILL')
          } catch {
            // already gone
          }
        }
        renameSync(file, join(out, `session.failed-${Date.now()}.json`))
        if (info.tmp) rmSync(info.tmp, { recursive: true, force: true })
        throw new Error(`start state failed:\n${info.error}\n(the folder is free again; see ${join(out, 'server.log')})`)
      }
      if (info.ready) break
    }
    if (Date.now() > deadline) throw new Error(`the session did not become ready (see ${join(out, 'server.log')})`)
  }
  announce(out, level, sessionInfo())
}

/** Prints the facilitator notes (stderr) and the panelist block (stdout). */
function announce(out, level, info) {
  // stdout is the panelist block only; facilitator notes go to stderr (or to stdout with --facilitator).
  const facilitator = [`Session ready: ${out}`, `Level ${level}`, ...facilitatorLines(flags.task, level, info), 'Spawn a FRESH panelist for this task (H-69): no memory of any earlier task, not even of the same journey.', `Test page: ${info.testPageUrl}`]
  const note = facilitator.map((l) => `[facilitator] ${l}`).join('\n')
  if (flags.facilitator) console.log(`${note}\n`)
  else console.error(note)
  console.log(['=== FOR THE PANELIST (give exactly this, nothing else) ===', ...panelistBlock(flags.task, level, { testPageUrl: info.testPageUrl, out }), '=== END ==='].join('\n'))
}

async function check() {
  const info = sessionInfo()
  const task = flags.task ?? info.task
  const t = loadTasks()[baseTaskId(task)]
  // H-59: no verdict for an answer task without the panelist's answer (or an explicit --no-answer).
  const missing = answerProblem(t, { answer: flags.answer, noAnswer: flags['no-answer'] })
  if (missing) throw new Error(missing)
  const tooShort = answerTooShort(flags.answer) // H-67
  if (tooShort) throw new Error(tooShort)
  const reply = await request(info.admin, { op: 'check', task, answer: flags.answer })
  if (!reply.ok) throw new Error(reply.text)
  const result = reply.result
  const entries = readLog(join(outDir(), 'log.jsonl'))
  const steps = countSteps(entries)
  const level = normalizeLevel(flags.level ?? info.level)
  const budget = t ? budgetFor(t, level) : null
  const lines = [`${result.status}: ${result.reason}`, ...result.notes.map((n) => `  note: ${n}`), `steps: ${steps}${budget ? ` of budget ${budget}` : ''}`]
  const verdict = budgetVerdict(result.status, steps, budget, null)
  const status = verdict.status
  lines.push(...verdict.lines)
  console.log(lines.join('\n'))
  // H-67: every run is appended to `runs`; the top level holds the last run, and the record shows all runs.
  const file = join(outDir(), 'check.json')
  const previous = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
  const checkedAt = new Date().toISOString()
  const run = { checkedAt, status, checkerStatus: result.status, reason: result.reason, steps, answer: flags.answer ?? null, noAnswer: Boolean(flags['no-answer']) }
  const runs = [...(previous?.runs ?? (previous ? [{ checkedAt: previous.checkedAt, status: previous.status, checkerStatus: previous.checkerStatus, reason: previous.reason, steps: previous.steps, answer: previous.answer, noAnswer: previous.noAnswer }] : [])), run]
  const next = { task, level, status, nearMiss: verdict.nearMiss, weak: verdict.weak, seq: previous?.seq ?? null, checkerStatus: result.status, reason: result.reason, notes: result.notes, steps, budget, answer: flags.answer ?? null, noAnswer: Boolean(flags['no-answer']), checkedAt, runs }
  writeFileSync(file, JSON.stringify(next.seq === null ? next : withSeqKeep(next), null, 2))
  if (runs.length > 1) console.log(`this is run ${runs.length} of this session; check.json keeps all runs (${runs.map((r) => r.status).join(', ')}); the record must explain the earlier ones`)
  process.exitCode = status === 'PASS' ? 0 : status === 'FAIL' ? 1 : 2
}

const withSeqKeep = (check) => ({ ...check, weak: budgetVerdict(check.status, check.steps, check.budget, check.seq).weak })

/** H-72: copies the SEQ of a record into a check.json. Throws on a missing, out-of-range or contradictory rating. Returns a message, or null without a check.json. */
function applyRecord(checkFile, recordFile, confirmed = Boolean(flags['seq-confirmed'])) {
  const text = readFileSync(resolve(recordFile), 'utf8')
  if (!existsSync(checkFile)) {
    const probe = syncSeq({ status: 'FAIL', steps: 0, budget: null }, text, { confirmed })
    if (probe.problem) throw new Error(`${probe.problem} (${recordFile})`)
    return null
  }
  const { check, seq, problem } = syncSeq(JSON.parse(readFileSync(checkFile, 'utf8')), text, { confirmed })
  if (problem) throw new Error(`${problem} (${recordFile})`)
  writeFileSync(checkFile, JSON.stringify(check, null, 2))
  return `SEQ ${seq} read from the record${check.weak ? '; weak pass (SEQ below 5 or at the budget limit)' : ''}`
}

const isAlive = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function stop() {
  const out = outDir()
  const info = sessionInfo()
  // H-30: no archive without a verdict (a session lost to an outage must not look finished), and a gone session keeps its folder.
  if (!isAlive(info.pid)) {
    console.log(`no running session for ${out} (the server process ${info.pid} is gone). The folder is kept. Start the task again with a new --out folder; use \`stop --no-check\` only to clean up.`)
    if (!flags['no-check']) {
      process.exitCode = 1
      return
    }
  } else if (!existsSync(join(out, 'check.json')) && !flags['no-check']) {
    throw new Error(`no check.json in ${out}: run \`check\` first (or pass --no-check to archive without a verdict)`)
  }
  // H-53/H-72: the rating comes from the record (`- SEQ: n`), never from a command line option; the scale guard refuses a record whose rating contradicts its text.
  if (flags.record) {
    const file = join(out, 'check.json')
    const result = applyRecord(file, flags.record)
    if (result) console.log(result)
  }
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
  else if (command === 'seq') {
    // H-72: regenerate the SEQ (and the weak flag) of check.json files from the records, with the scale guard.
    if (flags.records) {
      const dir = resolve(flags.records)
      const sessions = resolve(flags.sessions ?? '.')
      let changed = 0
      for (const name of readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3))) {
        const file = join(sessions, name, 'check.json')
        if (!existsSync(file)) continue
        const before = JSON.parse(readFileSync(file, 'utf8'))
        try {
          const message = applyRecord(file, join(dir, `${name}.md`))
          const after = JSON.parse(readFileSync(file, 'utf8'))
          if (after.seq !== before.seq || after.weak !== before.weak) changed++
          console.log(`${name}: seq ${before.seq} -> ${after.seq}, weak ${before.weak} -> ${after.weak} (${message})`)
        } catch (error) {
          console.log(`${name}: REFUSED ${error instanceof Error ? error.message : String(error)}`)
          process.exitCode = 1
        }
      }
      console.log(`${changed} check.json file(s) changed`)
    } else {
      if (!flags.record) throw new Error('seq needs --record <record.md> (with --out <session folder>) or --records <dir> --sessions <dir>')
      console.log(applyRecord(join(outDir(), 'check.json'), flags.record) ?? 'no check.json in the session folder')
    }
  } else if (command === 'task') {
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

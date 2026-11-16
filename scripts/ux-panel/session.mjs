#!/usr/bin/env node
// Facilitator tool. NOT for panelists.
//   node scripts/ux-panel/session.mjs start --task T01.1 --level novice --out <dir>   (novice | intermediate | expert)
//   node scripts/ux-panel/session.mjs task  --task T01.1 [--level novice]
//   node scripts/ux-panel/session.mjs check --out <dir> [--task T01.1] [--answer "<panelist answer>" | --no-answer] [--facilitator]   (H-119: without --facilitator a result other than PASS prints no reason)
//   node scripts/ux-panel/session.mjs stop  --out <dir> --record <record.md> [--rerun "<why>"] [--finished-by-facilitator]   (reads "- SEQ: n" from the record, fills Time, Steps and Build; --no-record only without a record; H-109 to H-111)
//   node scripts/ux-panel/session.mjs seq   --out <dir> --record <record.md> [--seq-confirmed]   (copies the record's SEQ into a stopped session's check.json)
//   node scripts/ux-panel/session.mjs seq   --records <records dir> --sessions <sessions dir>     (the same for every <name>.md with a <name>/check.json)
//   node scripts/ux-panel/session.mjs brief --task T01.1 --level novice [--round r6] [--out <dir>]   (H-80: the complete prompt of ONE fresh panelist agent for ONE task: start, act, check, record, stop)
//   node scripts/ux-panel/session.mjs list
// start also takes --previous T20.1,T22.1 (the tasks that the panelist's context already ran; T21.1, T22.x and T31.x are refused after tasks that teach them, H-80).
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { existsSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from './lib/args.mjs'
import { countSteps, readLog, stepsToPassFromLog, summarize } from './lib/log.mjs'
import { request } from './lib/rpc.mjs'
import { buildBrief } from './lib/brief.mjs'
import { buildLine, commitProblem, readBuild, siblingCommits, withBuildLine } from './lib/build.mjs'
import { answerProblem, answerTooShort, asksQuestion, baseTaskId, budgetFor, budgetVerdict, canonicalTaskId, checkLines, contextProblem, effectiveSteps, loadTasks, minutesFromLog, normalizeLevel, parsePrevious, recordAnswerProblem, recordPlaceholderProblem, rerunProblem, scenarioText, startDecision, stepsToPassOf, stopRecordProblem, syncSeq, withRunFlags, withStepsLine, withTimeLine } from './lib/tasktext.mjs'
import { TASKS, TASK_NOTES } from './tasks.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const [command, ...rest] = process.argv.slice(2)
const { flags } = parseArgs(rest, { task: 'string', level: 'string', out: 'string', answer: 'string', 'no-answer': 'bool', record: 'string', 'no-check': 'bool', 'no-xvfb': 'bool', timeout: 'string', port: 'string', facilitator: 'bool', 'seq-confirmed': 'bool', records: 'string', sessions: 'string', previous: 'string', round: 'string', 'accept-no-answer': 'bool', 'steps-to-pass': 'string', rerun: 'string', 'finished-by-facilitator': 'bool', 'confirm-build-change': 'bool', 'no-record': 'bool' })
// H-86: one id for the second crash (T23.1b); the old name is only accepted here.
if (flags.task) flags.task = canonicalTaskId(flags.task)
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
  // H-80: one fresh panelist per task. `--previous` lists the tasks that this panelist's context already ran; a task that an earlier one teaches is refused.
  const previous = parsePrevious(flags.previous)
  const refused = contextProblem(flags.task, previous)
  if (refused) throw new Error(refused)
  // H-100: a round is one build: refuse a start whose commit differs from a session already in the round's folder.
  const split = commitProblem([readBuild({ repoRoot: join(here, '../..') }).commit, ...siblingCommits(out)], { confirmed: flags['confirm-build-change'] })
  if (split) throw new Error(split)
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
  // H-80: the context of the panelist is part of the session (and of check.json and the record).
  const file = join(out, 'session.json')
  writeFileSync(file, JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), context: { previousTasks: previous } }, null, 2))
  announce(out, level, sessionInfo())
}

/** Prints the facilitator notes (stderr) and the panelist block (stdout). */
function announce(out, level, info) {
  // stdout is the panelist block only; facilitator notes go to stderr (or to stdout with --facilitator).
  const facilitator = [`Session ready: ${out}`, `Level ${level}`, ...facilitatorLines(flags.task, level, info), 'Spawn a FRESH panelist for this task (H-69, H-80): no memory of any earlier task, not even of the same journey. `session.mjs brief` prints the whole prompt.', `Test page: ${info.testPageUrl}`]
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
  const missing = answerProblem(t, { answer: flags.answer, noAnswer: flags['no-answer'], acceptNoAnswer: flags['accept-no-answer'] })
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
  const lines = checkLines({ result, steps, budget, facilitator: Boolean(flags.facilitator) }) // H-119: the reason stays in check.json
  const previousFile = join(outDir(), 'check.json')
  const earlier = existsSync(previousFile) ? JSON.parse(readFileSync(previousFile, 'utf8')) : null
  const earlierRuns = earlier?.runs ?? (earlier ? [{ checkerStatus: earlier.checkerStatus, steps: earlier.steps }] : [])
  // H-92: the budget and the weak rule use the steps when the check first held, not the steps the panelist spent afterwards.
  // H-101: without --steps-to-pass, the log of a replayed task (T01.1, T02.1) says when the check first held.
  const explicitSteps = flags['steps-to-pass'] === undefined ? (stepsToPassFromLog(entries) ?? undefined) : Number(flags['steps-to-pass'])
  const stepsToPass = stepsToPassOf({ explicit: explicitSteps, runs: earlierRuns, checkerStatus: result.status, steps })
  const verdict = budgetVerdict(result.status, effectiveSteps(steps, stepsToPass), budget, null)
  const status = verdict.status
  lines.push(...verdict.lines)
  if (stepsToPass !== null && stepsToPass < steps) lines.push(`steps to pass: ${stepsToPass} (the check first held there; the budget uses it, H-92)`)
  console.log(lines.join('\n'))
  // H-67: every run is appended to `runs`; the top level holds the last run, and the record shows all runs.
  const file = join(outDir(), 'check.json')
  const previous = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
  const checkedAt = new Date().toISOString()
  const run = { checkedAt, status, checkerStatus: result.status, reason: result.reason, steps, answer: flags.answer ?? null, noAnswer: Boolean(flags['no-answer']), stepsToPass }
  const runs = [...(previous?.runs ?? (previous ? [{ checkedAt: previous.checkedAt, status: previous.status, checkerStatus: previous.checkerStatus, reason: previous.reason, steps: previous.steps, answer: previous.answer, noAnswer: previous.noAnswer }] : [])), run]
  const next = { task, level, context: info.context ?? { previousTasks: [] }, status, nearMiss: verdict.nearMiss, weak: verdict.weak, seq: previous?.seq ?? null, build: info.build ?? null, stepsToPass, rerun: previous?.rerun ?? null, finishedByFacilitator: previous?.finishedByFacilitator ?? false, checkerStatus: result.status, reason: result.reason, notes: result.notes, steps, budget, answer: flags.answer ?? null, noAnswer: Boolean(flags['no-answer']), checkedAt, runs }
  writeFileSync(file, JSON.stringify(next.seq === null ? next : withSeqKeep(next), null, 2))
  if (runs.length > 1) console.log(`this is run ${runs.length} of this session; check.json keeps all runs (${runs.map((r) => r.status).join(', ')}); the record must explain the earlier ones`)
  process.exitCode = status === 'PASS' ? 0 : status === 'FAIL' ? 1 : 2
}

const withSeqKeep = (check) => ({ ...check, weak: budgetVerdict(check.status, effectiveSteps(check.steps, check.stepsToPass), check.budget, check.seq).weak })

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
  // H-111: the rating is read from the record, so a stop without --record would leave check.json.seq null.
  const noRecord = stopRecordProblem({ hasCheck: existsSync(join(out, 'check.json')), record: flags.record, noRecord: flags['no-record'], noCheck: flags['no-check'] })
  if (noRecord) throw new Error(noRecord)
  // H-110: a lost first run kept as <record name>-session-lost makes this session a rerun.
  if (flags.record) {
    const lost = join(dirname(resolve(flags.record)), `${basename(resolve(flags.record)).replace(/\.md$/, '')}-session-lost`)
    const refusedRerun = rerunProblem({ lostRunExists: existsSync(lost), rerun: flags.rerun, check: existsSync(join(out, 'check.json')) ? JSON.parse(readFileSync(join(out, 'check.json'), 'utf8')) : null })
    if (refusedRerun) throw new Error(refusedRerun)
  }
  // H-82: an answer task whose last check had no answer is not a final verdict (MANUAL); ask for the answer or confirm that there was none.
  if (!flags['no-check'] && existsSync(join(out, 'check.json'))) {
    const last = JSON.parse(readFileSync(join(out, 'check.json'), 'utf8'))
    if (asksQuestion(loadTasks()[baseTaskId(last.task ?? info.task)]) && !last.answer && !flags['accept-no-answer']) {
      throw new Error('the last check of this answer task had no answer (--no-answer): run `check --answer "<text after Answer:>"` with the panelist\'s answer, or pass --accept-no-answer to stop when the panelist really gave none')
    }
    // H-90: and the record must carry the Answer line.
    if (flags.record && existsSync(resolve(flags.record))) {
      const refused = recordAnswerProblem(loadTasks()[baseTaskId(last.task ?? info.task)], readFileSync(resolve(flags.record), 'utf8'), { acceptNoAnswer: Boolean(flags['accept-no-answer']) })
      if (refused) throw new Error(refused)
    }
  }
  // H-83: the Result line of the record always has "Steps: N of M" (from check.json) when the panelist left it out.
  if (flags.record && existsSync(join(out, 'check.json')) && existsSync(resolve(flags.record))) {
    const last = JSON.parse(readFileSync(join(out, 'check.json'), 'utf8'))
    const text = readFileSync(resolve(flags.record), 'utf8')
    const fixed = withStepsLine(text, last.steps, last.budget)
    if (fixed !== text) {
      writeFileSync(resolve(flags.record), fixed)
      console.log(`added "Steps: ${last.steps}${last.budget ? ` of ${last.budget}` : ''}" to the Result line of ${flags.record}`)
    }
  }
  // H-94: the build line goes under the title of the record; H-93: rerun and finishedByFacilitator go into check.json.
  if (flags.record && existsSync(resolve(flags.record))) {
    const text = readFileSync(resolve(flags.record), 'utf8')
    const withBuild = withBuildLine(text, info.build)
    if (withBuild !== text) writeFileSync(resolve(flags.record), withBuild)
    console.log(`build: ${buildLine(info.build)}${info.build?.packaged ? '' : ' (this session does not count for the release gate)'}`)
  }
  // H-109: Time is measured from the log (first to last command), never left to the panelist; a record with a placeholder is refused.
  if (flags.record && existsSync(resolve(flags.record))) {
    const text = readFileSync(resolve(flags.record), 'utf8')
    const minutes = minutesFromLog(readLog(join(out, 'log.jsonl')))
    const timed = withTimeLine(text, minutes)
    if (timed !== text) {
      writeFileSync(resolve(flags.record), timed)
      console.log(`Time: ${minutes} min (from the log) written to the Result line of ${flags.record}`)
    }
    const placeholder = recordPlaceholderProblem(timed)
    if (placeholder) throw new Error(`${placeholder} (${flags.record})`)
  }
  if (existsSync(join(out, 'check.json')) && (flags.rerun || flags['finished-by-facilitator'])) {
    const file = join(out, 'check.json')
    writeFileSync(file, JSON.stringify(withRunFlags(JSON.parse(readFileSync(file, 'utf8')), { rerun: flags.rerun, finishedByFacilitator: flags['finished-by-facilitator'] }), null, 2))
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
  } else if (command === 'brief') {
    // H-80: the whole prompt of one fresh panelist agent for one task.
    if (!flags.task || !TASKS[flags.task]) throw new Error(`--task <id> required; known: ${Object.keys(TASKS).join(', ')}`)
    const level = normalizeLevel(flags.level ?? 'intermediate')
    const refused = contextProblem(flags.task, parsePrevious(flags.previous))
    if (refused) throw new Error(refused)
    console.log(buildBrief({ task: flags.task, level, taskInfo: loadTasks()[baseTaskId(flags.task)], panelist: readFileSync(join(here, 'PANELIST.md'), 'utf8'), round: flags.round ?? 'r1', out: flags.out }))
  } else if (command === 'task') {
    const info = existsSync(join(outDir(), 'session.json')) ? sessionInfo() : {}
    console.log(panelistBlock(flags.task, flags.level, { testPageUrl: info.testPageUrl, out: flags.out ?? '<session folder>' }).join('\n'))
    if (flags.facilitator) console.log(facilitatorLines(flags.task, flags.level, {}).join('\n'))
  }
  else if (command === 'list') {
    const tasks = loadTasks()
    for (const id of Object.keys(TASKS)) console.log(`${id}\t${TASKS[id].preset}\t${tasks[baseTaskId(id)]?.title ?? ''}`)
  } else {
    console.log('usage: session.mjs start|brief|check|stop|task|list (see FACILITATOR.md)')
    process.exitCode = 64
  }
} catch (error) {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}

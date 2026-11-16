#!/usr/bin/env node
// UX-84: performance measurement of the BUILT app against the D10 targets of docs/ux/rubric.md.
//   node scripts/ux-panel/perf.mjs --out docs/ux/evidence/perf.json [--runs 5] [--rows 2000] [--soak-seconds 240] [--no-build] [--no-xvfb]
// It builds (`npx electron-vite build`), re-runs itself under `xvfb-run` when there is no display, and launches the app through
// Playwright `_electron` exactly like the panel driver (lib/context.mjs): ONE app instance at a time, an isolated user-data
// folder, the built Scripted Agent. Selectors are data-testid only. Every metric is the median of --runs runs; the memory
// soak is ONE run of --soak-seconds (the rubric asks for 30 minutes; 3 to 5 minutes is run here, see the note in the output).
// Test tooling only (setup through window.agent7 like the panel presets).
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { cpus, platform, release, tmpdir, totalmem } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { launchApp, makeContext, repoRoot, sleep } from './lib/context.mjs'
import { parseArgs } from './lib/args.mjs'
import { createLoginApp } from './lib/fixtures.mjs'

const { flags } = parseArgs(process.argv.slice(2), { out: 'string', runs: 'string', rows: 'string', 'soak-seconds': 'string', 'no-build': 'bool', 'no-xvfb': 'bool' })
const RUNS = Number(flags.runs ?? 5)
const ROWS = Number(flags.rows ?? 2000)
const SOAK_SECONDS = Number(flags['soak-seconds'] ?? 240)
const outFile = flags.out ? resolve(process.cwd(), flags.out) : null

// ---------------------------------------------------------------- build and display
if (!process.env.A7_PERF_CHILD) {
  if (!flags['no-build']) {
    const built = spawnSync('npx', ['electron-vite', 'build'], { cwd: repoRoot, stdio: 'inherit' })
    if (built.status !== 0) process.exit(built.status ?? 1)
  }
  const needXvfb = !flags['no-xvfb'] && !process.env.DISPLAY && spawnSync('which', ['xvfb-run']).status === 0
  const args = [process.argv[1], ...process.argv.slice(2), '--no-build']
  const env = { ...process.env, A7_PERF_CHILD: '1', ...(needXvfb ? { A7_PERF_XVFB: '1' } : {}) }
  delete env.ELECTRON_RUN_AS_NODE
  const child = needXvfb
    ? spawnSync('xvfb-run', ['-a', '-s', '-screen 0 1920x1200x24', process.execPath, ...args], { stdio: 'inherit', env })
    : spawnSync(process.execPath, args, { stdio: 'inherit', env })
  process.exit(child.status ?? 1)
}

// ---------------------------------------------------------------- helpers
const median = (xs) => {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] : null
}
const round = (n, d = 1) => (n === null || n === undefined ? null : Math.round(n * 10 ** d) / 10 ** d)
const log = (...a) => console.error('[perf]', ...a)

/** metric name -> { label, unit, target, goal ('max' | 'min'), runs[], note } */
const metrics = new Map()
function define(id, label, unit, target, goal, note = '') {
  metrics.set(id, { id, label, unit, target, goal, runs: [], note, extra: {} })
}
const record = (id, value) => metrics.get(id).runs.push(value)

define('input_composer', 'Input response, chat composer (keydown to paint, median of keystrokes)', 'ms', 100, 'max')
define('input_notepad', 'Input response, Notepad', 'ms', 100, 'max')
define('input_composer_loaded', 'Input response, chat composer, 6 windows and a long transcript open', 'ms', 100, 'max')
define('window_open_explorer', 'Window open, Start menu click to Explorer visible', 'ms', 200, 'max')
define('window_open_notepad', 'Window open, Start menu click to Notepad visible', 'ms', 200, 'max')
define('launcher_warm', 'Launcher to interactive, warm (process start to launcher usable)', 'ms', 1500, 'max')
define('desktop_connect', 'Desktop connect (Connect click to desktop painted)', 'ms', 2000, 'max')
define('scroll_fps', `Scroll fps, ${ROWS}-row transcript, 6 windows`, 'fps', 57, 'min', 'Pass at 57 or more (60 fps with half a frame of jitter).')
define('drag_fps', `Window drag fps, ${ROWS}-row transcript, 6 windows`, 'fps', 57, 'min', 'Pass at 57 or more.')
define('drag_fps_light', 'Control: window drag fps, 2 windows, no long transcript', 'fps', 57, 'min', 'Control for the environment: the same drag on a light desktop.')
define('longtask_stream', 'Longest main-thread task while a turn streams (6 windows and a long transcript open)', 'ms', 50, 'max', 'The Long Tasks API only reports tasks over 50 ms; 0 means none was reported.')
define('agent_start_progress', 'Agent start shows progress (Enter to first progress sign)', 'ms', 100, 'max')
define('memory_growth', 'Memory growth over the soak (working set, all processes)', '%', 10, 'max')

// ---------------------------------------------------------------- page-side probes (plain functions, serialised by Playwright)
const rafThenMessage = () => new Promise((resolveFrame) => requestAnimationFrame(() => {
  const ch = new MessageChannel()
  ch.port1.onmessage = () => resolveFrame(performance.now())
  ch.port2.postMessage(0)
}))

function installInputProbe() {
  if (window.__inputProbe) return
  const lat = []
  window.__inputProbe = { lat }
  addEventListener('keydown', (e) => {
    const t0 = e.timeStamp
    requestAnimationFrame(() => {
      const ch = new MessageChannel()
      ch.port1.onmessage = () => lat.push(performance.now() - t0)
      ch.port2.postMessage(0)
    })
  }, true)
}

function installLongtaskProbe() {
  if (window.__longtasks) return
  const tasks = []
  window.__longtasks = tasks
  new PerformanceObserver((list) => { for (const e of list.getEntries()) tasks.push(e.duration) }).observe({ type: 'longtask' })
}

function installFrameProbe() {
  const state = { on: false, t: [] }
  window.__frames = state
  state.start = () => {
    state.t = []
    state.on = true
    const tick = (ts) => {
      if (!state.on) return
      state.t.push(ts)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }
  state.stop = () => {
    state.on = false
    const t = state.t
    const deltas = t.slice(1).map((x, i) => x - t[i])
    const span = t.length > 1 ? t[t.length - 1] - t[0] : 0
    const sorted = [...deltas].sort((a, b) => a - b)
    return { frames: t.length, fps: span > 0 ? ((t.length - 1) / span) * 1000 : 0, p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0, max: sorted[sorted.length - 1] ?? 0, slow: deltas.filter((d) => d > 25).length }
  }
}

// ---------------------------------------------------------------- the scripted agent used for turns
const tmp = mkdtempSync(join(tmpdir(), 'a7perf-'))
const STREAM_TEXT = Array.from({ length: 24 }, (_, i) => `Paragraph ${i + 1}. The streamed reply has **bold** words, \`inline code\` and a list:\n\n- first item of paragraph ${i + 1}\n- second item of paragraph ${i + 1}\n\n`).join('')
const agentScript = {
  name: 'perf',
  description: 'Perf harness agent: STREAM streams a long markdown reply in small chunks, anything else answers at once.',
  agent: { name: 'scripted-agent', version: '1.0.0' },
  defaults: { chunkSize: 12, chunkDelayMs: 6 },
  rules: [
    { id: 'stream', match: { contains: 'STREAM' }, steps: [{ type: 'message', text: STREAM_TEXT, chunked: true }] },
    { id: 'quick', match: { any: true }, steps: [{ type: 'message', text: 'Done.', chunked: false }] }
  ]
}
const scriptFile = join(tmp, 'perf-script.json')
writeFileSync(scriptFile, JSON.stringify(agentScript))

// ---------------------------------------------------------------- the app
const userData = join(tmp, 'user-data')
mkdirSync(userData)
const base = join(tmp, 'fixtures')
mkdirSync(base)
const loginApp = createLoginApp(base)
const state = { sockDir: tmp, task: 'perf' }
const sessionDir = join(tmp, 'session')
mkdirSync(sessionDir)

let app = null
let ctx = null
const closeApp = async () => {
  if (!app) return
  const proc = app.process()
  await Promise.race([app.close().catch(() => {}), sleep(8000)])
  if (proc && proc.exitCode === null) proc.kill('SIGKILL')
  app = null
}
async function startApp() {
  const t0 = Date.now()
  app = await launchApp({ userData })
  ctx = makeContext({ app, userData, sessionDir, fixtures: {}, state })
  const launcher = await ctx.launcher()
  await launcher.waitForFunction(
    () => {
      const btn = document.querySelector('[data-testid="launcher-new"]')
      const body = document.querySelector('[data-testid="launcher-list"]') ?? document.querySelector('[data-testid="launcher-empty"]')
      return !!btn && !btn.disabled && !!body
    },
    null,
    { polling: 'raf' }
  )
  await launcher.evaluate(rafThenMessage)
  return { ms: Date.now() - t0, launcher }
}

const keyRun = async (page, locator, n = 25) => {
  await page.evaluate(installInputProbe)
  await page.evaluate(() => { window.__inputProbe.lat.length = 0 })
  await locator.focus()
  for (let i = 0; i < n; i++) {
    await page.keyboard.press(i % 7 === 6 ? ' ' : 'a')
    await sleep(70)
  }
  await sleep(150)
  const lat = await page.evaluate(() => [...window.__inputProbe.lat])
  return { median: median(lat), p95: pct(lat, 95), max: Math.max(...lat), n: lat.length }
}

const chatFrame = (page, sessionId) => page.getByTestId('window-chat').filter({ has: page.locator(`[data-testid="chat-app"][data-session-id="${sessionId}"]`) })
const closeWin = (page, id) => page.evaluate((i) => window.agent7.desktop.closeWindow(i), id)
const closeAllWindows = (page) =>
  page.evaluate(async () => {
    const st = await window.agent7.desktop.current()
    for (const w of st.windows) await window.agent7.desktop.closeWindow(w.id)
  })
async function waitIdle(sessionId, ms = 120_000) {
  await ctx.waitFor(async () => (await ctx.sessions()).find((s) => s.id === sessionId)?.status === 'idle', `chat ${sessionId} idle`, ms)
}

async function openViaStart(page, appId, group) {
  await page.getByTestId('taskbar-start').click()
  await page.getByTestId('start-menu').waitFor()
  if (group && !(await page.getByTestId(`start-menu-item-${appId}`).isVisible())) {
    const folder = page.getByTestId(`start-menu-group-${group}`)
    if (!(await folder.isVisible())) await page.getByTestId('start-menu-all').click()
    await folder.click()
  }
  await page.getByTestId(`start-menu-item-${appId}`).click()
}

async function measureWindowOpen(page, appId, group) {
  await page.evaluate((appId) => {
    const o = { t0: null, t1: null }
    window.__open = o
    addEventListener('click', (e) => { if (e.target?.closest?.(`[data-testid="start-menu-item-${appId}"]`)) o.t0 = e.timeStamp }, true)
    const check = () => {
      if (o.t0 === null || o.t1 !== null) return
      const el = document.querySelector(`[data-testid="window-${appId}"]`)
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden') {
        o.t1 = -1
        requestAnimationFrame(() => { const ch = new MessageChannel(); ch.port1.onmessage = () => { o.t1 = performance.now() }; ch.port2.postMessage(0) })
      }
    }
    new MutationObserver(check).observe(document.body, { subtree: true, childList: true, attributes: true })
  }, appId)
  await openViaStart(page, appId, group)
  await page.waitForFunction(() => window.__open.t1 > 0)
  return page.evaluate(() => window.__open.t1 - window.__open.t0)
}

// ================================================================ phase 1: first launch (cold) and the data the later phases need
const machine = {
  cpu: cpus()[0]?.model.trim() ?? 'unknown',
  cores: cpus().length,
  ramGB: round(totalmem() / 1024 ** 3, 1),
  os: `${platform()} ${release()}`,
  display: process.env.A7_PERF_XVFB ? 'xvfb-run, 1920x1200x24 (headless, software rendering)' : (process.env.DISPLAY ? `DISPLAY ${process.env.DISPLAY}` : 'none'),
  electron: null,
  chrome: null,
  node: process.version
}
try {
  const cpuinfo = readFileSync('/proc/cpuinfo', 'utf8')
  machine.cpu = cpuinfo.match(/model name\s*:\s*(.+)/)?.[1]?.trim() ?? machine.cpu
} catch {}

const launchTimes = []
let sessionId = 0
let desktopId = 0
const results = { startedAt: new Date().toISOString(), runs: RUNS, rows: ROWS, soakSeconds: SOAK_SECONDS }
try {
  log('phase 1: cold launch and setup')
  const cold = await startApp()
  results.launcherCold = Math.round(cold.ms)
  machine.electron = await app.evaluate(() => process.versions.electron)
  machine.chrome = await app.evaluate(() => process.versions.chrome)
  const agent = await ctx.useScript(scriptFile, { name: 'Perf agent' })
  const created = await ctx.createDesktop({ title: 'Perf desktop', projects: [loginApp], agentId: agent.id })
  desktopId = created.id
  await ctx.dismissDialogs(desktopId)
  const chat = await ctx.newChat(desktopId)
  sessionId = chat.sessionId
  await ctx.sendPrompt(desktopId, sessionId, 'hello')
  await waitIdle(sessionId)
  await closeApp()

  // ---------------------------------------------------------------- seed the transcript through the DB (app closed)
  log(`seeding ${ROWS} transcript rows in session ${sessionId}`)
  {
    const db = new DatabaseSync(join(userData, 'agent7.sqlite'))
    db.exec('PRAGMA foreign_keys = ON')
    const lastSeq = db.prepare('SELECT COALESCE(MAX(seq), 0) AS s FROM transcript_entries WHERE session_id = ?').get(sessionId).s
    const entry = db.prepare('INSERT INTO transcript_entries (session_id, seq, kind) VALUES (?, ?, ?)')
    const message = db.prepare('INSERT INTO messages (entry_id, role) VALUES (?, ?)')
    const block = db.prepare('INSERT INTO content_blocks (message_id, position, kind, text) VALUES (?, 0, ?, ?)')
    db.exec('BEGIN')
    for (let i = 0; i < ROWS; i++) {
      const user = i % 2 === 0
      const id = entry.run(sessionId, lastSeq + 1 + i, 'message').lastInsertRowid
      message.run(id, user ? 'user' : 'agent')
      const text = user
        ? `Question ${i / 2 + 1}: how does the sign-in redirect handle the next address?`
        : `Answer ${(i + 1) / 2}. The \`afterLogin\` function reads **next** from the query string and keeps it only when it starts with a slash.\n\n- one site-relative address is kept\n- anything else goes to /home`
      block.run(id, 'text', text)
    }
    db.exec('COMMIT')
    db.close()
  }

  // ================================================================ phase 2: warm launches
  log(`phase 2: ${RUNS} warm launches`)
  for (let i = 0; i < RUNS; i++) {
    const r = await startApp()
    record('launcher_warm', r.ms)
    launchTimes.push(Math.round(r.ms))
    await closeApp()
    await sleep(500)
  }

  // ================================================================ phase 3: the main instance
  log('phase 3: main instance')
  await startApp()
  const launcher = await ctx.launcher()

  // ---- desktop connect (through the launcher UI; a desktop page is painted when its taskbar is)
  log('desktop connect')
  app.context().addInitScript(() => {
    if (!location.search.includes('desktop=')) return
    const mo = new MutationObserver(() => {
      if (window.__connectPaint || !document.querySelector('[data-testid="taskbar"]')) return
      window.__connectPaint = -1
      requestAnimationFrame(() => { const ch = new MessageChannel(); ch.port1.onmessage = () => { window.__connectPaint = performance.timeOrigin + performance.now() }; ch.port2.postMessage(0) })
    })
    mo.observe(document, { childList: true, subtree: true })
  })
  await launcher.evaluate(() => addEventListener('click', (e) => { if (e.target?.closest?.('[data-testid="launcher-connect"]')) window.__connectClick = performance.timeOrigin + e.timeStamp }, true))
  const row = launcher.getByTestId('launcher-desktop-row').filter({ hasText: 'Perf desktop' })
  for (let i = 0; i < RUNS; i++) {
    const opened = app.waitForEvent('window')
    await row.click()
    await launcher.getByTestId('launcher-connect').click()
    const dp = await opened
    await dp.waitForFunction(() => window.__connectPaint > 0, null, { polling: 'raf' })
    const [t0, t1] = [await launcher.evaluate(() => window.__connectClick), await dp.evaluate(() => window.__connectPaint)]
    record('desktop_connect', t1 - t0)
    if (i < RUNS - 1) {
      await launcher.evaluate((id) => window.agent7.launcher.disconnect(id), desktopId)
      await ctx.waitFor(async () => !(await ctx.launcherList()).find((d) => d.id === desktopId)?.connected, 'desktop disconnected')
      await sleep(600)
    }
  }
  const desk = await ctx.desktopPage(desktopId)
  await ctx.dismissDialogs(desktopId)
  await closeAllWindows(desk)

  // ---- window open from the Start menu
  log('window open')
  for (let i = 0; i < RUNS; i++) {
    record('window_open_explorer', await measureWindowOpen(desk, 'explorer'))
    await ctx.closeWindowsOf(desktopId, 'explorer')
    await sleep(300)
    record('window_open_notepad', await measureWindowOpen(desk, 'notepad', 'accessories'))
    await ctx.closeWindowsOf(desktopId, 'notepad')
    await sleep(300)
  }

  // ---- input response: Notepad and a fresh chat composer (light desktop)
  log('input response')
  const pad = await ctx.openApp(desktopId, 'notepad')
  await desk.getByTestId('window-notepad').waitFor()
  const small = await ctx.newChat(desktopId)
  await chatFrame(desk, small.sessionId).getByTestId('chat-composer-input').waitFor()
  const inputDetail = { composer: [], notepad: [] }
  for (let i = 0; i < RUNS; i++) {
    const c = await keyRun(desk, chatFrame(desk, small.sessionId).getByTestId('chat-composer-input'))
    record('input_composer', c.median)
    inputDetail.composer.push(c)
    await chatFrame(desk, small.sessionId).getByTestId('chat-composer-input').fill('')
    const n = await keyRun(desk, desk.getByTestId('window-notepad').getByTestId('notepad-text'))
    record('input_notepad', n.median)
    inputDetail.notepad.push(n)
  }
  metrics.get('input_composer').extra = { worstP95: round(Math.max(...inputDetail.composer.map((r) => r.p95))), worstKey: round(Math.max(...inputDetail.composer.map((r) => r.max))) }
  metrics.get('input_notepad').extra = { worstP95: round(Math.max(...inputDetail.notepad.map((r) => r.p95))), worstKey: round(Math.max(...inputDetail.notepad.map((r) => r.max))) }
  await closeWin(desk, pad.id)

  // ---- agent start shows progress (each run: a new chat, first prompt typed and sent with Enter)
  log('agent start progress')
  const startDetail = []
  for (let i = 0; i < RUNS; i++) {
    const c = await ctx.newChat(desktopId)
    const frame = chatFrame(desk, c.sessionId)
    const input = frame.getByTestId('chat-composer-input')
    await input.waitFor()
    await input.focus()
    await desk.keyboard.type('Please say hello')
    await desk.evaluate(() => {
      const o = { enter: null, first: null, which: null }
      window.__start = o
      const signs = ['chat-starting', 'chat-message-user', 'chat-stop']
      const seen = () => signs.find((s) => document.querySelector(`[data-testid="${s}"]`))
      if (seen()) o.preexisting = seen()
      addEventListener('keydown', (e) => { if (e.key === 'Enter') o.enter = e.timeStamp }, true)
      const mo = new MutationObserver(() => {
        const s = seen()
        if (o.enter === null || o.first !== null || !s) return
        o.first = -1
        o.which = s
        requestAnimationFrame(() => { const ch = new MessageChannel(); ch.port1.onmessage = () => { o.first = performance.now() }; ch.port2.postMessage(0) })
      })
      mo.observe(document.body, { subtree: true, childList: true, attributes: true })
    })
    await desk.keyboard.press('Enter')
    await desk.waitForFunction(() => window.__start.first > 0)
    const s = await desk.evaluate(() => window.__start)
    record('agent_start_progress', s.first - s.enter)
    startDetail.push({ ms: round(s.first - s.enter), sign: s.which, preexisting: s.preexisting ?? null })
    await waitIdle(c.sessionId)
    await closeWin(desk, c.windowId)
    await sleep(300)
  }
  metrics.get('agent_start_progress').extra = { signs: startDetail }

  // ---- control: the same drag with nothing else open (separates the product from the virtual display)
  log('control drag')
  await desk.evaluate(installFrameProbe)
  const ctl = await ctx.openApp(desktopId, 'notepad')
  await desk.getByTestId('window-notepad').waitFor()
  for (let i = 0; i < RUNS; i++) {
    const title = await desk.getByTestId('window-notepad').getByTestId('window-title').boundingBox()
    const cx = title.x + title.width / 2
    const cy = title.y + title.height / 2
    await desk.mouse.move(cx, cy)
    await desk.mouse.down()
    await desk.evaluate(() => window.__frames.start())
    const t0 = Date.now()
    for (let k = 0; Date.now() - t0 < 2500; k++) {
      const a = k / 12
      await desk.mouse.move(cx + 60 * Math.sin(a), cy + 40 * (1 - Math.cos(a)), { steps: 1 })
      await sleep(8)
    }
    record('drag_fps_light', (await desk.evaluate(() => window.__frames.stop())).fps)
    await desk.mouse.up()
  }
  await closeWin(desk, ctl.id)

  // ---- the load: the long chat, the small chat and 4 more windows (6 in all); the chat opens last so it is on top
  log('opening 6 windows with the long transcript')
  for (const a of ['explorer', 'notepad', 'wordpad', 'paint']) await ctx.openApp(desktopId, a)
  const big = await desk.evaluate(({ desktopId, sessionId }) => window.agent7.desktop.openWindow({ desktopId, app: 'chat', sessionId }), { desktopId, sessionId })
  const bigFrame = chatFrame(desk, sessionId)
  await bigFrame.getByTestId('chat-transcript').waitFor()
  await ctx.waitFor(async () => (await bigFrame.getByTestId('chat-transcript').locator('*').count()) > 0, 'transcript rendered')
  await sleep(1500)
  const domNodes = await desk.evaluate(() => document.querySelectorAll('*').length)
  const windowsOpen = await desk.evaluate(async () => (await window.agent7.desktop.current()).windows.length)
  const seededEntries = (await ctx.transcript(sessionId)).length
  results.load = { windows: windowsOpen, transcriptEntries: seededEntries, domNodes }
  log('load', results.load)

  // ---- input response under load
  for (let i = 0; i < RUNS; i++) {
    const c = await keyRun(desk, bigFrame.getByTestId('chat-composer-input'))
    record('input_composer_loaded', c.median)
    await bigFrame.getByTestId('chat-composer-input').fill('')
  }

  // ---- scroll and drag fps
  log('scroll and drag fps')
  await desk.evaluate(installFrameProbe)
  const transcript = bigFrame.getByTestId('chat-transcript')
  const scrollDetail = []
  const dragDetail = []
  for (let i = 0; i < RUNS; i++) {
    const box = await transcript.boundingBox()
    await desk.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await desk.mouse.wheel(0, -4000)
    await sleep(500)
    await desk.evaluate(() => window.__frames.start())
    const until = Date.now() + 2500
    let dir = 1
    for (let k = 0; Date.now() < until; k++) {
      if (k % 25 === 0) dir = -dir
      await desk.mouse.wheel(0, 90 * dir)
      await sleep(8)
    }
    const f = await desk.evaluate(() => window.__frames.stop())
    scrollDetail.push(f)
    record('scroll_fps', f.fps)

    const title = await bigFrame.getByTestId('window-title').boundingBox()
    const cx = title.x + title.width / 2
    const cy = title.y + title.height / 2
    await desk.mouse.move(cx, cy)
    await desk.mouse.down()
    await desk.evaluate(() => window.__frames.start())
    const t0 = Date.now()
    for (let k = 0; Date.now() - t0 < 2500; k++) {
      const a = k / 12
      await desk.mouse.move(cx + 60 * Math.sin(a), cy + 40 * (1 - Math.cos(a)), { steps: 1 })
      await sleep(8)
    }
    const d = await desk.evaluate(() => window.__frames.stop())
    await desk.mouse.up()
    dragDetail.push(d)
    record('drag_fps', d.fps)
  }
  metrics.get('scroll_fps').extra = { p95FrameMs: round(median(scrollDetail.map((r) => r.p95))), maxFrameMs: round(Math.max(...scrollDetail.map((r) => r.max))), slowFrames: scrollDetail.map((r) => r.slow) }
  metrics.get('drag_fps').extra = { p95FrameMs: round(median(dragDetail.map((r) => r.p95))), maxFrameMs: round(Math.max(...dragDetail.map((r) => r.max))), slowFrames: dragDetail.map((r) => r.slow) }

  // ---- longest main-thread task while streaming (into the small chat; the long chat and the other windows stay open)
  log('streaming long tasks')
  await desk.evaluate(installLongtaskProbe)
  const streamFrame = chatFrame(desk, small.sessionId)
  const streamDetail = []
  const streamTurns = []
  for (let i = 0; i < RUNS; i++) {
    await desk.evaluate(() => { window.__longtasks.length = 0 })
    await streamFrame.getByTestId('chat-composer-input').fill('STREAM please')
    await streamFrame.getByTestId('chat-composer-input').focus()
    await desk.keyboard.press('Enter')
    await ctx.waitFor(async () => (await ctx.sessions()).find((s) => s.id === small.sessionId)?.status === 'working' || (await ctx.transcript(small.sessionId)).filter((e) => e.kind === 'message' && e.role === 'agent').length > i, 'turn started', 15_000).catch(() => {})
    const turnStart = Date.now()
    await waitIdle(small.sessionId)
    streamTurns.push(Date.now() - turnStart)
    await sleep(300)
    const tasks = await desk.evaluate(() => [...window.__longtasks])
    record('longtask_stream', tasks.length ? Math.max(...tasks) : 0)
    streamDetail.push({ longTasks: tasks.length, durations: tasks.map((t) => round(t)) })
  }
  metrics.get('longtask_stream').extra = { observerSupported: await desk.evaluate(() => PerformanceObserver.supportedEntryTypes.includes('longtask')), turnMsAfterSend: streamTurns, perRun: streamDetail }

  // ---- memory soak
  if (SOAK_SECONDS > 0) {
  log(`soak: ${SOAK_SECONDS} s`)
  const sample = async () => {
    const procs = await app.evaluate(({ app: a }) => a.getAppMetrics().map((m) => ({ type: m.type, ws: m.memory.workingSetSize })))
    const heap = await desk.evaluate(() => (performance.memory ? performance.memory.usedJSHeapSize : 0))
    return { t: Date.now(), totalMB: procs.reduce((s, p) => s + p.ws, 0) / 1024, mainMB: (procs.find((p) => p.type === 'Browser')?.ws ?? 0) / 1024, rendererMB: procs.filter((p) => p.type === 'Tab').reduce((s, p) => s + p.ws, 0) / 1024, heapMB: heap / 1024 ** 2 }
  }
  const samples = []
  const soakStart = Date.now()
  let nextSample = soakStart
  let cycle = 0
  while (Date.now() - soakStart < SOAK_SECONDS * 1000) {
    if (Date.now() >= nextSample) {
      samples.push({ s: Math.round((Date.now() - soakStart) / 1000), ...(await sample()) })
      nextSample += 15_000
    }
    // one cycle of normal use: type, stream a turn, open and close a window, scroll the long transcript
    const w = await ctx.openApp(desktopId, cycle % 2 ? 'terminal' : 'explorer')
    await sleep(600)
    await closeWin(desk, w.id)
    await streamFrame.getByTestId('chat-composer-input').fill(cycle % 3 === 0 ? 'STREAM again' : 'short question')
    await streamFrame.getByTestId('chat-composer-input').focus()
    await desk.keyboard.press('Enter')
    await waitIdle(small.sessionId)
    const box = await transcript.boundingBox()
    await desk.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    for (let k = 0; k < 20; k++) {
      await desk.mouse.wheel(0, (k < 10 ? 1 : -1) * 200)
      await sleep(25)
    }
    await sleep(1500)
    cycle++
  }
  samples.push({ s: Math.round((Date.now() - soakStart) / 1000), ...(await sample()) })
  // growth = last 3 samples against the 3 samples after a 30 s warm-up
  const steady = samples.filter((x) => x.s >= 30)
  const head = median(steady.slice(0, 3).map((x) => x.totalMB))
  const tail = median(steady.slice(-3).map((x) => x.totalMB))
  const growth = ((tail - head) / head) * 100
  const slope = (() => {
    const n = steady.length
    const xs = steady.map((x) => x.s / 60)
    const ys = steady.map((x) => x.totalMB)
    const mx = xs.reduce((a, b) => a + b, 0) / n
    const my = ys.reduce((a, b) => a + b, 0) / n
    return xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0)
  })()
  record('memory_growth', growth)
  metrics.get('memory_growth').extra = { cycles: cycle, soakSeconds: SOAK_SECONDS, startMB: round(head, 0), endMB: round(tail, 0), slopeMBPerMin: round(slope, 2), samples: samples.map((x) => ({ s: x.s, totalMB: round(x.totalMB, 0), rendererMB: round(x.rendererMB, 0), mainMB: round(x.mainMB, 0), heapMB: round(x.heapMB, 1) })) }
  metrics.get('memory_growth').note = `One run of ${SOAK_SECONDS} s (the rubric asks for 30 minutes): growth of the median of the last 3 samples over the median of the 3 samples after a 30 s warm-up.`
  }
} catch (error) {
  results.error = String(error?.stack ?? error)
  console.error(error)
} finally {
  await closeApp()
}

// ---------------------------------------------------------------- report
const out = []
for (const m of metrics.values()) {
  const value = m.runs.length ? median(m.runs) : null
  const pass = value === null ? null : m.goal === 'max' ? value <= m.target : value >= m.target
  out.push({ id: m.id, label: m.label, unit: m.unit, target: `${m.goal === 'max' ? '<=' : '>='} ${m.target}`, value: round(value, m.unit === 'fps' ? 1 : m.unit === '%' ? 1 : 0), runs: m.runs.map((r) => round(r, m.unit === 'fps' || m.unit === '%' ? 1 : 0)), pass, note: m.note, ...m.extra })
}
const report = { machine, launcherCold: results.launcherCold, launcherWarmRuns: launchTimes, ...results, metrics: out }
if (outFile) {
  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, JSON.stringify(report, null, 2))
}
const pad = (s, n) => String(s).padEnd(n)
console.log(`\nMachine: ${machine.cpu}, ${machine.cores} cores, ${machine.ramGB} GB RAM, ${machine.os}, ${machine.display}, Electron ${machine.electron} (Chrome ${machine.chrome})`)
console.log(`Load: ${JSON.stringify(results.load ?? null)}; runs per metric: ${RUNS} (median); soak ${SOAK_SECONDS} s\n`)
console.log(`${pad('Metric', 86)}${pad('Target', 10)}${pad('Median', 10)}${pad('Result', 7)}Runs`)
for (const m of out) console.log(`${pad(m.label.slice(0, 84), 86)}${pad(`${m.target} ${m.unit}`, 10)}${pad(m.value === null ? '-' : `${m.value} ${m.unit}`, 10)}${pad(m.pass === null ? 'n/a' : m.pass ? 'PASS' : 'FAIL', 7)}${m.runs.join(', ')}`)
if (results.error) console.log(`\nERROR: ${results.error.split('\n')[0]}`)
try {
  rmSync(tmp, { recursive: true, force: true })
} catch {}
process.exit(results.error || out.some((m) => m.pass === null && (m.id !== 'memory_growth' || SOAK_SECONDS > 0)) ? 1 : 0)

// The UX panel server: launches the BUILT app (run `npx electron-vite build` first) under Playwright _electron with an
// isolated user-data dir, applies the start-state preset of a task, and serves two Unix sockets:
//   --socket  the panelist's `ux` commands (screenshots, mouse, keyboard)  -- no DOM, no ids, no app API
//   --admin   the facilitator's checks (session.mjs check/stop)
// Run it under a display: `xvfb-run -a node scripts/ux-panel/server.mjs --session <dir> --task T01.1`
import { createServer } from 'node:http'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { normalizeKey, parseArgs } from './lib/args.mjs'
import { launchApp, makeContext, sleep } from './lib/context.mjs'
import { createDocsSite, createLoginApp, createPlainFolder, TEST_PAGE_HTML, TEST_PAGE_SECOND_HTML, TEST_PAGE_PORT, testPageUrl } from './lib/fixtures.mjs'
import { createLog } from './lib/log.mjs'
import { serve } from './lib/rpc.mjs'
import { runCheck } from './checks/index.mjs'
import { runPreset } from './presets/index.mjs'

const { flags } = parseArgs(process.argv.slice(2), { session: 'string', task: 'string', level: 'string', socket: 'string', admin: 'string', 'no-preset': 'bool', port: 'string' })
const sessionDir = resolve(flags.session ?? '.')
mkdirSync(join(sessionDir, 'shots'), { recursive: true })
const tmp = mkdtempSync(join(tmpdir(), 'a7ux-'))
const socketPath = flags.socket ?? join(tmp, 'ux.sock')
const adminPath = flags.admin ?? join(tmp, 'admin.sock')
const log = createLog(join(sessionDir, 'log.jsonl'))
const WIDTH = 1280
const HEIGHT = 800

// H-32: a sandbox home (<tmp>/home, removed with <tmp> by `session.mjs stop`) holds the projects under Documents, so the
// in-app Browse For Folder dialog lists them under Home and Documents. The app starts with HOME/USERPROFILE set to it.
const sandboxHome = join(tmp, 'home')
const fixturesBase = join(sandboxHome, 'Documents')
mkdirSync(fixturesBase, { recursive: true })
mkdirSync(join(sandboxHome, 'Desktop'), { recursive: true })
const fixtures = {
  base: fixturesBase,
  loginApp: createLoginApp(fixturesBase),
  loginAppGit: () => createLoginApp(join(fixturesBase, 'git-copies'), { git: true }),
  docsSite: createDocsSite(fixturesBase),
  plain: createPlainFolder(fixturesBase)
}
const userData = join(tmp, 'user-data')
mkdirSync(userData, { recursive: true })

const web = createServer((req, res) => {
  res.setHeader('content-type', 'text/html')
  // H-28: /second is served too (T29.1 opens {TEST_PAGE_URL}second).
  res.end(/^\/second\b/.test(req.url ?? '') ? TEST_PAGE_SECOND_HTML : TEST_PAGE_HTML)
})
// Each session serves its own copy of the fixture page on its own port (--port, TEST_PAGE_PORT, default 4173; 0 = any free
// port), so parallel sessions never share one page and the page does not vanish when another session stops.
const wantedPort = Number(flags.port ?? process.env.TEST_PAGE_PORT ?? TEST_PAGE_PORT)
const pagePort = await new Promise((resolvePort, reject) => {
  web.once('error', reject)
  web.listen(wantedPort, '127.0.0.1', () => resolvePort(web.address().port))
})

const app = await launchApp({ userData, home: sandboxHome })
const state = { task: flags.task ?? null, level: flags.level ?? null, sockDir: tmp, testPagePort: pagePort, testPageUrl: testPageUrl(pagePort), noMouse: false, startedAt: new Date().toISOString() }
const ctx = makeContext({ app, userData, sessionDir, fixtures, state })

// ---------------------------------------------------------------- window tracking
let current = null
const notices = []
const live = () => ctx.windows()
app.on('window', (page) => {
  if (!/[?&](launcher|desktop)=/.test(page.url()) && page.url() !== '' && page.url() !== 'about:blank') return
  page.once('domcontentloaded', () => undefined)
  // The URL is set at creation for these windows; a new window comes to the front like it does for a user.
  setTimeout(async () => {
    if (page.isClosed() || !live().includes(page)) return
    current = page
    notices.push(`A new window opened: "${await page.title().catch(() => '')}" (now showing it).`)
  }, 300)
  page.on('close', () => {
    notices.push('A window closed.')
    if (current === page) current = live().at(-1) ?? null
  })
})

async function normalize(page) {
  await app
    .evaluate(({ BrowserWindow }, { w, h }) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (win.isMinimized()) continue
        if (win.isMaximized()) win.unmaximize()
        const [cw, ch] = win.getContentSize()
        if (cw !== w || ch !== h) win.setContentSize(w, h)
      }
    }, { w: WIDTH, h: HEIGHT })
    .catch(() => undefined)
  void page
}

async function currentPage() {
  const pages = live()
  if (!current || current.isClosed() || !pages.includes(current)) current = pages.at(-1) ?? null
  if (!current) throw new Error('no window is open')
  return current
}

let shotNo = 0
async function shoot(page, out) {
  await normalize(page)
  await sleep(250)
  const file = out ? resolve(out) : join(sessionDir, 'shots', `${String(++shotNo).padStart(3, '0')}.png`)
  mkdirSync(join(file, '..'), { recursive: true })
  await page.screenshot({ path: file })
  return file
}

const takeNotices = () => notices.splice(0).map((n) => `Note: ${n}`)

async function summaryOf(page) {
  const title = await page.title().catch(() => '')
  const text = await page
    .evaluate(() => document.body.innerText)
    .catch(() => '')
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const shown = lines.slice(0, 60)
  return [`Window title: ${title}`, 'Visible text:', ...shown.map((l) => `  ${l.length > 120 ? `${l.slice(0, 117)}...` : l}`), ...(lines.length > 60 ? [`  ... (${lines.length - 60} more lines)`] : [])].join('\n')
}

async function windowList() {
  const pages = live()
  const cur = await currentPage().catch(() => null)
  const rows = []
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i]
    const size = await p.evaluate(() => [innerWidth, innerHeight]).catch(() => [0, 0])
    // H-43: every window title is "Agent7"; the kind (launcher or desktop) tells the windows apart.
    const kind = /[?&]launcher=/.test(p.url()) ? 'launcher' : /[?&]desktop=/.test(p.url()) ? 'desktop' : 'window'
    rows.push(`${p === cur ? '*' : ' '} ${i}  [${kind}]  "${await p.title().catch(() => '')}"  ${size[0]}x${size[1]}${p === cur ? '  (current)' : ''}`)
  }
  return rows
}

const FIND_SOURCE = (needle) => {
  const lower = needle.toLowerCase()
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return null
    const s = getComputedStyle(el)
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return null
    return r
  }
  const found = []
  const seen = new Set()
  const add = (el, label) => {
    if (seen.has(el)) return
    const r = visible(el)
    if (!r) return
    seen.add(el)
    found.push({ x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height), text: label.trim().replace(/\s+/g, ' ').slice(0, 80) })
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeValue && n.nodeValue.toLowerCase().includes(lower) && n.parentElement) add(n.parentElement, n.nodeValue)
  }
  for (const el of document.querySelectorAll('[aria-label],[title],[placeholder]')) {
    for (const attr of ['aria-label', 'title', 'placeholder']) {
      const v = el.getAttribute(attr)
      if (v && v.toLowerCase().includes(lower)) add(el, v)
    }
  }
  return found.slice(0, 15)
}

// ---------------------------------------------------------------- panelist commands
const MOUSE_CMDS = new Set(['click', 'move', 'drag', 'scroll'])

async function handleUx({ cmd, args = [], flags: f = {} }) {
  const started = Date.now()
  const entry = { cmd, args, ...(Object.keys(f).length ? { flags: f } : {}) }
  try {
    if (state.noMouse && MOUSE_CMDS.has(cmd)) throw new Error('The mouse is not working. Use the keyboard.')
    let text = ''
    let page
    if (cmd === 'windows') {
      text = ['Windows:', ...(await windowList())].join('\n')
    } else if (cmd === 'switch') {
      const pages = live()
      if (!pages[args[0]]) throw new Error(`no window ${args[0]} (0..${pages.length - 1})`)
      current = pages[args[0]]
      await current.bringToFront().catch(() => undefined)
      page = current
      text = `Now showing window ${args[0]}.`
    } else if (cmd === 'wait') {
      await sleep(Math.min(Math.max(args[0], 0), 10_000))
      page = await currentPage()
      text = `Waited ${args[0]} ms.`
    } else if (cmd === 'find') {
      page = await currentPage()
      const hits = await page.evaluate(FIND_SOURCE, args[0])
      text = hits.length ? [`Found ${hits.length} on screen (x y = centre, size w x h):`, ...hits.map((h) => `  (${h.x}, ${h.y})  ${h.w}x${h.h}  "${h.text}"`)].join('\n') : `Nothing on screen reads "${args[0]}".`
      entry.note = `${hits.length} hit(s)`
      entry.window = (await page.title().catch(() => '')) || undefined
      log.append({ ...entry, ok: true, ms: Date.now() - started })
      return { ok: true, text: [text, ...takeNotices()].join('\n') }
    } else {
      page = await currentPage()
      if (cmd === 'shot') {
        // handled below
      } else if (cmd === 'click') {
        await page.mouse.click(args[0], args[1], { button: f.right ? 'right' : 'left', clickCount: f.double ? 2 : 1 })
      } else if (cmd === 'move') {
        await page.mouse.move(args[0], args[1], { steps: 4 })
      } else if (cmd === 'drag') {
        await page.mouse.move(args[0], args[1])
        await page.mouse.down()
        await page.mouse.move((args[0] + args[2]) / 2, (args[1] + args[3]) / 2, { steps: 6 })
        await page.mouse.move(args[2], args[3], { steps: 6 })
        await page.mouse.up()
      } else if (cmd === 'scroll') {
        await page.mouse.move(args[0], args[1])
        await page.mouse.wheel(0, args[2])
      } else if (cmd === 'type') {
        await page.keyboard.type(args[0], { delay: 10 })
      } else if (cmd === 'key') {
        await page.keyboard.press(normalizeKey(args[0]))
      }
      text = cmd === 'shot' ? '' : `Done: ${cmd} ${args.map((a) => (typeof a === 'string' ? JSON.stringify(a) : a)).join(' ')}`.trim()
    }
    const wasCurrent = current
    if (page) {
      if (cmd !== 'shot') await sleep(150)
      page = await currentPage().catch(() => null)
    }
    const lines = [text]
    if (page) {
      const file = await shoot(page, cmd === 'shot' ? f.out : undefined)
      entry.screenshot = file
      entry.window = await page.title().catch(() => '')
      lines.push(`Screenshot: ${file}`)
      if (wasCurrent && page !== wasCurrent) lines.push('Note: the window you were using is gone; showing another window.')
      if (cmd === 'shot') lines.push(await summaryOf(page))
    }
    lines.push(...takeNotices())
    log.append({ ...entry, ok: true, ms: Date.now() - started })
    return { ok: true, text: lines.filter(Boolean).join('\n'), screenshot: entry.screenshot }
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : String(error)
    log.append({ ...entry, ok: false, note: message, ms: Date.now() - started })
    return { ok: false, text: `error: ${message}` }
  }
}

// ---------------------------------------------------------------- start state and sockets
let shuttingDown = false
async function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  await app.close().catch(() => undefined)
  web.close()
  setTimeout(() => process.exit(0), 100)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

const sessionFile = join(sessionDir, 'session.json')
const writeSession = (extra) => writeFileSync(sessionFile, JSON.stringify({ task: flags.task ?? null, level: flags.level ?? null, socket: socketPath, admin: adminPath, pid: process.pid, tmp, userData, testPageUrl: state.testPageUrl, home: sandboxHome, fixtures: { loginApp: fixtures.loginApp, docsSite: fixtures.docsSite, plain: fixtures.plain }, ...extra }, null, 2))
writeSession({ ready: false })

try {
  await serve(socketPath, handleUx)
  await serve(adminPath, async (req) => {
    if (req.op === 'status') return { ok: true, state }
    if (req.op === 'check') return { ok: true, result: await runCheck(ctx, req.task ?? state.task, { answer: req.answer }) }
    if (req.op === 'eval') {
      // Facilitator debugging only: evaluates an async function body in the launcher page with `api` = window.agent7.
      const page = await ctx.page()
      return { ok: true, result: await page.evaluate(`(async (api) => { ${req.code} })(window.agent7)`) }
    }
    if (req.op === 'shutdown') {
      setTimeout(shutdown, 50)
      return { ok: true }
    }
    return { ok: false, text: 'unknown op' }
  })
  const first = await ctx.launcher()
  await normalize(first)
  current = first
  if (!flags['no-preset'] && flags.task) {
    const info = await runPreset(ctx, flags.task)
    state.preset = info.preset
    state.note = info.note ?? null
    ctx.saveState()
  }
  await sleep(500)
  // After setup the panelist sees the most recently opened window, like a user would.
  current = live().at(-1) ?? first
  await normalize(current)
  notices.length = 0
  writeSession({ ready: true, preset: state.preset ?? null, note: state.note ?? null })
} catch (error) {
  writeSession({ ready: false, error: error instanceof Error ? error.stack : String(error) })
  console.error(error)
  if (!process.env.UX_KEEP) await shutdown()
}

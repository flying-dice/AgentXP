// Facilitator context shared by presets and checks. It runs INSIDE the server process and uses window.agent7 for SETUP
// and for reading state only. None of this is ever exposed to a panelist.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { connectControl } from './control.mjs'

const require = createRequire(import.meta.url)
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export const uxDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { _electron: electron } = require('playwright')

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function launchApp({ userData }) {
  const app = await electron.launch({
    executablePath: require('electron'),
    args: [join(repoRoot, 'out/main/index.js'), '--no-sandbox'],
    cwd: repoRoot,
    env: { ...process.env, AGENT7_USER_DATA: userData }
  })
  app.context().setDefaultTimeout(20_000)
  return app
}

export const isAppWindow = (page) => /[?&](launcher|desktop)=/.test(page.url())

export function makeContext({ app, userData, sessionDir, fixtures, state }) {
  const agents = new Map()
  const controls = new Map()
  const saveState = () => writeFileSync(join(sessionDir, 'state.json'), JSON.stringify(state, null, 2))

  const ctx = {
    app,
    userData,
    sessionDir,
    fixtures,
    state,
    saveState,
    sockDir: state.sockDir,
    sleep,
    agents,

    async waitFor(fn, what, ms = 20_000) {
      const deadline = Date.now() + ms
      for (;;) {
        const v = await fn()
        if (v) return v
        if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`)
        await sleep(100)
      }
    },

    windows: () => app.windows().filter(isAppWindow),
    async launcher() {
      return ctx.waitFor(() => ctx.windows().find((w) => w.url().includes('launcher=1')), 'the launcher window').then(async (p) => {
        await p.waitForFunction(() => Boolean(window.agent7))
        return p
      })
    },
    /** Any window that can call the app API (the launcher). */
    async page() {
      return ctx.windows().find((w) => w.url().includes('launcher=1')) ?? ctx.windows()[0] ?? (await ctx.launcher())
    },
    desktopWindow: (id) => ctx.windows().find((w) => w.url().includes(`desktop=${id}`)),
    async desktopPage(id) {
      const p = await ctx.waitFor(() => ctx.desktopWindow(id), `the window of desktop ${id}`)
      await p.waitForFunction(() => Boolean(window.agent7))
      return p
    },

    /** The next folder pickers (New desktop > Browse, Plug in a project) answer with these paths, in order (the last one repeats). */
    async answerFolderPicker(...paths) {
      await app.evaluate(({ dialog }, list) => {
        // Only folder pickers get a folder path; a file picker (Attach) is cancelled. When the in-app Browse For Folder
        // dialog replaces the native one this stub is simply never called.
        dialog.showOpenDialog = async (...args) => {
          const options = args.find((a) => a && typeof a === 'object' && 'properties' in a) ?? {}
          if (!(options.properties ?? []).includes('openDirectory')) return { canceled: true, filePaths: [] }
          const picks = globalThis.__uxPicks ?? list
          const path = picks.length > 1 ? picks.shift() : picks[0]
          globalThis.__uxPicks = picks
          return { canceled: false, filePaths: [path] }
        }
        globalThis.__uxPicks = [...list]
      }, paths)
    },

    // ------------------------------------------------------------ agent API (setup/read only)
    async eval(fn, arg, page) {
      const p = page ?? (await ctx.page())
      return p.evaluate(fn, arg)
    },
    async addFolder(path) {
      return ctx.eval((p) => window.agent7.folders.add(p).then((f) => f.id), path)
    },
    launcherList: () => ctx.eval(() => window.agent7.launcher.list()),
    async desktopByTitle(title) {
      return (await ctx.launcherList()).find((d) => d.title === title)
    },
    sessions: (desktopId) => ctx.eval((id) => window.agent7.sessions.list(id), desktopId),
    transcript: (sessionId) => ctx.eval((id) => window.agent7.sessions.transcript(id), sessionId),
    terminalsOf: (sessionId) => ctx.eval((id) => window.agent7.sessions.terminals(id), sessionId),
    changes: (sessionId) => ctx.eval((id) => window.agent7.sessions.changes(id), sessionId),
    drives: (desktopId) => ctx.eval((id) => window.agent7.drives.list(id), desktopId),
    folders: () => ctx.eval(() => window.agent7.folders.list()),
    recycled: (desktopId) => ctx.eval((id) => window.agent7.recycle.list(id), desktopId),
    policy: () => ctx.eval(() => window.agent7.desktop.policy()),
    agentsList: () => ctx.eval(() => window.agent7.agents.list()),
    processes: () => ctx.eval(() => window.agent7.processes.list()),
    /** Live state of a connected desktop (null when its window is closed). */
    async desktopState(id) {
      const p = ctx.desktopWindow(id)
      return p ? p.evaluate(() => window.agent7.desktop.current()) : null
    },
    async setPolicy(groups = {}, openApps) {
      await ctx.eval(
        async ({ groups, openApps }) => {
          const api = window.agent7
          const policy = await api.desktop.policy()
          await api.desktop.setPolicy({ ...policy, groups: { ...policy.groups, ...groups }, openApps: openApps ?? policy.openApps })
        },
        { groups, openApps }
      )
    },
    protocol: (desktopId, query) => ctx.eval(({ desktopId, query }) => window.agent7.events.query({ desktopId, ...query, limit: 5000 }), { desktopId, query }),
    /** Outcomes (`success`, `cancelled`, `interrupt`, `error`) of the finished runs of a chat, oldest first. */
    async runOutcomes(desktopId, sessionId) {
      const events = await ctx.protocol(desktopId, { source: 'ag-ui', sessionId })
      return events
        .filter((e) => e.name === 'RUN_FINISHED' || e.name === 'RUN_ERROR')
        .map((e) => (e.name === 'RUN_ERROR' ? 'error' : (JSON.parse(e.payload).outcome?.type ?? 'success')))
    },

    // ------------------------------------------------------------ scripted agent
    /** Registers the BUILT scripted agent with `script` (a name in scripts/ux-panel/scripts or agents/scripted-agent/scripts, or a path) as the default agent. */
    async useScript(script, { stepMode, makeDefault = true, name } = {}) {
      const file = resolveScript(script)
      let used = file
      if (stepMode) {
        const parsed = JSON.parse(readFileSync(file, 'utf8'))
        used = join(sessionDir, `script-${agents.size}.json`)
        writeFileSync(used, JSON.stringify({ ...parsed, defaults: { ...parsed.defaults, stepMode } }))
      }
      const socket = join(ctx.sockDir, `ctl-${agents.size}.sock`)
      const agent = {
        name: name ?? `Scripted ${script}`,
        command: require('electron'),
        args: [join(repoRoot, 'out/main/scripted-agent.js'), '--script', used],
        env: { ELECTRON_RUN_AS_NODE: '1', AGENT7_SCRIPT_CONTROL: socket }
      }
      const id = await ctx.eval(
        async ({ agent, makeDefault }) => {
          const created = await window.agent7.agents.create(agent)
          if (makeDefault) await window.agent7.agents.setDefault(created.id)
          return created.id
        },
        { agent, makeDefault }
      )
      const handle = { id, socket, script, async control() {
        if (!controls.has(socket)) controls.set(socket, connectControl(socket))
        return controls.get(socket)
      } }
      agents.set(id, handle)
      return handle
    },

    // ------------------------------------------------------------ desktops and chats
    /** Creates a desktop through the API (projects plugged in at creation) and optionally connects it. */
    async createDesktop({ title, projects = [], connect = true, agentId }) {
      const folderIds = []
      for (const path of projects) folderIds.push(await ctx.addFolder(path))
      const created = await ctx.eval(({ title, folderIds, agentId }) => window.agent7.launcher.create({ title, folderIds, agentId }), { title, folderIds, agentId })
      let page = null
      if (connect) {
        await ctx.eval((id) => window.agent7.launcher.connect(id), created.id)
        page = await ctx.desktopPage(created.id)
        await page.getByTestId('taskbar').waitFor()
      }
      return { id: created.id, page, folderIds }
    },
    /** Starts a chat and opens its window. `cwd` defaults to the first plugged-in project drive (E:\) when there is one. */
    async newChat(desktopId, { cwd, agentId } = {}) {
      const page = await ctx.desktopPage(desktopId)
      const drives = await ctx.drives(desktopId)
      const where = cwd ?? (drives.find((d) => d.kind === 'removable') ? `${drives.find((d) => d.kind === 'removable').letter}:\\` : undefined)
      const win = await page.evaluate(({ desktopId, agentId, where }) => window.agent7.desktop.newChat(desktopId, agentId, where), { desktopId, agentId, where })
      return { sessionId: win.view.sessionId, windowId: win.id }
    },
    /** Types the prompt in the chat window of the session and presses Send (the same way a user does). */
    async sendPrompt(desktopId, sessionId, text) {
      const page = await ctx.desktopPage(desktopId)
      const frame = page.getByTestId('window-chat').filter({ has: page.locator(`[data-testid="chat-app"][data-session-id="${sessionId}"]`) })
      await frame.getByTestId('chat-composer-input').fill(text)
      await frame.getByTestId('chat-send').click()
    },
    async pendingPermissions(sessionId) {
      return (await ctx.transcript(sessionId)).filter((e) => e.kind === 'tool_call' && e.permission?.outcome === 'pending')
    },
    waitPending: (sessionId, n = 1) => ctx.waitFor(async () => (await ctx.pendingPermissions(sessionId)).length >= n, `${n} pending request(s) of chat ${sessionId}`),
    async waitIdle(sessionId) {
      await ctx.waitFor(async () => (await ctx.sessions()).find((s) => s.id === sessionId)?.status === 'idle', `chat ${sessionId} idle`, 30_000)
    },
    async waitAgentMessages(sessionId, n) {
      await ctx.waitFor(async () => (await ctx.transcript(sessionId)).filter((e) => e.kind === 'message' && e.role === 'agent').length >= n, `${n} assistant message(s)`, 30_000)
    },
    async dismissDialogs(desktopId) {
      const page = await ctx.desktopPage(desktopId)
      for (let i = 0; i < 5; i++) {
        const b = page.getByTestId('uac-not-now')
        if (!(await b.isVisible().catch(() => false))) break
        await b.click()
        await sleep(200)
      }
    },
    async closeWindowsOf(desktopId, app) {
      const page = await ctx.desktopPage(desktopId)
      await page.evaluate(async ({ app }) => {
        const state = await window.agent7.desktop.current()
        for (const w of state.windows) if (w.app === app) await window.agent7.desktop.closeWindow(w.id)
      }, { app })
    },
    async openApp(desktopId, app, extra = {}) {
      const page = await ctx.desktopPage(desktopId)
      return page.evaluate((input) => window.agent7.desktop.openWindow(input), { desktopId, app, ...extra })
    },
    async fileText(path) {
      try {
        return readFileSync(path, 'utf8')
      } catch {
        return null
      }
    },
    exists: (path) => existsSync(path)
  }
  return ctx
}

export function resolveScript(script) {
  const candidates = [resolve(script), join(uxDir, 'scripts', script), join(uxDir, 'scripts', `${script}.json`), join(repoRoot, 'agents/scripted-agent/scripts', script), join(repoRoot, 'agents/scripted-agent/scripts', `${script}.json`)]
  const found = candidates.find((c) => c.endsWith('.json') && existsSync(c))
  if (!found) throw new Error(`no scripted-agent script ${script}`)
  return found
}

export { mkdirSync }

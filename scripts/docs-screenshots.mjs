// Takes the screenshots of the user guide (README.md) from the BUILT app.
//
//   npx electron-vite build && npm run docs:screenshots
//
// It starts the app with a private user-data folder, uses the built-in Scripted Agent with the script
// scripts/docs-screenshots/chat.json, plugs the sample project `claude-code-win` in as drive E: and writes the PNG
// files to docs/images (set DOCS_OUT to write somewhere else). On Linux without a display it re-runs itself under
// `xvfb-run -a -s "-screen 0 1440x900x24"`. PNG files are reduced to 256 colors with Pillow when `python3` has it.
import { spawn, spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { files as sampleFiles } from './docs-screenshots/workspace.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

if (process.platform === 'linux' && !process.env.DISPLAY) {
  const run = spawn('xvfb-run', ['-a', '-s', '-screen 0 1440x900x24', process.execPath, fileURLToPath(import.meta.url)], { stdio: 'inherit', env: process.env })
  run.on('exit', (code) => process.exit(code ?? 1))
} else {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

async function main() {
  const require = createRequire(import.meta.url)
  const { _electron: electron } = require('playwright')
  const out = resolve(process.env.DOCS_OUT ?? join(root, 'docs/images'))
  await mkdir(out, { recursive: true })

  const userData = await mkdtemp(join(tmpdir(), 'a7-docs-data-'))
  // A short, tidy host path: the chat shows real paths of the host.
  const parent = join(tmpdir(), 'agentxp-docs')
  await rm(parent, { recursive: true, force: true })
  const workspace = join(parent, 'projects', 'claude-code-win')
  for (const [relative, text] of Object.entries(sampleFiles)) {
    const file = join(workspace, relative)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, text)
  }

  const app = await electron.launch({
    executablePath: require('electron'),
    args: [join(root, 'out/main/index.js'), '--no-sandbox'],
    cwd: root,
    env: { ...process.env, AGENTXP_USER_DATA: userData }
  })
  app.context().setDefaultTimeout(30_000)
  const written = []

  /** Saves a PNG of a page, or of one element (with `margin` pixels around it). */
  async function shot(name, target, { margin = 0 } = {}) {
    const path = join(out, `${name}.png`)
    if (typeof target.screenshot === 'function' && typeof target.boundingBox === 'function' && margin === 0) {
      await target.screenshot({ path })
    } else {
      const box = await target.boundingBox()
      const page = target.page()
      const size = page.viewportSize() ?? (await page.evaluate(() => ({ width: innerWidth, height: innerHeight })))
      const x = Math.max(0, Math.floor(box.x - margin))
      const y = Math.max(0, Math.floor(box.y - margin))
      const width = Math.min(size.width - x, Math.ceil(box.width + margin * 2))
      const height = Math.min(size.height - y, Math.ceil(box.height + margin * 2))
      await page.screenshot({ path, clip: { x, y, width, height } })
    }
    written.push(path)
    console.log(`  ${name}.png`)
  }
  const pageShot = async (name, page) => {
    const path = join(out, `${name}.png`)
    await page.screenshot({ path })
    written.push(path)
    console.log(`  ${name}.png`)
  }
  /** Types a message and presses Enter (a window on top of the Send button cannot block a key press). */
  const say = async (chatFrame, text) => {
    const input = chatFrame.getByTestId('chat-composer-input')
    await input.fill(text)
    await input.press('Enter')
  }
  const pageClip = async (name, page, clip) => {
    const path = join(out, `${name}.png`)
    await page.screenshot({ path, clip })
    written.push(path)
    console.log(`  ${name}.png`)
  }
  const pause = (ms) => new Promise((r) => setTimeout(r, ms))
  const ready = async (page) => {
    await page.waitForFunction(() => Boolean(window.agentxp))
    return page
  }

  try {
    const launcher = await ready(await app.firstWindow())
    const desktopWindow = async (id) => {
      for (let i = 0; i < 200; i++) {
        const w = app.windows().find((x) => x.url().includes(`desktop=${id}`))
        if (w) return ready(w)
        await pause(100)
      }
      throw new Error(`no window for desktop ${id}`)
    }

    // ---- setup: the built-in Scripted Agent runs the documentation script ------------------------------------
    const setup = await launcher.evaluate(
      async ({ workspace, script }) => {
        const api = window.agentxp
        const agents = await api.agents.list()
        const scripted = agents.find((a) => a.name === 'Scripted Agent')
        if (!scripted) throw new Error('the built-in Scripted Agent is missing')
        await api.agents.update(scripted.id, { name: scripted.name, command: scripted.command, args: [scripted.args[0], '--script', script], env: scripted.env })
        await api.agents.setDefault(scripted.id)
        const folder = await api.folders.add(workspace)
        const second = await api.launcher.create({ title: 'Release notes', folderIds: [folder.id] })
        const third = await api.launcher.create({ title: 'Try new ideas', folderIds: [] })
        return { folderId: folder.id, other: [second.id, third.id] }
      },
      { workspace, script: join(root, 'scripts/docs-screenshots/chat.json') }
    )

    // ---- new desktop dialog -----------------------------------------------------------------------------------
    console.log('launcher')
    await launcher.getByTestId('launcher-new').click()
    const dialog = launcher.getByTestId('new-desktop-dialog')
    await dialog.waitFor()
    await dialog.getByTestId('new-desktop-name').fill('Fix login redirect')
    await dialog.getByTestId('new-desktop-project').filter({ hasText: 'claude-code-win' }).getByTestId('new-desktop-project-check').click()
    await pause(300)
    await pageShot('new-desktop', launcher)
    await dialog.getByTestId('new-desktop-project').filter({ hasText: 'claude-code-win' }).getByTestId('new-desktop-project-check').click()
    await dialog.getByTestId('dialog-button-ok').click()
    const row = launcher.getByTestId('launcher-desktop-row').filter({ has: launcher.getByTestId('launcher-desktop-name').filter({ hasText: 'Fix login redirect' }) })
    await row.waitFor()
    const desktopId = await launcher.evaluate(async () => (await window.agentxp.launcher.list()).find((d) => d.title === 'Fix login redirect').id)

    // Give the two other desktops a thumbnail: connect, wait, disconnect.
    for (const id of setup.other) {
      await launcher.evaluate((i) => window.agentxp.launcher.connect(i), id)
      const w = await desktopWindow(id)
      await w.getByTestId('taskbar').waitFor()
      await pause(1200)
      await launcher.evaluate((i) => window.agentxp.launcher.disconnect(i), id)
      await pause(800)
    }

    // ---- connect: the desktop window opens ---------------------------------------------------------------------
    await row.click()
    await launcher.getByTestId('launcher-connect').click()
    const page = await desktopWindow(desktopId)
    await page.getByTestId('taskbar').waitFor()
    await pause(800)
    const api = (fn, arg) => page.evaluate(fn, arg)
    // Shell commands that run chats without prompts for read/terminal (write stays on Ask).
    const defaultPolicy = await api(async () => {
      const a = window.agentxp
      const policy = await a.desktop.policy()
      await a.desktop.setPolicy({ ...policy, groups: { ...policy.groups, terminal: 'allow' } })
      return policy
    })

    // ---- plug in the project: AutoPlay --------------------------------------------------------------------------
    console.log('usb')
    await api(async ({ desktopId, folderId }) => {
      await window.agentxp.drives.plugIn(desktopId, folderId)
    }, { desktopId, folderId: setup.folderId })
    const autoplay = page.getByTestId('autoplay-dialog')
    await autoplay.waitFor()
    await pause(400)
    await shot('usb-autoplay', autoplay, { margin: 40 })
    await page.getByTestId('autoplay-start-chat').click()
    const chatFrame = page.getByTestId('window-chat').first()
    await chatFrame.waitFor()

    // ---- arrange the desktop -------------------------------------------------------------------------------------
    const windowId = async (app, nth = 0) => Number(await page.getByTestId(`window-${app}`).nth(nth).getAttribute('data-window-id'))
    const place = async (app, bounds, nth = 0) => api(({ id, bounds }) => window.agentxp.desktop.setBounds(id, bounds), { id: await windowId(app, nth), bounds })
    const open = async (app, extra = {}) => {
      const state = await api(({ desktopId, app, extra }) => window.agentxp.desktop.openWindow({ desktopId, app, ...extra }), { desktopId, app, extra })
      await page.getByTestId(`window-${app}`).last().waitFor()
      return state
    }
    await api(async () => {
      const s = await window.agentxp.desktop.current()
      const chat = s.windows.find((w) => w.app === 'chat')
      await window.agentxp.sessions.rename(chat.view.sessionId, 'Fix login redirect bug')
    })
    await place('chat', { x: 20, y: 64, width: 520, height: 640 })
    await open('explorer', { path: 'E:\\src\\auth' })
    await place('explorer', { x: 556, y: 64, width: 496, height: 214 })
    await open('code', { path: 'E:\\src\\auth\\redirect.ts' })
    await place('code', { x: 556, y: 290, width: 496, height: 240 })
    await open('terminal')
    await place('terminal', { x: 556, y: 542, width: 496, height: 190 })
    await pause(1200)

    // ---- the first turn: the agent works, then asks ---------------------------------------------------------------
    console.log('desktop')
    const chat = page.getByTestId('window-chat').first()
    await say(chat, 'Fix the login redirect bug so that deep links survive sign-in')
    await page.getByTestId('topbar-status').filter({ hasText: 'Working: Search' }).waitFor({ timeout: 60_000 })
    // The agent opened Sticky Notes and added its plan: park the note under the infopanels and minimize the app window.
    await page.waitForFunction(async () => (await window.agentxp.notes.list(window.agentxp && (await window.agentxp.desktop.current()).desktopId)).length > 0)
    await api(async () => {
      const state = await window.agentxp.desktop.current()
      const notes = await window.agentxp.notes.list(state.desktopId)
      await window.agentxp.notes.update(notes[0].id, { bounds: { x: 1066, y: 440, width: 196, height: 190 } })
      const app = state.windows.find((w) => w.app === 'sticky-notes')
      if (app) await window.agentxp.desktop.setWindowState(app.id, 'minimized')
    })
    await pause(900)
    await pageShot('desktop', page)

    // Action Center and the UAC dialog
    console.log('uac')
    // The agent asks after the search step (about 9 s). Open the Action Center until it lists the request.
    const flag = page.getByTestId('action-center-flag')
    await flag.waitFor()
    for (let i = 0; ; i++) {
      if (i > 120) throw new Error('no permission request reached the Action Center')
      await flag.click()
      await pause(400)
      if ((await page.getByTestId('action-center-approval').count()) > 0) break
      await flag.click()
      await pause(500)
    }
    await page.getByTestId('action-center').waitFor()
    await pause(300)
    await shot('action-center', page.getByTestId('action-center'), { margin: 60 })
    await page.getByTestId('action-center-review').first().click()
    await page.getByTestId('uac-dialog').waitFor()
    // Older builds fold the details behind a button; the dialog now shows them.
    if ((await page.getByTestId('uac-details').count()) > 0) await page.getByTestId('uac-details').click()
    await pause(700)
    await pageShot('uac-dialog', page)
    await page.getByTestId('uac-allow').click()
    await chat.getByTestId('chat-transcript').and(page.locator('[data-running="false"]')).waitFor({ timeout: 60_000 })
    await pause(600)

    await api((policy) => window.agentxp.desktop.setPolicy(policy), defaultPolicy)

    // ---- a second chat: the form --------------------------------------------------------------------------------------
    console.log('a2ui')
    await api(({ desktopId }) => window.agentxp.desktop.newChat(desktopId), { desktopId })
    const chat2 = page.getByTestId('window-chat').nth(1)
    await chat2.waitFor()
    await api(async () => {
      const s = await window.agentxp.desktop.current()
      const last = s.windows.filter((w) => w.app === 'chat').at(-1)
      await window.agentxp.sessions.rename(last.view.sessionId, 'Deploy the fix')
    })
    await place('chat', { x: 20, y: 70, width: 520, height: 600 }, 1)
    await say(chat2, 'Show me a form for the deployment')
    const surfaceWindow = page.getByTestId('window-surface')
    await surfaceWindow.getByTestId('a2ui-surface').waitFor({ timeout: 60_000 })
    await chat2.getByTestId('chat-surface-row').waitFor()
    await place('surface', { x: 560, y: 70, width: 480, height: 420 })
    await pause(1200)
    // The form in its own window next to the chat, with the chat row (Open / Close / Delete) visible.
    const chatBox = await chat2.boundingBox()
    const formBox = await surfaceWindow.boundingBox()
    const x0 = Math.floor(Math.min(chatBox.x, formBox.x)) - 8
    const y0 = Math.floor(Math.min(chatBox.y, formBox.y)) - 8
    await pageClip('a2ui-form', page, {
      x: Math.max(0, x0),
      y: Math.max(0, y0),
      width: Math.ceil(Math.max(chatBox.x + chatBox.width, formBox.x + formBox.width)) + 8 - Math.max(0, x0),
      height: Math.ceil(Math.max(chatBox.y + chatBox.height, formBox.y + formBox.height)) + 8 - Math.max(0, y0)
    })
    await api(async () => {
      const s = await window.agentxp.desktop.current()
      await window.agentxp.desktop.closeWindow(s.windows.find((w) => w.app === 'surface').id)
    })

    // ---- the same chat with a sidebar: the chat's extended surface ---------------------------------------------------
    console.log('a2ui sidebar')
    await place('chat', { x: 20, y: 70, width: 860, height: 600 }, 1)
    await say(chat2, 'Add the release checklist')
    await chat2.getByTestId('chat-sidebar').getByTestId('a2ui-surface').waitFor({ timeout: 60_000 })
    await chat2.getByTestId('chat-transcript').and(page.locator('[data-running="false"]')).waitFor({ timeout: 60_000 })
    await pause(800)
    await shot('a2ui-sidebar', chat2)
    await api(async () => {
      const s = await window.agentxp.desktop.current()
      const last = s.windows.filter((w) => w.app === 'chat').at(-1)
      await window.agentxp.a2ui.setSidebarHidden(last.view.sessionId, 'checklist', true)
    })
    await place('chat', { x: 300, y: 70, width: 520, height: 600 }, 1)

    // ---- Agent Paint --------------------------------------------------------------------------------------------------
    console.log('paint')
    await open('paint')
    await place('paint', { x: 120, y: 50, width: 790, height: 690 })
    await say(chat2, 'Draw a picture of a little house')
    await page.getByTestId('window-paint').getByTestId('paint-canvas').waitFor()
    await pause(1500)
    await chat2.getByTestId('chat-transcript').and(page.locator('[data-running="false"]')).waitFor({ timeout: 60_000 })
    await pause(600)
    await page.getByTestId('window-paint').getByTestId('window-title').click()
    await pause(300)
    await shot('agent-paint', page.getByTestId('window-paint'))

    // ---- Computer view and Safely Remove ----------------------------------------------------------------------------
    console.log('computer')
    await page.getByTestId('taskbar-start').click()
    await page.getByTestId('start-menu').waitFor()
    await page.getByTestId('start-menu-place-computer').click()
    const computer = page.getByTestId('window-explorer').last()
    await computer.waitFor()
    await place('explorer', { x: 200, y: 120, width: 620, height: 400 }, 1)
    await pause(800)
    await computer.getByTestId('window-title').click()
    await computer.getByTestId('explorer-drive-e').click()
    await pause(400)
    await shot('computer', computer)

    // ---- Control Center: permissions -----------------------------------------------------------------------------------
    console.log('control center')
    await page.getByTestId('taskbar-start').click()
    await page.getByTestId('start-menu-place-control-centre').click()
    const cc = page.getByTestId('window-control-centre')
    await cc.waitFor()
    await place('control-centre', { x: 180, y: 60, width: 760, height: 690 })
    await cc.getByTestId('control-centre-page-permissions').click()
    await pause(900)
    await shot('control-centre-permissions', cc)

    // ---- Event Viewer -------------------------------------------------------------------------------------------------------
    console.log('event viewer')
    await page.getByTestId('taskbar-start').click()
    await page.getByTestId('start-menu-all').click()
    await page.getByTestId('start-menu-group-system-tools').click()
    await page.getByTestId('start-menu-item-event-viewer').click()
    const ev = page.getByTestId('window-event-viewer')
    await ev.waitFor()
    await place('event-viewer', { x: 120, y: 90, width: 980, height: 560 })
    await pause(1000)
    await ev.getByTestId('event-viewer-row').nth(3).click().catch(() => undefined)
    await pause(500)
    await shot('event-viewer', ev)

    // ---- the launcher: a third chat waits for approval while the desktop is disconnected ----------------------------------
    console.log('launcher (again)')
    // Close through the API: the windows overlap, and the title bar of the lower one can sit under the other.
    await api(async () => {
      const s = await window.agentxp.desktop.current()
      for (const w of s.windows.filter((x) => x.app === 'event-viewer' || x.app === 'control-centre')) await window.agentxp.desktop.closeWindow(w.id)
    })
    await say(chat, 'Take another look at the sign-in handler')
    await page.getByTestId('action-center-flag').waitFor()
    await page.waitForFunction(async () => (await window.agentxp.launcher.list()).some((d) => d.runState === 'awaiting_approval'), undefined, { timeout: 60_000 })
    await pause(500)
    await launcher.evaluate((i) => window.agentxp.launcher.disconnect(i), desktopId)
    await pause(1500)
    await launcher.bringToFront()
    await launcher.getByTestId('launcher-desktop-row').first().click()
    await row.click()
    await launcher.getByTestId('launcher-options').click()
    await pause(800)
    await pageShot('launcher', launcher)

    // ---- Start menu: needs a connected desktop with some recent chats --------------------------------------------------------------
    console.log('start menu')
    await launcher.evaluate((i) => window.agentxp.launcher.connect(i), desktopId)
    const page2 = await desktopWindow(desktopId)
    await page2.getByTestId('taskbar').waitFor()
    await pause(1200)
    await page2.getByTestId('taskbar-start').click()
    await page2.getByTestId('start-menu').waitFor()
    await pause(500)
    const menu = await page2.getByTestId('start-menu').boundingBox()
    const size = await page2.evaluate(() => ({ width: innerWidth, height: innerHeight }))
    await pageClip('start-menu', page2, { x: 0, y: Math.floor(menu.y) - 6, width: Math.ceil(menu.x + menu.width) + 160, height: size.height - Math.floor(menu.y) + 6 })

    // ---- Task Scheduler: the icon, the library with a history, the wizard and the Create Task dialog -------------------------------------
    console.log('task scheduler')
    await page2.keyboard.press('Escape')
    const api2 = (fn, arg) => page2.evaluate(fn, arg)
    // Minimize the windows that the desktop restored, so that the icons show.
    await api2(async () => {
      const state = await window.agentxp.desktop.current()
      for (const w of state.windows) await window.agentxp.desktop.setWindowState(w.id, 'minimized')
    })
    await pause(600)
    await shot('task-scheduler-icon', page2.getByTestId('desktop-icon-task-scheduler'), { margin: 56 })

    const now = new Date()
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    // A skill, an MCP server with three tools and a profile, to choose from in the action of a task.
    const skillRoot = join(parent, 'skills')
    for (const [name, description] of [['pdf', 'Read and fill in PDF files.'], ['code-review', 'Review a change and write short comments.']]) {
      await mkdir(join(skillRoot, name), { recursive: true })
      await writeFile(join(skillRoot, name, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n---\n\n${description}\n`)
    }
    const registry = await api2(
      async ({ skillRoot, demoServer }) => {
        const a = window.agentxp
        const pdf = await a.skills.install(`${skillRoot}/pdf`)
        const review = await a.skills.install(`${skillRoot}/code-review`)
        const server = await a.mcp.add({ name: 'GitHub', transport: 'stdio', command: 'node', args: [demoServer], url: '', vars: [] })
        await a.mcp.test(server.id)
        const profile = await a.profiles.create({ name: 'Reviewer', instructions: 'Review the change and write short comments.', agentId: null, model: null, skillIds: [review.id], mcpServerIds: [server.id] })
        return { pdf: pdf.id, review: review.id, server: server.id, profile: profile.id }
      },
      { skillRoot, demoServer: join(root, 'scripts/docs-screenshots/demo-mcp.mjs') }
    )
    const agentAction = (prompt, capabilities = { mode: 'inherit', profileId: null, teamId: null, skills: [], servers: [], hiddenTools: [] }) => ({ kind: 'agent', agentId: null, cwd: 'E:\\', session: 'new', sessionId: null, prompt, capabilities })
    const conditions = { onlyIfNoOtherTaskRuns: false, onlyIfAgentIdle: false, onlyIfNotPaused: true }
    const settings = { allowOnDemand: true, runMissed: false, stopIfRunsLonger: true, stopAfterMinutes: 60, restartOnFailure: false, restartIntervalMinutes: 5, restartAttempts: 3, ifRunning: 'ignore' }
    const tasks = [
      {
        name: 'Morning review',
        description: 'Summarise the changes of yesterday before the work starts.',
        enabled: true,
        triggers: [{ kind: 'daily', enabled: true, startAt: `${day}T09:00`, expiresAt: null, everyDays: 1 }],
        actions: [agentAction('Review the changes of yesterday and write a short summary.')],
        conditions,
        settings
      },
      {
        name: 'Dependency check',
        description: 'Look for outdated packages twice a week.',
        enabled: true,
        triggers: [{ kind: 'weekly', enabled: true, startAt: `${day}T08:30`, expiresAt: null, everyWeeks: 1, daysOfWeek: [1, 5] }],
        actions: [
          agentAction('Run the dependency check and list the packages that are out of date.', {
            mode: 'custom',
            profileId: null,
            teamId: null,
            skills: [{ id: registry.pdf, name: 'pdf' }],
            servers: [{ id: registry.server, name: 'GitHub' }],
            hiddenTools: [{ serverId: registry.server, tool: 'delete_branch' }]
          })
        ],
        conditions,
        settings: { ...settings, runMissed: true, restartOnFailure: true, restartIntervalMinutes: 10, restartAttempts: 2, ifRunning: 'queue' }
      },
      {
        name: 'Start of day',
        description: 'Read the open tasks when AgentXP starts.',
        enabled: true,
        triggers: [{ kind: 'startup', enabled: true, delayMinutes: 2 }],
        actions: [agentAction('List the open tasks of this project.', { mode: 'profile', profileId: registry.profile, teamId: null, skills: [], servers: [], hiddenTools: [] })],
        conditions,
        settings
      },
      {
        name: 'Month-end report',
        description: 'Write the report of the month.',
        enabled: false,
        triggers: [{ kind: 'monthly', enabled: true, startAt: `${day}T17:00`, expiresAt: null, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], daysOfMonth: [], lastDay: true }],
        actions: [agentAction('Write the report of this month.')],
        conditions,
        settings
      }
    ]
    const taskIds = await api2(
      async ({ desktopId, tasks }) => {
        const ids = []
        for (const input of tasks) ids.push((await window.agentxp.scheduler.create(desktopId, input)).id)
        return ids
      },
      { desktopId, tasks }
    )

    await page2.getByTestId('taskbar-start').click()
    await page2.getByTestId('start-menu-all').click()
    await page2.getByTestId('start-menu-group-system-tools').click()
    await page2.getByTestId('start-menu-item-task-scheduler').click()
    const ts = page2.getByTestId('window-task-scheduler')
    await ts.waitFor()
    await api2(async () => {
      const state = await window.agentxp.desktop.current()
      const w = state.windows.find((x) => x.app === 'task-scheduler')
      await window.agentxp.desktop.setBounds(w.id, { x: 90, y: 120, width: 1020, height: 640 })
    })
    await ts.getByTestId('task-scheduler-row').first().waitFor()

    // Two real runs of the first task make a history.
    await ts.getByTestId('task-scheduler-row').filter({ hasText: 'Morning review' }).click()
    for (let run = 1; run <= 2; run++) {
      await ts.getByTestId('task-scheduler-action-run').click()
      // Wait until this run has ended; the next click then starts a second run instead of being skipped.
      for (let i = 0; ; i++) {
        if (i > 240) throw new Error('the task run did not end')
        const runs = await api2((id) => window.agentxp.scheduler.history(id), taskIds[0])
        console.log(`  run ${run}: ${runs.map((r) => r.result).join(', ') || 'no row yet'}`)
        if (runs.length >= run && runs.every((r) => r.result !== 'running')) break
        await pause(500)
      }
    }
    await ts.getByTestId('task-scheduler-tab-general').click()
    await pause(900)
    await shot('task-scheduler', ts)
    await ts.getByTestId('task-scheduler-tab-history').click()
    await ts.getByTestId('task-scheduler-history-row').first().waitFor()
    await pause(500)
    await shot('task-scheduler-history', ts)

    // The Create Basic Task wizard on its first page, with a name typed.
    await ts.getByTestId('task-scheduler-action-create-basic').click()
    const wizard = page2.getByTestId('basic-wizard')
    await wizard.waitFor()
    await wizard.getByTestId('basic-wizard-name').fill('Weekly summary')
    await wizard.getByTestId('basic-wizard-description').fill('Write what the team finished this week.')
    await pause(500)
    await shot('task-scheduler-wizard', wizard, { margin: 40 })
    await wizard.getByTestId('basic-wizard-cancel').click()

    // The Create Task dialog on its Triggers tab.
    await ts.getByTestId('task-scheduler-action-create').click()
    const editor = page2.getByTestId('task-editor')
    await editor.waitFor()
    await editor.getByTestId('task-editor-name').fill('Weekly summary')
    await editor.getByTestId('task-editor-tab-triggers').click()
    // A weekly trigger on Monday and Friday, so that the list shows one.
    await editor.getByTestId('task-editor-trigger-new').click()
    const triggerDialog = page2.getByTestId('trigger-dialog')
    await triggerDialog.waitFor()
    await triggerDialog.getByTestId('trigger-dialog-kind').click()
    await triggerDialog.getByTestId('trigger-dialog-kind-option-weekly').click()
    for (let d = 0; d < 7; d++) {
      const box = triggerDialog.getByTestId(`trigger-dialog-dow-${d}`)
      if ((await box.getAttribute('aria-checked')) !== String(d === 1 || d === 5)) await box.click()
    }
    await triggerDialog.getByTestId('dialog-button-ok').click()
    await triggerDialog.waitFor({ state: 'detached' })
    await pause(500)
    await shot('task-scheduler-create-task', editor, { margin: 40 })
    await editor.getByTestId('dialog-button-cancel').click()

    // The action of the Dependency check task: its own skills, MCP server and tools.
    await ts.getByTestId('task-scheduler-row').filter({ hasText: 'Dependency check' }).dblclick()
    await editor.waitFor()
    await editor.getByTestId('task-editor-tab-actions').click()
    await editor.getByTestId('task-editor-action-row').first().click()
    await editor.getByTestId('task-editor-action-edit').click()
    const actionDialog = page2.getByTestId('action-dialog')
    await actionDialog.waitFor()
    await actionDialog.getByTestId(`action-dialog-tool-${registry.server}-delete_branch`).waitFor()
    await pause(500)
    await shot('task-scheduler-action-tools', actionDialog, { margin: 40 })
    await actionDialog.getByTestId('dialog-button-cancel').click()
    await editor.getByTestId('dialog-button-cancel').click()
  } catch (error) {
    // Keep a picture of every window, to see what the script was waiting for.
    for (const [i, w] of app.windows().entries()) await w.screenshot({ path: join(tmpdir(), `agentxp-docs-failure-${i}.png`) }).catch(() => undefined)
    console.error(`failure screenshots: ${join(tmpdir(), 'agentxp-docs-failure-*.png')}`)
    throw error
  } finally {
    await app.close().catch(() => undefined)
    await rm(userData, { recursive: true, force: true })
    await rm(parent, { recursive: true, force: true })
  }

  // Reduce the files: 256 colors keep a Windows XP screenshot sharp and small.
  const py = spawnSync(
    'python3',
    [
      '-c',
      'import sys\nfrom PIL import Image\nfor p in sys.argv[1:]:\n    im = Image.open(p).convert("RGB").quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)\n    im.save(p, optimize=True)\n'
    ].concat(written),
    { stdio: 'inherit' }
  )
  if (py.status !== 0) console.warn('PNG files were not reduced (python3 with Pillow is missing)')
  console.log(`docs screenshots written to ${out}`)
}

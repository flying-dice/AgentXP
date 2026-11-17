// Smoke test of the built app: `npx electron-vite build && xvfb-run -a node scripts/smoke.mjs`
import { mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { _electron: electron } = require('playwright')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fixture = join(root, 'src/main/infrastructure/acp/__fixtures__/fake-agent.ts')

const userData = await mkdtemp(join(tmpdir(), 'a7-smoke-data-'))
const workspace = await mkdtemp(join(tmpdir(), 'a7-smoke-ws-'))
const app = await electron.launch({
  executablePath: require('electron'),
  args: [join(root, 'out/main/index.js'), '--no-sandbox'],
  cwd: root,
  env: { ...process.env, AGENTXP_USER_DATA: userData }
})
try {
  const launcherPage = await app.firstWindow()
  await launcherPage.waitForFunction(() => Boolean(window.agentxp))
  if (!launcherPage.url().includes('launcher=1')) throw new Error(`first window is not the launcher: ${launcherPage.url()}`)

  // Create a desktop through the launcher API, plug the workspace in as E:, and run the fake agent on it.
  const result = await launcherPage.evaluate(
    async ({ workspace, fixture }) => {
      const api = window.agentxp
      const folder = await api.folders.add(workspace)
      const agent = await api.agents.create({
        name: 'Fake agent',
        command: 'node',
        args: ['--experimental-strip-types', '--no-warnings', fixture],
        env: {}
      })
      const desktop = await api.launcher.create({ title: 'Smoke desktop', folderIds: [folder.id] })
      const session = await api.sessions.create(desktop.id, agent.id, 'E:\\')
      // The fake agent writes a file and runs a command: tools follow apps, so open Code and Terminal first.
      await api.desktop.openWindow({ desktopId: desktop.id, app: 'code' })
      await api.desktop.openWindow({ desktopId: desktop.id, app: 'terminal' })
      const policy = await api.desktop.policy()
      await api.desktop.setPolicy({ ...policy, groups: { ...policy.groups, terminal: 'allow' } })
      const turn = api.sessions.prompt({ sessionId: session.id, text: 'Write the output file', attachments: [] })
      for (let i = 0; ; i++) {
        if (i > 200) throw new Error('no permission request')
        const entries = await api.sessions.transcript(session.id)
        const call = entries.find((e) => e.kind === 'tool_call' && e.permission?.outcome === 'pending')
        if (call) {
          await api.sessions.respondPermission(call.permission.id, 'allow')
          break
        }
        await new Promise((r) => setTimeout(r, 50))
      }
      await turn
      return {
        desktop,
        drives: await api.drives.list(desktop.id),
        computer: (await api.vfs.readDir(desktop.id, '')).map((e) => e.path),
        output: await api.vfs.readFile(desktop.id, 'E:\\fake-agent-output.txt').catch((e) => `ERR ${e.message}`),
        session: await api.sessions.get(session.id),
        transcript: await api.sessions.transcript(session.id),
        changes: await api.sessions.changes(session.id),
        terminals: await api.sessions.terminals(session.id)
      }
    },
    { workspace, fixture }
  )
  console.log(JSON.stringify({ drives: result.drives.map((d) => `${d.letter}:${d.label}`), computer: result.computer, session: result.session, changes: result.changes }, null, 2))
  const fail = (message) => {
    throw new Error(`smoke: ${message}`)
  }
  if (result.drives.map((d) => d.letter).join('') !== 'CE') fail('drives are not C: and E:')
  if (result.session.status !== 'idle' || result.session.cwd !== 'E:\\') fail('the chat did not finish on E:\\')
  if (!result.changes.some((c) => c.path === 'E:\\fake-agent-output.txt')) fail('the agent write was not recorded as a VPath change')
  if (result.output.startsWith('ERR')) fail(`E:\\fake-agent-output.txt unreadable: ${result.output}`)
  if (!result.terminals.some((t) => String(t.output).includes('terminal-says-hi'))) fail('terminal output missing')
  const desktopId = result.desktop.id

  // Connect: a desktop window opens next to the launcher.
  await launcherPage.evaluate((id) => window.agentxp.launcher.connect(id), desktopId)
  await waitFor(() => app.windows().length === 2, 'desktop window opened')
  const desktopPage = app.windows().find((w) => w.url().includes(`desktop=${desktopId}`)) ?? fail('no window for the desktop')
  await desktopPage.waitForFunction(() => Boolean(window.agentxp))
  const state = await desktopPage.evaluate(() => window.agentxp.desktop.current())
  console.log('desktop window:', JSON.stringify({ url: desktopPage.url().split('?')[1], drives: state?.drives.map((d) => d.letter), home: state?.home }))
  if (!state || state.drives.length !== 2 || state.home !== 'C:\\Users\\Agent') fail('desktop state has no drives/home')

  // Disconnect: the window goes away, the chat stays; a thumbnail is served to the launcher.
  await launcherPage.evaluate((id) => window.agentxp.launcher.disconnect(id), desktopId)
  await waitFor(() => app.windows().length === 1, 'desktop window closed')
  const afterDisconnect = await launcherPage.evaluate(async (id) => {
    const summary = (await window.agentxp.launcher.list()).find((d) => d.id === id)
    const thumb = summary?.thumbnailUrl ? await fetch(summary.thumbnailUrl).then((r) => ({ ok: r.ok, type: r.headers.get('content-type') })).catch((e) => ({ ok: false, type: String(e) })) : null
    return { summary, thumb, sessions: await window.agentxp.sessions.list(id) }
  }, desktopId)
  console.log('after disconnect:', JSON.stringify({ connected: afterDisconnect.summary?.connected, chats: afterDisconnect.summary?.chatCount, runState: afterDisconnect.summary?.runState, thumb: afterDisconnect.thumb }))
  if (afterDisconnect.summary?.connected !== false) fail('desktop still connected after disconnect')
  if (afterDisconnect.sessions.length !== 1 || afterDisconnect.sessions[0].id !== result.session.id) fail('the chat vanished on disconnect')
  if (!afterDisconnect.summary?.thumbnailUrl) fail('no thumbnail after disconnect')
  else if (!afterDisconnect.thumb?.ok) console.warn('warning: thumbnail not loadable from the launcher page (CSP img-src agentxp-thumb: needed?)', afterDisconnect.thumb)

  // Reconnect: same chat, same files.
  await launcherPage.evaluate((id) => window.agentxp.launcher.connect(id), desktopId)
  await waitFor(() => app.windows().length === 2, 'desktop window reopened')
  const again = app.windows().find((w) => w.url().includes(`desktop=${desktopId}`)) ?? fail('no window after reconnect')
  await again.waitForFunction(() => Boolean(window.agentxp))
  const reconnected = await again.evaluate(async (sessionId) => ({ session: await window.agentxp.sessions.get(sessionId), state: await window.agentxp.desktop.current() }), result.session.id)
  console.log('reconnected:', JSON.stringify({ session: reconnected.session.title, status: reconnected.session.status, windows: reconnected.state.windows.length }))
  if (reconnected.session.id !== result.session.id || reconnected.session.status !== 'idle') fail('the chat did not survive the reconnect')
  if (!reconnected.state.windows.some((w) => w.view.app === 'code') || !reconnected.state.windows.some((w) => w.view.app === 'terminal')) fail('Code/Terminal windows did not survive the reconnect')
  console.log('smoke ok')
} finally {
  await app.close()
  await rm(userData, { recursive: true, force: true })
  await rm(workspace, { recursive: true, force: true })
}

async function waitFor(condition, what, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs
  while (!condition()) {
    if (Date.now() > deadline) throw new Error(`smoke: timed out waiting for ${what}`)
    await new Promise((r) => setTimeout(r, 100))
  }
}

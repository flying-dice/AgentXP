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
  env: { ...process.env, AGENT7_USER_DATA: userData }
})
try {
  const page = await app.firstWindow()
  await page.waitForFunction(() => Boolean(window.agent7))
  const result = await page.evaluate(
    async ({ workspace, fixture }) => {
      const api = window.agent7
      const folder = await api.folders.add(workspace)
      const agent = await api.agents.create({
        name: 'Fake agent',
        command: 'node',
        args: ['--experimental-strip-types', '--no-warnings', fixture],
        env: {}
      })
      const session = await api.sessions.create(folder.id, agent.id)
      // The fake agent writes a file and runs a command: tools follow apps, so open Code and Terminal first.
      await api.desktop.openWindow({ desktopId: session.desktopId, app: 'code' })
      await api.desktop.openWindow({ desktopId: session.desktopId, app: 'terminal' })
      const policy = await api.desktop.policy()
      await api.desktop.setPolicy({ ...policy, groups: { ...policy.groups, terminal: 'allow' } })
      const turn = api.sessions.prompt({ sessionId: session.id, text: 'Write the output file', attachments: [] })
      const answer = async () => {
        for (let i = 0; i < 200; i++) {
          const entries = await api.sessions.transcript(session.id)
          const call = entries.find((e) => e.kind === 'tool_call' && e.permission?.outcome === 'pending')
          if (call) return api.sessions.respondPermission(call.permission.id, 'allow')
          await new Promise((r) => setTimeout(r, 50))
        }
        throw new Error('no permission request')
      }
      await answer()
      await turn
      return {
        firstRun: { current: await api.desktop.current(), desktops: await api.desktop.list() },
        session: await api.sessions.get(session.id),
        transcript: await api.sessions.transcript(session.id),
        tasks: await api.sessions.tasks(session.id),
        changes: await api.sessions.changes(session.id),
        terminals: await api.sessions.terminals(session.id)
      }
    },
    { workspace, fixture }
  )
  console.log(JSON.stringify(result, null, 2))

  // First run -> create a desktop: the blank window becomes that desktop's window (`?desktop=<id>`).
  const created = page.evaluate((folderId) => window.agent7.desktop.create(folderId), result.session.folderId).catch(() => null)
  await page.waitForURL(/[?&]desktop=\d+/, { timeout: 15_000 })
  await page.waitForFunction(() => Boolean(window.agent7))
  const state = await page.evaluate(() => window.agent7.desktop.current())
  await created
  console.log('desktop window:', JSON.stringify({ windows: app.windows().length, url: page.url().split('?')[1], tools: state?.tools, folder: state?.folder.path }))
  if (app.windows().length !== 1 || !state || state.folder.path !== workspace) throw new Error('desktop.create did not open the desktop in the first-run window')
} finally {
  await app.close()
  await rm(userData, { recursive: true, force: true })
  await rm(workspace, { recursive: true, force: true })
}

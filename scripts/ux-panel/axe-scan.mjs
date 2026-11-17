#!/usr/bin/env node
// WCAG 2.2 AA scan with axe-core (a devDependency) of the BUILT app: the launcher, the desktop with each app open and the
// main dialogs. One app instance. Usage: xvfb-run -a node scripts/ux-panel/axe-scan.mjs [--out docs/ux/evidence/expert/axe.json]
// Test tooling only (setup through window.agentxp like the panel presets).
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { launchApp, makeContext, repoRoot, sleep } from './lib/context.mjs'
import { createDocsSite, createLoginApp, createPlainFolder } from './lib/fixtures.mjs'
import { createReviewNotes } from './presets/features.mjs'

const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const outIndex = process.argv.indexOf('--out')
const outFile = resolve(repoRoot, outIndex > 0 ? process.argv[outIndex + 1] : 'docs/ux/evidence/expert/axe.json')

const tmp = mkdtempSync(join(tmpdir(), 'a7axe-'))
const base = join(tmp, 'fixtures')
mkdirSync(base, { recursive: true })
const fixtures = { base, loginApp: createLoginApp(base), docsSite: createDocsSite(base), plain: createPlainFolder(base), loginAppGit: () => createLoginApp(join(tmp, 'g'), { git: true }) }
fixtures.reviewNotes = createReviewNotes(base)
const userData = join(tmp, 'user-data')
mkdirSync(userData)
const state = { sockDir: tmp, task: 'axe' }
const sessionDir = join(tmp, 'session')
mkdirSync(sessionDir)
const app = await launchApp({ userData })
const ctx = makeContext({ app, userData, sessionDir, fixtures, state })

const results = []
async function scan(page, name, selector) {
  await page.evaluate(axeSource)
  const run = await page.evaluate(
    async ({ selector }) =>
      // eslint-disable-next-line no-undef
      axe.run(selector ? { include: [selector] } : document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] }),
    { selector }
  )
  const violations = run.violations.map((v) => ({ rule: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 160), why: (n.any[0] ?? n.all[0] ?? n.none[0])?.message?.slice(0, 200) })) }))
  results.push({ state: name, violations })
  console.log(`${name}: ${violations.length ? violations.map((v) => `${v.rule}(${v.nodes})`).join(' ') : 'no violations'}`)
}
const safe = async (name, fn) => {
  try {
    await fn()
  } catch (e) {
    results.push({ state: name, error: String(e.message ?? e).split('\n')[0] })
    console.log(`${name}: ERROR ${String(e.message ?? e).split('\n')[0]}`)
  }
}

// ---- launcher
const launcher = await ctx.launcher()
await sleep(800)
await safe('launcher (empty)', () => scan(launcher, 'launcher (empty)'))
await safe('launcher: New desktop dialog', async () => {
  await launcher.getByTestId('launcher-new').click()
  await launcher.getByTestId('new-desktop-dialog').waitFor()
  await scan(launcher, 'launcher: New desktop dialog')
  await launcher.keyboard.press('Escape')
})

// ---- desktop
const agent = await ctx.useScript('fix-redirect')
await ctx.setPolicy({ 'fs.write': 'ask', terminal: 'ask' })
const desktop = await ctx.createDesktop({ title: 'Axe desktop', projects: [fixtures.loginApp, fixtures.reviewNotes], agentId: agent.id })
await sleep(800)
await safe('launcher (one desktop)', () => scan(launcher, 'launcher (one desktop)'))
const page = desktop.page
await safe('desktop (welcome / empty)', () => scan(page, 'desktop (empty)'))
await ctx.dismissDialogs(desktop.id)
const KINDS = ['explorer', 'notepad', 'wordpad', 'code', 'terminal', 'browser', 'paint', 'sticky-notes', 'event-viewer', 'snipping-tool', 'recycle-bin', 'agent-manager', 'control-centre', 'help']
for (const kind of KINDS) {
  await safe(`app: ${kind}`, async () => {
    const win = await ctx.openApp(desktop.id, kind, kind === 'browser' ? { url: 'about:blank' } : {})
    await page.getByTestId(`window-${kind}`).waitFor()
    await sleep(900)
    await scan(page, `app: ${kind}`)
    await page.evaluate((id) => window.agentxp.desktop.closeWindow(id), win.id)
    await sleep(200)
  })
}
const chat = await ctx.newChat(desktop.id)
await safe('app: chat', async () => {
  await sleep(800)
  await scan(page, 'app: chat')
})
await safe('Start menu', async () => {
  await page.getByTestId('taskbar-start').click()
  await page.getByTestId('start-menu').waitFor()
  await scan(page, 'Start menu')
  await page.keyboard.press('Escape')
})
await safe('Action Center flyout', async () => {
  await page.getByTestId('action-center-flag').click()
  await page.getByTestId('action-center').waitFor()
  await scan(page, 'Action Center flyout')
  await page.keyboard.press('Escape')
})
await safe('Notepad About dialog', async () => {
  const win = await ctx.openApp(desktop.id, 'notepad')
  await page.getByTestId('window-notepad').getByTestId('window-title').click()
  await page.keyboard.press('Alt+h')
  await page.keyboard.press('a')
  await page.getByTestId('notepad-about').waitFor({ timeout: 5000 })
  await scan(page, 'Notepad About dialog')
  await page.keyboard.press('Escape')
  await sleep(200)
  await page.evaluate((id) => window.agentxp.desktop.closeWindow(id), win.id)
})
await safe('Notepad context menu', async () => {
  const win = await ctx.openApp(desktop.id, 'notepad')
  await page.getByTestId('window-notepad').getByTestId('notepad-text').first().click({ button: 'right' })
  await sleep(300)
  await scan(page, 'Notepad context menu')
  await page.keyboard.press('Escape')
  await page.evaluate((id) => window.agentxp.desktop.closeWindow(id), win.id)
})
await safe('Code with chat pane open', async () => {
  const win = await ctx.openApp(desktop.id, 'code', { path: 'E:\\src\\auth\\redirect.ts' })
  await page.getByTestId('window-code').getByTestId('code-line').first().waitFor()
  await page.getByTestId('window-code').getByTestId('chat-pane-toggle').click()
  await sleep(800)
  await scan(page, 'Code with chat pane open')
  await page.evaluate((id) => window.agentxp.desktop.closeWindow(id), win.id)
})
await safe('Code Review (outline, comments)', async () => {
  const win = await page.evaluate((id) => window.agentxp.desktop.openReview(id, 'F:\\'), desktop.id)
  await page.getByTestId('code-review-app').waitFor()
  await sleep(2500)
  await scan(page, 'Code Review (outline)')
  await page.getByTestId('review-file').first().click().catch(() => undefined)
  await sleep(600)
  await scan(page, 'Code Review (diff)')
  void win
})
await safe('UAC dialog', async () => {
  // H-45: a fresh chat on the fix-redirect script raises a write request (Write files = Ask); wait for the dialog itself.
  await ctx.setPolicy({ 'fs.write': 'ask' })
  const pending = await ctx.newChat(desktop.id)
  await ctx.sendPrompt(desktop.id, pending.sessionId, 'Fix the login redirect bug so that deep links survive sign-in')
  await ctx.waitPending(pending.sessionId)
  // the dialog no longer opens by itself; the bar says "needs your approval" and its link opens the next request (like a user).
  const link = page.getByTestId('topbar-waiting-link')
  if (await link.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false)) await link.click()
  await page.getByTestId('uac-dialog').waitFor({ state: 'visible', timeout: 20_000 })
  await sleep(500)
  await scan(page, 'UAC dialog')
  await page.getByTestId('uac-not-now').click().catch(() => page.keyboard.press('Escape'))
  await sleep(500)
  await scan(page, 'Chat with a pending request')
})
mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, JSON.stringify({ axe: '4.14.0', tags: 'wcag2a wcag2aa wcag21a wcag21aa wcag22aa', states: results }, null, 2))
console.log(`written ${outFile}`)
await app.close().catch(() => undefined)
process.exit(0)

// Start states for the features added after the sprint plan: Code Review, the chat pane, the Browser with web apps.
// Journeys J25 to J31 in docs/ux/journeys.md, tasks T25.x to T31.x in docs/ux/tasks.md.
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { repoRoot } from '../lib/context.mjs'
import { projectDesktop } from './base.mjs'

export const WEB_APP_PORT = 4174
export const WEB_APP_URL = `http://127.0.0.1:${WEB_APP_PORT}/`
const HEAD = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', ''].join('\n')
const WORKING = ['zero', 'one', 'two', 'THREE', 'four', 'five', 'six', 'eight', ''].join('\n')
const INDEX_TS = ['export const answer = 42', 'export const question = "what is it?"', 'export function life(): number {', '  return answer', '}', ''].join('\n')

const put = (root, files) => {
  mkdirSync(root, { recursive: true })
  for (const [rel, text] of Object.entries(files)) writeFileSync(join(root, rel), text)
}

/** `review-notes`: a Git project (notes.txt changed, fresh.txt new, keep.txt untouched), the fixture of e2e/code-review.e2e.ts. */
export function createReviewNotes(base) {
  const root = join(base, 'review-notes')
  put(root, { 'notes.txt': HEAD, 'keep.txt': 'unchanged\n' })
  const run = (...args) => execFileSync('git', ['-C', root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', ...args], { stdio: 'ignore' })
  run('init', '-q', '-b', 'main')
  run('add', '-A')
  run('commit', '-q', '-m', 'initial')
  put(root, { 'notes.txt': WORKING, 'fresh.txt': 'brand new\n' })
  return root
}

export const createAsideProject = (base) => {
  const root = join(base, 'aside-project')
  put(root, { 'index.ts': INDEX_TS, 'README.md': '# aside-project\n\nA tiny project.\n' })
  return root
}

/** Serves e2e/fixtures/web/chat-app.html (a team chat web app, no network) on a fixed port. One server per process. */
let webApp = null
export function serveWebApp() {
  if (webApp) return webApp
  const html = readFileSync(join(repoRoot, 'e2e/fixtures/web/chat-app.html'))
  webApp = createServer((_req, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(html))
  webApp.on('error', () => undefined) // another session already serves it
  webApp.listen(WEB_APP_PORT, '127.0.0.1')
  return webApp
}

const driveLetter = async (ctx, desktopId) => {
  const drive = (await ctx.drives(desktopId)).find((d) => d.kind === 'removable')
  return drive ? `${drive.letter}:\\` : 'C:\\'
}

async function reviewDesktop(ctx, options) {
  ctx.fixtures.reviewNotes = createReviewNotes(ctx.fixtures.base)
  const { desktop } = await projectDesktop(ctx, { script: options.script ?? 'review', projects: ['reviewNotes'], open: [] })
  const chat = await ctx.newChat(desktop.id)
  const window = await desktop.page.evaluate(({ id, root }) => window.agent7.desktop.openReview(id, root), { id: desktop.id, root: await driveLetter(ctx, desktop.id) })
  const reviewSessionId = window.view.sessionId
  // Code Review starts no agent by itself (UX-37): press "Ask the agent to review..." like a user would.
  const ask = desktop.page.getByTestId('window-code-review').getByTestId('review-ask-agent')
  await ask.waitFor({ timeout: 30_000 })
  await ctx.waitFor(async () => !(await ask.isDisabled()), 'the reviewer to connect', 30_000)
  await ask.click()
  await ctx.dismissDialogs(desktop.id)
  await ctx.waitFor(async () => {
    const state = await desktop.page.evaluate((id) => window.agent7.review.state(id), reviewSessionId)
    return state.summary && state.comments.length >= 2
  }, 'the reviewer comments', 40_000)
  await ctx.dismissDialogs(desktop.id)
  Object.assign(ctx.state, { sessionId: chat.sessionId, reviewSessionId, reviewWindowId: window.id })
  ctx.saveState()
  return desktop
}

/** T25.3 (H-115): the Code Review window is open but nobody has reviewed yet; the chat is the IDE chat and its agent is `chat-review`. */
async function chatReviewDesktop(ctx) {
  ctx.fixtures.reviewNotes = createReviewNotes(ctx.fixtures.base)
  const { desktop } = await projectDesktop(ctx, { script: 'chat-review', projects: ['reviewNotes'], open: [] })
  const chat = await ctx.newChat(desktop.id)
  const window = await desktop.page.evaluate(({ id, root }) => window.agent7.desktop.openReview(id, root), { id: desktop.id, root: await driveLetter(ctx, desktop.id) })
  await desktop.page.getByTestId('window-code-review').getByTestId('review-ask-agent').waitFor({ timeout: 30_000 })
  await ctx.dismissDialogs(desktop.id)
  Object.assign(ctx.state, { sessionId: chat.sessionId, chatWindowId: chat.windowId, reviewSessionId: window.view.sessionId, reviewWindowId: window.id })
  ctx.saveState()
  return desktop
}

async function asideDesktop(ctx, options) {
  ctx.fixtures.asideProject = createAsideProject(ctx.fixtures.base)
  const { desktop } = await projectDesktop(ctx, { script: 'aside', projects: ['asideProject'], open: [] })
  const drive = await driveLetter(ctx, desktop.id)
  const code = await ctx.openApp(desktop.id, 'code', { path: `${drive}index.ts` })
  const frame = desktop.page.getByTestId('window-code')
  await frame.getByTestId('code-line').first().waitFor()
  if (options.paneOpen) await frame.getByTestId('chat-pane-toggle').click()
  Object.assign(ctx.state, { codeWindowId: code?.id ?? null })
  ctx.saveState()
  return desktop
}

async function webAppDesktop(ctx, script) {
  serveWebApp()
  const { desktop } = await projectDesktop(ctx, { script, open: ['browser'] })
  const chat = await ctx.newChat(desktop.id)
  Object.assign(ctx.state, { sessionId: chat.sessionId, webAppUrl: WEB_APP_URL })
  ctx.saveState()
  return { desktop, chat }
}

export const presets = {
  /** J25, J26: the reviewer (review.json) left two comments and "Changes requested" on review-notes; a chat is open too. */
  async 'review-ready'(ctx, options) {
    await reviewDesktop(ctx, options)
    return 'Code Review open with two reviewer comments; a chat is open'
  },

  /** J25 (T25.3): a chat (the IDE chat, agent chat-review) and an empty Code Review window; the chat is asked to do the review. */
  async 'review-chat'(ctx) {
    await chatReviewDesktop(ctx)
    return 'Code Review open without remarks; the chat reviews when asked'
  },

  /** J27: the Code window shows index.ts with the chat pane collapsed (option paneOpen: expanded). Agent: aside.json. */
  async 'aside-code'(ctx, options) {
    await asideDesktop(ctx, options)
    return options.paneOpen ? 'Code with index.ts, chat pane open' : 'Code with index.ts, chat pane collapsed'
  },

  /** J28: a Browser window and an idle chat; the agent is browser-agent.json (the prompt must say "chat app at <url>"). */
  async 'web-app-ready'(ctx) {
    await webAppDesktop(ctx, 'browser-agent')
    return `team chat web app at ${WEB_APP_URL}`
  },

  /** J28: the agent is already working in the Browser (about a minute) and the activity bar shows. */
  async 'web-app-busy'(ctx) {
    const { desktop, chat } = await webAppDesktop(ctx, 'browser-slow')
    await ctx.sendPrompt(desktop.id, chat.sessionId, `Use the chat app at ${WEB_APP_URL}`)
    await desktop.page.getByTestId('browser-agent-bar').waitFor({ timeout: 30_000 })
    return 'the agent is working in the Browser'
  }
}

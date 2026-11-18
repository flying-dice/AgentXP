// Start states for agent presence (docs/AGENT_PRESENCE.md): Show (J32), notices of agent output (J33) and Follow (J34).
// Tasks T32.1 to T34.1 in docs/ux/tasks.md. Scripts in scripts/ux-panel/scripts.
import { projectDesktop } from './base.mjs'
import { createReviewNotes } from './features.mjs'

export const PROMPT_WHERE = 'Where is the login redirect checked?'
export const PROMPT_TIDY = 'Please tidy the notes'
export const PROMPT_DRAW = 'Please draw the login flow'
export const PROMPT_BUG = 'Please work on the login redirect bug'
/** How often the T34.1 recorder reads the desktop (ms). */
export const FOLLOW_LOG_MS = 500

const driveLetter = async (ctx, desktopId) => {
  const drive = (await ctx.drives(desktopId)).find((d) => d.kind === 'removable')
  return drive ? `${drive.letter}:\\` : 'C:\\'
}

const focus = (page, windowId) => page.evaluate((id) => window.agentxp.desktop.focusWindow(id), windowId)

/** Opens Code Review on the drive with the given reviewer and presses "Ask the agent to review..." like a user. */
async function startReview(ctx, desktop, agentId) {
  const root = await driveLetter(ctx, desktop.id)
  const win = await desktop.page.evaluate(({ id, root, agentId }) => window.agentxp.desktop.openReview(id, root, undefined, agentId), { id: desktop.id, root, agentId })
  const ask = desktop.page.getByTestId('window-code-review').getByTestId('review-ask-agent')
  await ask.waitFor({ timeout: 30_000 })
  await ctx.waitFor(async () => !(await ask.isDisabled()), 'the reviewer to connect', 30_000)
  await ask.click()
  return win
}

/** Closes every balloon on screen (they have "timed out"); the Action Center keeps them. */
async function closeBalloons(ctx, page) {
  const close = page.getByTestId('balloon-close')
  for (let i = 0; i < 10; i++) {
    if (!(await close.isVisible().catch(() => false))) {
      await ctx.sleep(1500)
      if (!(await close.isVisible().catch(() => false))) return
    }
    await close.click().catch(() => undefined)
    await ctx.sleep(300)
  }
}

/**
 * T34.1: a recorder in the desktop page. Every FOLLOW_LOG_MS it notes who is followed, what Code shows and whether the
 * chat still works, when one of them changes (`window.__uxFollowLog`). The checker reads it after the session.
 */
async function installFollowRecorder(page, desktopId, sessionId) {
  await page.evaluate(
    ({ desktopId, sessionId, every }) => {
      const log = (window.__uxFollowLog = [])
      let last = ''
      const read = async () => {
        const state = await window.agentxp.desktop.current()
        const sessions = await window.agentxp.sessions.list(desktopId)
        const code = state?.windows.find((w) => w.app === 'code' && w.windowState !== 'minimized')
        const lines = code?.view?.visibleLines
        const entry = {
          following: state?.following?.sessionId ?? null,
          code: code ? `${code.view.activePath ?? ''}:${lines ? lines.join('-') : ''}` : null,
          running: sessions.find((s) => s.id === sessionId)?.status !== 'idle'
        }
        const key = JSON.stringify(entry)
        if (key !== last) log.push({ ...entry, at: Date.now() })
        last = key
      }
      setInterval(() => void read().catch(() => undefined), every)
      void read()
    },
    { desktopId, sessionId, every: FOLLOW_LOG_MS }
  )
}

export const presets = {
  /** T32.1: the foreground chat (agent "Builder", show-file.json) answered and shows redirect.ts lines 2-4 with a note. */
  async 'show-foreground'(ctx) {
    const { desktop } = await projectDesktop(ctx, { script: 'show-file', agentName: 'Builder', open: [] })
    await closeBalloons(ctx, desktop.page)
    const chat = await ctx.newChat(desktop.id)
    await ctx.sendPrompt(desktop.id, chat.sessionId, PROMPT_WHERE)
    await desktop.page.getByTestId('show-callout').waitFor({ timeout: 30_000 })
    await ctx.waitIdle(chat.sessionId)
    Object.assign(ctx.state, { sessionId: chat.sessionId, chatWindowId: chat.windowId, prompt: PROMPT_WHERE })
    ctx.saveState()
    return 'the chat shows you redirect.ts lines 2-4 with a note'
  },

  /** T32.2: the reviewer ("Reviewer", show-request.json) shows its comment while the operator is in Code: a show request. */
  async 'show-request'(ctx) {
    ctx.fixtures.reviewNotes = createReviewNotes(ctx.fixtures.base)
    const { desktop, agent } = await projectDesktop(ctx, { script: 'show-request', agentName: 'Reviewer', projects: ['reviewNotes'], open: [] })
    // The welcome balloons of a new desktop would hide the request behind them ("2 more").
    await closeBalloons(ctx, desktop.page)
    const drive = await driveLetter(ctx, desktop.id)
    const code = await ctx.openApp(desktop.id, 'code', { path: `${drive}notes.txt` })
    const review = await startReview(ctx, desktop, agent.id)
    await ctx.dismissDialogs(desktop.id)
    // The operator reads code: Code has the focus, so the reviewer is in the background when it shows.
    await focus(desktop.page, code.id)
    const reviewSessionId = review.view.sessionId
    await ctx.waitFor(async () => (await ctx.transcript(reviewSessionId)).some((e) => e.kind === 'message' && e.role === 'agent' && /Sent as a request/.test((e.blocks ?? []).map((b) => b.text ?? '').join(''))), 'the show request', 40_000)
    const comments = (await desktop.page.evaluate((id) => window.agentxp.review.state(id), reviewSessionId)).comments
    const shown = comments.find((c) => c.line === 4) ?? comments.at(-1)
    const codeView = (await ctx.desktopState(desktop.id)).windows.find((w) => w.id === code.id)?.view ?? null
    Object.assign(ctx.state, { reviewSessionId, reviewWindowId: review.id, codeWindowId: code.id, commentId: shown?.id ?? null, codeViewAtStart: codeView })
    ctx.saveState()
    return 'the reviewer asked to show you a comment (balloon with Show and Not now); Code has the focus'
  },

  /** T33.1: Builder (chat) changed a file and ran a command, Reviewer left two comments; the operator was in Notepad; balloons closed. */
  async 'missed-output'(ctx) {
    ctx.fixtures.reviewNotes = createReviewNotes(ctx.fixtures.base)
    const { desktop } = await projectDesktop(ctx, { script: 'two-agent-output', agentName: 'Builder', projects: ['reviewNotes'], open: [], policy: { 'fs.write': 'allow', terminal: 'allow' } })
    await closeBalloons(ctx, desktop.page)
    const reviewer = await ctx.useScript('two-agent-output', { makeDefault: false, name: 'Reviewer' })
    const chat = await ctx.newChat(desktop.id)
    await ctx.sendPrompt(desktop.id, chat.sessionId, PROMPT_TIDY)
    const review = await startReview(ctx, desktop, reviewer.id)
    const notepad = await ctx.openApp(desktop.id, 'notepad')
    await focus(desktop.page, notepad.id)
    const reviewSessionId = review.view.sessionId
    await ctx.waitIdle(chat.sessionId)
    await ctx.waitFor(async () => (await desktop.page.evaluate((id) => window.agentxp.review.state(id), reviewSessionId)).comments.length >= 2, 'the reviewer comments', 40_000)
    await ctx.dismissDialogs(desktop.id)
    await desktop.page.getByTestId('balloon').first().waitFor({ timeout: 15_000 })
    await closeBalloons(ctx, desktop.page)
    const comments = (await desktop.page.evaluate((id) => window.agentxp.review.state(id), reviewSessionId)).comments
    const firstCommentId = Math.min(...comments.map((c) => c.id))
    Object.assign(ctx.state, { sessionId: chat.sessionId, reviewSessionId, reviewWindowId: review.id, notepadWindowId: notepad.id, firstCommentId })
    ctx.saveState()
    return 'Builder and Reviewer finished while Notepad had the focus; their balloons are closed (the Action Center keeps them)'
  },

  /** T33.2: Notepad has the focus; the chat (diagram-output.json) starts drawing in the Agent Diagrams window behind it in 15 s. */
  async 'diagram-behind'(ctx) {
    const { desktop } = await projectDesktop(ctx, { script: 'diagram-output', agentName: 'Builder', open: ['diagrams'] })
    await closeBalloons(ctx, desktop.page)
    const chat = await ctx.newChat(desktop.id)
    await ctx.sendPrompt(desktop.id, chat.sessionId, PROMPT_DRAW)
    const notepad = await ctx.openApp(desktop.id, 'notepad')
    await focus(desktop.page, notepad.id)
    const diagrams = (await ctx.desktopState(desktop.id)).windows.find((w) => w.app === 'diagrams')
    Object.assign(ctx.state, { sessionId: chat.sessionId, notepadWindowId: notepad.id, diagramsWindowId: diagrams?.id ?? null })
    ctx.saveState()
    return 'Notepad has the focus; the assistant draws in Agent Diagrams behind it in about 15 seconds'
  },

  /** T34.1: the chat of "Builder" (builder-steps.json) reads files for about three minutes; Code is closed; a recorder notes Follow. */
  async 'builder-working'(ctx) {
    const { desktop } = await projectDesktop(ctx, { script: 'builder-steps', agentName: 'Builder', open: [] })
    const chat = await ctx.newChat(desktop.id)
    await ctx.sendPrompt(desktop.id, chat.sessionId, PROMPT_BUG)
    await ctx.waitFor(async () => (await ctx.transcript(chat.sessionId)).some((e) => e.kind === 'tool_call'), 'the first step', 30_000)
    await installFollowRecorder(desktop.page, desktop.id, chat.sessionId)
    Object.assign(ctx.state, { sessionId: chat.sessionId, chatWindowId: chat.windowId })
    ctx.saveState()
    return 'Builder is working in its chat (about three minutes of reading); Code is closed'
  }
}

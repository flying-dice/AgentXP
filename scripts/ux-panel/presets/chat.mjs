// Start states with chats: open chat, pending requests, running turns, changes, recycled changes.
import { lastProgress } from '../checks/util.mjs'
import { ALL_ALLOW, PROMPT_FIX, chatWithPendingRequest, projectDesktop } from './base.mjs'

const idleChat = async (ctx, options, extra = {}) => {
  const { desktop, agent } = await projectDesktop(ctx, { ...options, ...extra })
  const chat = await ctx.newChat(desktop.id)
  Object.assign(ctx.state, { sessionId: chat.sessionId, chatWindowId: chat.windowId })
  ctx.saveState()
  return { desktop, agent, chat }
}

export const presets = {
  /** A connected desktop with an open, idle chat on login-app. Options: script, allowAll, policy, firstMessage (sent first, so a flaky agent's error is on screen). */
  async 'chat-open'(ctx, options) {
    const { firstMessage, ...rest } = options
    const { desktop } = await idleChat(ctx, rest)
    if (firstMessage) {
      // The error of a flaky agent must be on screen at the start: the first send fails (with the text kept for a retry).
      await ctx.sendPrompt(desktop.id, ctx.state.sessionId, firstMessage)
      await ctx.sleep(3000) // the failed send ends the turn; the chat may report an error status rather than idle
      ctx.state.firstMessage = firstMessage
      ctx.saveState()
    }
  },

  /** The chat asked for a permission; the box is on screen. Options: script (default fix-redirect), policy, prompt. */
  async 'pending-approval'(ctx, options) {
    const { desktop } = await projectDesktop(ctx, { script: 'fix-redirect', ...options })
    const chat = await chatWithPendingRequest(ctx, desktop.id, options.prompt ?? PROMPT_FIX)
    Object.assign(ctx.state, { sessionId: chat.sessionId })
    ctx.saveState()
  },

  /** Two chats, each with one pending write request; the dialogs were dismissed with Not now. */
  async 'two-chats-pending'(ctx) {
    const { desktop } = await projectDesktop(ctx, { script: 'fix-redirect' })
    const first = await chatWithPendingRequest(ctx, desktop.id, PROMPT_FIX)
    await ctx.dismissDialogs(desktop.id)
    const second = await ctx.newChat(desktop.id)
    await ctx.sendPrompt(desktop.id, second.sessionId, PROMPT_FIX)
    await ctx.waitPending(second.sessionId)
    await ctx.dismissDialogs(desktop.id)
    ctx.state.sessionIds = [first.sessionId, second.sessionId]
    ctx.saveState()
  },

  /** `stepping` script (manual), turn running and paused with a tool card in progress. */
  async 'agent-running'(ctx) {
    const { desktop, agent } = await idleChat(ctx, { script: 'stepping', stepMode: 'manual' })
    await ctx.sendPrompt(desktop.id, ctx.state.sessionId, 'start the long job')
    const control = await agent.control()
    await control.waitForPause()
    for (let i = 0; i < 4; i++) {
      await control.next()
      await control.waitForPause()
    }
    ctx.state.controlSocket = agent.socket
    ctx.saveState()
  },

  /** A paused desktop whose turn ended cancelled. The agent runs freely afterwards (auto) so a new turn can finish. */
  async 'paused-desktop'(ctx) {
    await presets['agent-running'](ctx)
    const { desktopId, sessionId } = ctx.state
    const page = await ctx.desktopPage(desktopId)
    await page.evaluate((id) => window.agent7.desktop.setPaused(id, true), desktopId)
    await page.evaluate((id) => window.agent7.sessions.cancel(id), sessionId).catch(() => undefined)
    await ctx.waitIdle(sessionId)
    await (await ctx.agents.get(ctx.state.agentId).control()).setMode('auto')
    ctx.state.outcomesAtStart = (await ctx.runOutcomes(desktopId, sessionId)).length
    ctx.saveState()
  },

  /** A chat with two agent file changes: login.ts and redirect.ts (script two-edits, or five-edits with option script). */
  async 'changes-to-review'(ctx, options) {
    const { desktop } = await idleChat(ctx, { script: options.script ?? 'two-edits', git: options.git, policy: { 'fs.write': 'allow' } })
    await ctx.sendPrompt(desktop.id, ctx.state.sessionId, 'Update the sign-in code')
    await ctx.waitAgentMessages(ctx.state.sessionId, 1)
    await ctx.waitIdle(ctx.state.sessionId)
    const changes = await ctx.changes(ctx.state.sessionId)
    ctx.state.changeCount = changes.length
    if (changes.length < 2) throw new Error(`expected agent changes, found ${changes.length}`)
    ctx.saveState()
    await ctx.setPolicy({ 'fs.write': 'ask' })
  },

  /** One recycled change for redirect.ts (the user reverted it). */
  async 'recycled-change'(ctx) {
    await presets['changes-to-review'](ctx, {})
    const changes = await ctx.changes(ctx.state.sessionId)
    const redirect = changes.find((c) => c.path.endsWith('redirect.ts'))
    ctx.state.redirectAgentText = redirect.currentText
    await ctx.eval((id) => window.agent7.sessions.revertChange(id), redirect.id)
    await ctx.waitFor(async () => (await ctx.recycled(ctx.state.desktopId)).length === 1, 'one recycled change')
    ctx.saveState()
  },

  /** Crash: a turn is stuck in the `errors` script ("slow"), then the agent process is killed. */
  async 'crashed-agent'(ctx) {
    const { desktop } = await idleChat(ctx, { script: 'errors' })
    await ctx.sendPrompt(desktop.id, ctx.state.sessionId, 'please do the slow job')
    const proc = await ctx.waitFor(async () => (await ctx.processes()).find((p) => p.pid), 'the agent process')
    await ctx.sleep(1500)
    process.kill(proc.pid, 'SIGKILL')
    await ctx.sleep(1500)
    ctx.state.crashedPid = proc.pid
    ctx.saveState()
  },

  /** A turn that keeps running for minutes (auto): used for leave-it-running and stuck-agent tasks. */
  async 'long-turn-running'(ctx) {
    const { desktop } = await idleChat(ctx, { script: 'long-turn' })
    await ctx.sendPrompt(desktop.id, ctx.state.sessionId, 'start the long job')
    await ctx.waitFor(async () => (await ctx.launcherList()).find((d) => d.id === desktop.id)?.runState === 'working', 'the turn running')
    const entries = await ctx.transcript(ctx.state.sessionId)
    ctx.state.messagesAtStart = entries.length
    ctx.state.progressAtStart = lastProgress(entries)
    ctx.state.toolCallsAtStart = entries.filter((e) => e.kind === 'tool_call').length
    ctx.saveState()
  },

  /** A disconnected desktop with a pending request (the launcher row says it needs approval). */
  async 'disconnected-pending'(ctx) {
    const { desktop } = await projectDesktop(ctx, { script: 'fix-redirect' })
    const chat = await chatWithPendingRequest(ctx, desktop.id, PROMPT_FIX)
    await ctx.dismissDialogs(desktop.id)
    await ctx.eval((id) => window.agent7.launcher.disconnect(id), desktop.id)
    await ctx.waitFor(async () => !(await ctx.desktopState(desktop.id)), 'the desktop window closed')
    ctx.state.sessionId = chat.sessionId
    ctx.saveState()
  },

  /** A project drive is ejected while the turn runs (eject-victim script), so the agent's read is refused. */
  async 'eject-mid-job'(ctx, options) {
    const { desktop, agent } = await idleChat(ctx, { script: 'eject-victim', stepMode: 'manual', allowAll: true })
    await ctx.sendPrompt(desktop.id, ctx.state.sessionId, 'Check the README of login-app and summarise it')
    const control = await agent.control()
    await control.waitForPause()
    const drive = (await ctx.drives(desktop.id)).find((d) => d.kind === 'removable')
    ctx.state.ejectedFolderId = drive.folderId
    ctx.state.ejectedLetter = drive.letter
    await ctx.eval(({ id, letter }) => window.agent7.drives.eject(id, letter), { id: desktop.id, letter: drive.letter })
    await control.setMode('auto')
    await ctx.waitIdle(ctx.state.sessionId)
    ctx.state.keepEjected = Boolean(options.keepEjected)
    ctx.saveState()
  },

  /** Control Center closed, all permissions Allow except Write files = Ask; no chat (the panelist opens one by keyboard). Mouse disabled. */
  async 'keyboard-only'(ctx) {
    await projectDesktop(ctx, { script: 'keyboard', allowAll: true, policy: { 'fs.write': 'ask' } })
    ctx.state.noMouse = true
    ctx.saveState()
  }
}

export { ALL_ALLOW }

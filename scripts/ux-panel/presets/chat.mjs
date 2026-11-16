// Start states with chats: open chat, pending requests, running turns, changes, recycled changes.
import { lastProgress } from '../checks/util.mjs'
import { resolveScript } from '../lib/context.mjs'
import { ALL_ALLOW, PROMPT_FIX, PROMPT_LOGIN, chatWithPendingRequest, projectDesktop } from './base.mjs'

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
    // H-57: two different requests on two files (redirect.ts and login.ts), so the panelist can tell the chats apart.
    const second = await ctx.newChat(desktop.id)
    await ctx.sendPrompt(desktop.id, second.sessionId, PROMPT_LOGIN)
    await ctx.waitPending(second.sessionId)
    await ctx.dismissDialogs(desktop.id)
    ctx.state.sessionIds = [first.sessionId, second.sessionId]
    // State check: the Action Center flag on the taskbar counts both waiting requests.
    const page = await ctx.desktopPage(desktop.id)
    const flag = page.getByTestId('action-center-flag')
    await ctx.waitFor(async () => (await flag.getAttribute('data-count').catch(() => null)) === '2', 'the taskbar flag showing 2 waiting requests')
    ctx.state.flagCountAtStart = Number(await flag.getAttribute('data-count'))
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
    // H-35: press Pause all agents on the top bar (the UI path), so the renderer records which chats it stopped (stoppedByPause)
    // and Resume shows the continue note; no API call that bypasses the renderer.
    await page.getByTestId('topbar-pause').click()
    await ctx.waitFor(async () => (await ctx.desktopState(desktopId))?.paused === true, 'the desktop paused')
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
    await ctx.dismissReopenedNotes(desktop.id) // H-63
  },

  /** One recycled change for redirect.ts (the user reverted it). */
  async 'recycled-change'(ctx) {
    await presets['changes-to-review'](ctx, {})
    const changes = await ctx.changes(ctx.state.sessionId)
    const redirect = changes.find((c) => c.path.endsWith('redirect.ts'))
    ctx.state.redirectAgentText = redirect.currentText
    await ctx.eval((id) => window.agent7.sessions.revertChange(id), redirect.id)
    await ctx.waitFor(async () => (await ctx.recycled(ctx.state.desktopId)).length === 1, 'one recycled change')
    // H-34: the revert happened after the windows opened, so the open Changes list is stale ("Changes (2)"). Reload the
    // desktop window and check that the list shows the revert (note revertShownInList in state.json).
    const page = await ctx.desktopPage(ctx.state.desktopId)
    await page.reload()
    await page.getByTestId('taskbar').waitFor()
    ctx.state.revertShownInList = (await ctx.recycled(ctx.state.desktopId)).length === 1
    await ctx.dismissReopenedNotes(ctx.state.desktopId) // H-63: the reload reopens the chat with a "Reopened ..." note
    ctx.saveState()
  },

  /**
   * Crash: the first turn hangs ("Working on it..." in the `crash-recovery` script), then the agent process is killed. The agent
   * is then pointed at `crash-recovered`, so the retry after the restart ends in under 5 s with "Done. The slow job is finished." (H-31).
   * H-58: the start state records whether the red box offers "Restart and send again" (state.firstCrashOffersRestartSend; the option
   * `strict` throws when it does not). The option `twice` is the second-failure task (T23.1b): "It stopped again", plain Restart.
   * H-65: the second failure needs UX-123 (the failure count is reset when a turn completes, not when the agent starts). With it, a
   * crash of the restarted agent before its turn completes is failure 2: the box says "It stopped again", offers Restart and "Start
   * a new chat" (state.secondFailureOffersNewChat). Without it the box never says so and the preset throws on that line (SETUP FAIL).
   */
  async 'crashed-agent'(ctx, options = {}) {
    const { desktop, agent } = await idleChat(ctx, { script: 'crash-recovery' })
    await ctx.sendPrompt(desktop.id, ctx.state.sessionId, 'please do the slow job')
    const proc = await ctx.waitFor(async () => (await ctx.processes()).find((p) => p.pid), 'the agent process')
    await ctx.sleep(1500)
    process.kill(proc.pid, 'SIGKILL')
    await ctx.sleep(1500)
    const retryScript = resolveScript('crash-recovered')
    await ctx.eval(
      async ({ id, retryScript }) => {
        const row = (await window.agent7.agents.list()).find((a) => a.id === id)
        const args = row.args.map((a, i) => (row.args[i - 1] === '--script' ? retryScript : a))
        await window.agent7.agents.update(id, { name: row.name, command: row.command, args, env: row.env })
      },
      { id: agent.id, retryScript }
    )
    ctx.state.crashedPid = proc.pid
    const page = await ctx.desktopPage(desktop.id)
    const errorText = async () => (await page.getByTestId('chat-error-text').first().textContent({ timeout: 1000 }).catch(() => null)) ?? ''
    // H-58: read what the red box offers now. The first crash must offer "Restart and send again" (data-testid chat-error-restart-send).
    await ctx.waitFor(async () => (await page.getByTestId('chat-error').count()) > 0, 'the red box of the crashed chat')
    const restartSend = () => page.getByTestId('chat-error-restart-send').isVisible().catch(() => false)
    ctx.state.firstCrashOffersRestartSend = await restartSend()
    if (!ctx.state.firstCrashOffersRestartSend) ctx.state.startedAtSecondFailure = /stopped again/i.test(await errorText())
    if (options.strict && !ctx.state.firstCrashOffersRestartSend) throw new Error(`the first crash did not offer "Restart and send again" (error text: ${(await errorText()).slice(0, 200)})`)
    if (options.twice && ctx.state.firstCrashOffersRestartSend) {
      // Second failure: point the agent at the crashing script again, press Restart and send again, kill the new process.
      await ctx.eval(async ({ id, script }) => {
        const row = (await window.agent7.agents.list()).find((a) => a.id === id)
        const args = row.args.map((a, i) => (row.args[i - 1] === '--script' ? script : a))
        await window.agent7.agents.update(id, { name: row.name, command: row.command, args, env: row.env })
      }, { id: agent.id, script: resolveScript('crash-recovery') })
      await page.getByTestId('chat-error-restart-send').click()
      const second = await ctx.waitFor(async () => (await ctx.processes()).find((p) => p.pid && p.pid !== proc.pid), 'the restarted agent process')
      await ctx.sleep(1500)
      process.kill(second.pid, 'SIGKILL')
      await ctx.waitFor(async () => /stopped again/i.test(await errorText()), 'the "It stopped again" line')
    }
    if (options.twice) {
      // The retry of the second-failure task must finish too (the agent points at crash-recovered again).
      await ctx.eval(async ({ id, script }) => {
        const row = (await window.agent7.agents.list()).find((a) => a.id === id)
        const args = row.args.map((a, i) => (row.args[i - 1] === '--script' ? script : a))
        await window.agent7.agents.update(id, { name: row.name, command: row.command, args, env: row.env })
      }, { id: agent.id, script: retryScript })
      ctx.state.secondFailure = /stopped again/i.test(await errorText())
      ctx.state.secondFailureOffersNewChat = await page.getByTestId('chat-error-new-chat').isVisible().catch(() => false)
      if (!ctx.state.secondFailure) throw new Error('the second-failure start state did not show "It stopped again"')
    }
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
    // H-35: eject through the taskbar's Safely Remove Hardware menu and answer Yes to the warning (the UI path), so the
    // renderer's "Recently removed" list and the balloon are filled like for a user.
    const page = await ctx.desktopPage(desktop.id)
    await page.getByTestId('usb-tray').click()
    await page.getByTestId(`usb-eject-${drive.letter.toLowerCase()}`).click()
    await page.getByTestId('dialog-button-yes').click()
    await ctx.waitFor(async () => !(await ctx.drives(desktop.id)).some((d) => d.letter === drive.letter), 'the drive ejected')
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

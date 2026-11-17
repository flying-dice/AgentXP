// Launcher-level start states: several desktops, a broken agent.
import { PROMPT_FIX, chatWithPendingRequest, projectDesktop } from './base.mjs'

export const presets = {
  /** Three desktops (disconnected). `rich`: 'Try new ideas' has login-app plugged in and one chat. */
  async 'three-desktops'(ctx, options) {
    const agent = await ctx.useScript('demo')
    const rich = Boolean(options.rich)
    await ctx.answerFolderPicker(ctx.fixtures.docsSite)
    const ideas = await ctx.createDesktop({ title: 'Try new ideas', projects: rich ? [ctx.fixtures.loginApp] : [], connect: rich, agentId: agent.id })
    if (rich) {
      const chat = await ctx.newChat(ideas.id)
      await ctx.sendPrompt(ideas.id, chat.sessionId, 'hello')
      await ctx.waitAgentMessages(chat.sessionId, 1)
      await ctx.waitIdle(chat.sessionId)
      await ctx.eval((id) => window.agentxp.launcher.disconnect(id), ideas.id)
      await ctx.waitFor(async () => !(await ctx.desktopState(ideas.id)), 'the desktop window closed')
      ctx.state.sessionId = chat.sessionId
    }
    await ctx.createDesktop({ title: 'Fix login redirect', projects: [ctx.fixtures.loginApp], connect: false, agentId: agent.id })
    await ctx.createDesktop({ title: 'Docs site', projects: [ctx.fixtures.docsSite], connect: false, agentId: agent.id })
    Object.assign(ctx.state, { desktopId: ideas.id, desktopTitle: 'Try new ideas', projectPaths: rich ? [ctx.fixtures.loginApp] : [] })
    ctx.saveState()
  },

  /** Four desktops: one with a pending request, one whose agent does not start (error), two idle. All disconnected. */
  async 'four-desktops'(ctx) {
    const { desktop } = await projectDesktop(ctx, { title: 'Fix login redirect', script: 'fix-redirect' })
    await chatWithPendingRequest(ctx, desktop.id, PROMPT_FIX)
    await ctx.dismissDialogs(desktop.id)
    await ctx.eval((id) => window.agentxp.launcher.disconnect(id), desktop.id)
    await ctx.waitFor(async () => !(await ctx.desktopState(desktop.id)), 'the desktop window closed')

    const demo = ctx.agents.values().next().value
    const bad = await ctx.eval(() => window.agentxp.agents.create({ name: 'Broken assistant', command: 'not-a-real-command', args: [], env: {} }).then((a) => a.id))
    const broken = await ctx.createDesktop({ title: 'Docs site', projects: [ctx.fixtures.docsSite], connect: false, agentId: bad })
    await ctx.eval(({ id, agent }) => window.agentxp.sessions.create(id, agent).catch(() => null), { id: broken.id, agent: bad })
    await ctx.createDesktop({ title: 'Try new ideas', connect: false, agentId: demo.id })
    await ctx.createDesktop({ title: 'Scratch pad', connect: false, agentId: demo.id })
    // H-51: all desktops exist now; check the agents of every row and wait until the broken one shows its problem, so the
    // launcher does not read "Idle" for it for the first 30 s (the check ran at mount, before the row existed).
    await ctx.eval(() => window.agentxp.launcher.checkAgents())
    await ctx.waitFor(async () => Boolean((await ctx.launcherList()).find((d) => d.id === broken.id)?.agentProblem), 'the agent problem on the Docs site row')
    // H-73: the launcher preselects the row that waits for approval, which answers the task for the panelist. Select the
    // "Scratch pad" row (an idle one) so that the panelist has to read the rows to find the waiting desktop.
    const launcher = await ctx.launcher()
    await launcher.locator('[data-testid="launcher-desktop-row"]', { hasText: 'Scratch pad' }).click()
    ctx.state.preselectedTitle = 'Scratch pad'
    Object.assign(ctx.state, { pendingDesktopId: desktop.id, errorDesktopId: broken.id, errorDesktopTitle: 'Docs site' })
    ctx.saveState()
  },

  /**
   * The default agent has a bad command; a chat was started and the assistant does not answer. A working scripted agent
   * ("Helper assistant") is in the Agents list but not the default, so that "choose another agent" can be done (H-97). The
   * built-in Claude Code entry is removed (H-107): it cannot start here and looked usable.
   */
  async 'bad-default-agent'(ctx) {
    const bad = await ctx.eval(async () => {
      const a = await window.agentxp.agents.create({ name: 'My assistant', command: 'not-a-real-command', args: [], env: {} })
      await window.agentxp.agents.setDefault(a.id)
      return a.id
    })
    const helper = await ctx.useScript('demo', { makeDefault: false, name: 'Helper assistant' })
    // H-107: the built-in Claude Code row starts with `npx`, which is not installed here, so it looked usable and failed. Remove it:
    // every row that is left either fails for the stated reason or answers.
    await ctx.eval(async () => {
      for (const a of await window.agentxp.agents.list()) if (a.name === 'Claude Code') await window.agentxp.agents.remove(a.id)
    })
    const d = await ctx.createDesktop({ title: 'Fix login redirect', projects: [ctx.fixtures.loginApp], agentId: bad })
    const attempt = await ctx.eval(({ id, bad }) => window.agentxp.desktop.newChat(id, bad).then(() => 'chat opened', (e) => String(e?.message ?? e)), { id: d.id, bad }).catch((e) => String(e))
    await ctx.answerFolderPicker(ctx.fixtures.docsSite)
    Object.assign(ctx.state, { desktopId: d.id, badAgentId: bad, helperAgentId: helper.id, attempt, appPid: ctx.app.process().pid })
    ctx.saveState()
    return `new chat attempt: ${attempt}`
  }
}

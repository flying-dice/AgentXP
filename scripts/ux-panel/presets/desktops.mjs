// Launcher-level start states: several desktops, a broken agent.
import { PROMPT_FIX, chatWithPendingRequest, projectDesktop } from './base.mjs'

export const presets = {
  /** Three desktops (disconnected). `rich`: 'Try new ideas' has login-app plugged in and one chat. */
  async 'three-desktops'(ctx, options) {
    const agent = await ctx.useScript('demo')
    const rich = Boolean(options.rich)
    const ideas = await ctx.createDesktop({ title: 'Try new ideas', projects: rich ? [ctx.fixtures.loginApp] : [], connect: rich, agentId: agent.id })
    if (rich) {
      const chat = await ctx.newChat(ideas.id)
      await ctx.sendPrompt(ideas.id, chat.sessionId, 'hello')
      await ctx.waitAgentMessages(chat.sessionId, 1)
      await ctx.waitIdle(chat.sessionId)
      await ctx.eval((id) => window.agent7.launcher.disconnect(id), ideas.id)
      await ctx.waitFor(async () => !(await ctx.desktopState(ideas.id)), 'the desktop window closed')
      ctx.state.sessionId = chat.sessionId
    }
    await ctx.createDesktop({ title: 'Fix login redirect', projects: [ctx.fixtures.docsSite], connect: false, agentId: agent.id })
    await ctx.createDesktop({ title: 'Docs site', projects: [], connect: false, agentId: agent.id })
    Object.assign(ctx.state, { desktopId: ideas.id, desktopTitle: 'Try new ideas', projectPaths: rich ? [ctx.fixtures.loginApp] : [] })
    ctx.saveState()
  },

  /** Four desktops: one with a pending request, one whose agent does not start (error), two idle. All disconnected. */
  async 'four-desktops'(ctx) {
    const { desktop } = await projectDesktop(ctx, { title: 'Fix login redirect', script: 'fix-redirect' })
    await chatWithPendingRequest(ctx, desktop.id, PROMPT_FIX)
    await ctx.dismissDialogs(desktop.id)
    await ctx.eval((id) => window.agent7.launcher.disconnect(id), desktop.id)
    await ctx.waitFor(async () => !(await ctx.desktopState(desktop.id)), 'the desktop window closed')

    const demo = ctx.agents.values().next().value
    const bad = await ctx.eval(() => window.agent7.agents.create({ name: 'Broken assistant', command: 'not-a-real-command', args: [], env: {} }).then((a) => a.id))
    const broken = await ctx.createDesktop({ title: 'Docs site', projects: [ctx.fixtures.docsSite], connect: false, agentId: bad })
    await ctx.eval(({ id, agent }) => window.agent7.sessions.create(id, agent).catch(() => null), { id: broken.id, agent: bad })
    await ctx.createDesktop({ title: 'Try new ideas', connect: false, agentId: demo.id })
    await ctx.createDesktop({ title: 'Scratch pad', connect: false, agentId: demo.id })
    Object.assign(ctx.state, { pendingDesktopId: desktop.id, errorDesktopId: broken.id, errorDesktopTitle: 'Docs site' })
    ctx.saveState()
  },

  /** The default agent has a bad command; a chat was started and the assistant does not answer. */
  async 'bad-default-agent'(ctx) {
    const bad = await ctx.eval(async () => {
      const a = await window.agent7.agents.create({ name: 'My assistant', command: 'not-a-real-command', args: [], env: {} })
      await window.agent7.agents.setDefault(a.id)
      return a.id
    })
    const d = await ctx.createDesktop({ title: 'Workspace', projects: [ctx.fixtures.loginApp], agentId: bad })
    const attempt = await ctx.eval(({ id, bad }) => window.agent7.desktop.newChat(id, bad).then(() => 'chat opened', (e) => String(e?.message ?? e)), { id: d.id, bad }).catch((e) => String(e))
    Object.assign(ctx.state, { desktopId: d.id, badAgentId: bad, attempt })
    ctx.saveState()
    return `new chat attempt: ${attempt}`
  }
}

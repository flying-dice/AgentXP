// Start states without a running turn: first launch, desktops, projects, open apps.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectDesktop } from './base.mjs'

export const presets = {
  /** First launch: fresh user-data folder, the launcher is open and lists nothing. */
  async empty(ctx) {
    await ctx.launcher()
  },

  /** No desktops; the folder picker (New... > Browse) answers with login-app. */
  async 'empty-folder-picker'(ctx) {
    await ctx.launcher()
    await ctx.answerFolderPicker(ctx.fixtures.loginApp)
  },

  /** One desktop called "Fix login redirect" (not connected); the next folder picker answers with docs-site. */
  async 'one-named-desktop'(ctx) {
    await ctx.useScript('demo')
    const d = await ctx.createDesktop({ title: 'Fix login redirect', projects: [ctx.fixtures.loginApp], connect: false })
    ctx.state.desktopId = d.id
    ctx.state.desktopTitle = 'Fix login redirect'
    await ctx.answerFolderPicker(ctx.fixtures.docsSite)
  },

  /**
   * A connected desktop with projects plugged in (E:, F:...) and the scripted agent as default. Options: script, projects,
   * policy, allowAll, open (apps), browserUrl, picker (next folder-picker answer), git, modifyGit, agentFile.
   */
  async 'project-desktop'(ctx, options) {
    const { desktop } = await projectDesktop(ctx, { title: options.title ?? 'Workspace', ...options })
    if (options.picker) await ctx.answerFolderPicker(ctx.fixtures[options.picker])
    if (options.agentFile) writeFileSync(join(ctx.fixtures.loginApp, 'my-agent.js'), "console.log('my agent')\n")
    return `desktop ${desktop.id}`
  },

  /** One chat with 3 messages whose window is closed. */
  async 'closed-chat'(ctx) {
    const { desktop } = await projectDesktop(ctx, { script: 'demo' })
    const chat = await ctx.newChat(desktop.id)
    for (const [i, text] of ['hello', 'hi there', 'hey again'].entries()) {
      await ctx.sendPrompt(desktop.id, chat.sessionId, text)
      await ctx.waitAgentMessages(chat.sessionId, i + 1)
      await ctx.waitIdle(chat.sessionId)
    }
    await desktop.page.evaluate((id) => window.agent7.desktop.closeWindow(id), chat.windowId)
    Object.assign(ctx.state, { sessionId: chat.sessionId })
    ctx.saveState()
  }
}

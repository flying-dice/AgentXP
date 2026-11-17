// A2UI surfaces.
import { projectDesktop } from './base.mjs'

/** H-117: the name the chat shows for the speaker (not "Scripted a2ui"); the form button is "Send name" so that it differs from the chat's Send. */
export const A2UI_SPEAKER = 'Helper'

export const presets = {
  /** The a2ui script draws a form: inline, in the sidebar or in its own window. Option closeWindow closes the window surface. */
  async a2ui(ctx, options) {
    const variant = options.variant ?? 'inline'
    const { desktop } = await projectDesktop(ctx, { script: 'a2ui', agentName: A2UI_SPEAKER })
    const chat = await ctx.newChat(desktop.id)
    await ctx.sendPrompt(desktop.id, chat.sessionId, variant === 'inline' ? 'show me a form' : `show me a form in the ${variant}`)
    await ctx.waitFor(async () => (await ctx.transcript(chat.sessionId)).some((e) => e.kind === 'a2ui') || ((await ctx.desktopState(desktop.id))?.surfaces.length ?? 0) > 0, 'the surface', 30_000)
    await ctx.waitIdle(chat.sessionId)
    if (options.closeWindow) {
      const state = await ctx.desktopState(desktop.id)
      const surface = state.windows.find((w) => w.app === 'surface')
      if (!surface) throw new Error('no surface window to close')
      await desktop.page.evaluate((id) => window.agentxp.desktop.closeWindow(id), surface.id)
    }
    Object.assign(ctx.state, { sessionId: chat.sessionId, variant })
    ctx.saveState()
  }
}

// J18, J21, J23, J24.
import { agentMessages, all, fail, pass, textOf, userMessages, windowsOf, withAnswer } from './util.mjs'

const A2UI = async (ctx) => {
  const events = await ctx.protocol(ctx.state.desktopId, { source: 'acp', sessionId: ctx.state.sessionId })
  return events.filter((e) => e.name === 'session/prompt' && /triggered the action/i.test(e.payload))
}

export const checks = {
  async 'T18.1'(ctx, { answer }) {
    const actions = await A2UI(ctx)
    return withAnswer(all([[actions.some((e) => /"name":\s*"Nia"/.test(e.payload) || /Nia/.test(e.payload)), `the agent received an action with name = Nia (${actions.length} action prompt(s))`]]), answer, { keywords: [['got action', 'hello nia', 'nia']], expect: "the answer matches the agent's reply (Got action ... hello Nia)" })
  },

  async 'T18.2'(ctx) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    const surfaces = windowsOf(state, 'surface')
    return all([[surfaces.length === 1, `${surfaces.length} surface window(s) open (want exactly one)`]])
  },

  async 'T21.1'(ctx) {
    const sessions = await ctx.sessions(ctx.state.desktopId)
    for (const s of sessions) {
      const entries = await ctx.transcript(s.id)
      const hello = userMessages(entries).some((m) => /^\s*hello\s*$/i.test(textOf(m)))
      const allowed = entries.some((e) => e.kind === 'tool_call' && e.permission?.outcome === 'selected' && String(e.permission.selectedOptionId).startsWith('allow'))
      if (hello && allowed) return pass('"hello" was sent and the request was answered Allow (the mouse was disabled by the driver)')
    }
    return fail('no chat with a sent "hello" and an Allow answer')
  },

  async 'T23.1'(ctx) {
    const { desktopId, sessionId } = ctx.state
    const outcomes = await ctx.runOutcomes(desktopId, sessionId)
    const entries = await ctx.transcript(sessionId)
    const session = (await ctx.sessions()).find((s) => s.id === sessionId)
    return all([
      [outcomes.at(-1) === 'success', `the last turn ended ${outcomes.at(-1) ?? 'never'} (want success)`],
      [userMessages(entries).length >= 2, 'a new request was sent after the crash'],
      [agentMessages(entries).length > 0 && session?.status === 'idle', 'the assistant answered and the chat is idle']
    ])
  },

  async 'T23.2'(ctx) {
    const entries = await ctx.transcript(ctx.state.sessionId)
    const session = (await ctx.sessions()).find((s) => s.id === ctx.state.sessionId)
    return all([
      [agentMessages(entries).some((m) => /Got your message/.test(textOf(m))), 'the agent replied to the message'],
      [session?.status === 'idle', 'the chat is idle']
    ])
  },

  async 'T24.1'(ctx, { answer }) {
    return withAnswer(pass('the Git project start state is in place'), answer, { keywords: ['redirect.ts', 'login.ts', 'session.ts'], expect: 'names redirect.ts and login.ts (modified) and session.ts (new), and the correct new line of redirect.ts (the line with searchParams) [planned task]' })
  },

  async 'T24.2'(ctx, { answer }) {
    return withAnswer(pass('the plain folder start state is in place'), answer, { keywords: [['git', 'repository', 'version control']], expect: 'names the missing Git repository (from the screen text) [planned task]' })
  }
}

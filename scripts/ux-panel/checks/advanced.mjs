// J18, J21, J23, J24.
import { agentMessages, all, fail, pass, textOf, userMessages, windowsOf, withAnswer } from './util.mjs'

const A2UI = async (ctx) => {
  const events = await ctx.protocol(ctx.state.desktopId, { source: 'acp', sessionId: ctx.state.sessionId })
  return events.filter((e) => e.name === 'session/prompt' && /triggered the action/i.test(e.payload))
}

export const checks = {
  async 'T18.1'(ctx, { answer }) {
    const actions = await A2UI(ctx)
    return withAnswer(all([[actions.some((e) => /"name":\s*"Nia"/.test(e.payload) || /Nia/.test(e.payload)), `the agent received an action with name = Nia (${actions.length} action prompt(s))`]]), answer, { keywords: [['received', 'thanks', 'thank you'], ['nia']], expect: "the answer matches the agent's reply (Thanks Nia, I received your answer)" })
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
    const first = ctx.state.firstMessage
    const replied = agentMessages(entries).map((m) => /^\s*Got your message: ([\s\S]*?)\s*$/.exec(textOf(m))?.[1]).filter((t) => t !== undefined)
    const users = userMessages(entries).map((m) => textOf(m).trim())
    // exact text: the reply echoes the message without a "You" prefix and equals the message that failed to send
    const exact = replied.some((t) => (first ? t === first : users.includes(t)))
    return all([
      [exact, first ? `the agent replied to exactly the first message "${first}" (replies: ${replied.join(' | ') || 'none'})` : `the agent replied to a message the user sent (replies: ${replied.join(' | ') || 'none'})`],
      [session?.status === 'idle', 'the chat is idle']
    ])
  },

  async 'T24.1'(ctx, { answer }) {
    return withAnswer(pass('the Git project start state is in place'), answer, { keywords: ['redirect.ts', 'login.ts', 'session.ts', '3'], expect: 'names redirect.ts and login.ts (modified) and session.ts (new), and the new lines of redirect.ts (lines 1, 3 and 4 of the diff; line 3 is the one with searchParams) [planned task]' })
  },

  async 'T24.2'(ctx, { answer }) {
    return withAnswer(pass('the plain folder start state is in place'), answer, { keywords: [['git', 'repository', 'version control']], expect: 'names the missing Git repository (from the screen text) [planned task]' })
  }
}

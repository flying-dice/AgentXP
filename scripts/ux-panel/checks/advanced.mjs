// J18, J21, J23, J24.
import { agentMessages, all, fail, missingNumbers, pass, textOf, userMessages, userText, windowsOf, withAnswer } from './util.mjs'

/** H-60: the new lines of redirect.ts in the diff. */
export const GIT_NEW_LINES = [1, 3, 4]

/** H-58: what the start state of T23.1 showed. A first crash that already says "It stopped again" is a product defect, not a task error. */
export const crashNotes = (state) =>
  state.firstCrashOffersRestartSend === false
    ? [`note: the start state did not offer "Restart and send again" (${state.startedAtSecondFailure ? 'the box already said "It stopped again"' : 'no such button'}): researcher, record it as a product defect`]
    : []

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
      const hello = userMessages(entries).some((m) => /^\s*hello\s*$/i.test(userText(m)))
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
    ], crashNotes(ctx.state))
  },

  /** H-65: the second failure. The turn must finish after "It stopped again", in the same chat (Restart) or in a new chat. */
  async 'T23.1b'(ctx) {
    const { desktopId } = ctx.state
    const sessions = await ctx.sessions(desktopId)
    let finished = null
    for (const s of sessions) {
      const outcomes = await ctx.runOutcomes(desktopId, s.id)
      const entries = await ctx.transcript(s.id)
      if (outcomes.at(-1) === 'success' && agentMessages(entries).length > 0 && s.status === 'idle') finished = s
    }
    return all(
      [
        [ctx.state.secondFailure === true, 'the start state showed "It stopped again"'],
        [Boolean(finished), finished ? `a turn finished after the second crash (chat ${finished.id})` : 'no chat has a finished turn with an answer and is idle']
      ],
      [ctx.state.secondFailureOffersNewChat === true ? 'the second-failure box offered "Start a new chat"' : 'note: the second-failure box did not offer "Start a new chat": researcher, record it as a product defect (UX-123)']
    )
  },

  async 'T23.2'(ctx) {
    const entries = await ctx.transcript(ctx.state.sessionId)
    const session = (await ctx.sessions()).find((s) => s.id === ctx.state.sessionId)
    const first = ctx.state.firstMessage
    const replied = agentMessages(entries).map((m) => /^\s*Got your message: ([\s\S]*?)\s*$/.exec(textOf(m))?.[1]).filter((t) => t !== undefined)
    const users = userMessages(entries).map((m) => userText(m).trim())
    // exact text: the reply echoes the message without a "You" prefix and equals the message that failed to send
    const exact = replied.some((t) => (first ? t === first : users.includes(t)))
    return all([
      [exact, first ? `the agent replied to exactly the first message "${first}" (replies: ${replied.join(' | ') || 'none'})` : `the agent replied to a message the user sent (replies: ${replied.join(' | ') || 'none'})`],
      [session?.status === 'idle', 'the chat is idle']
    ])
  },

  async 'T24.1'(ctx, { answer }) {
    // H-60: the three file names and the three line numbers 1, 3 and 4 (a lone "3" no longer passes).
    const result = withAnswer(pass('the Git project start state is in place'), answer, { keywords: ['redirect.ts', 'login.ts', 'session.ts'], expect: 'names redirect.ts and login.ts (modified) and session.ts (new), and the new lines of redirect.ts (lines 1, 3 and 4 of the diff; line 3 is the one with searchParams)' })
    if (result.status !== 'PASS' || !answer) return result
    const missing = missingNumbers(answer, GIT_NEW_LINES)
    return missing.length ? fail(`state ok but the answer lacks the line number(s) ${missing.join(', ')} of redirect.ts (want ${GIT_NEW_LINES.join(', ')})`, result.notes) : result
  },

  async 'T24.2'(ctx, { answer }) {
    return withAnswer(pass('the plain folder start state is in place'), answer, { keywords: [['git', 'repository', 'version control']], expect: 'names the missing Git repository (from the screen text) [planned task]' })
  }
}

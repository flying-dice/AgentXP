// J05-J07, J11: prompts, permissions, stopping, pausing.
import { REDIRECT_FIXED } from '../lib/fixtures.mjs'
import { agentMessages, all, fail, manual, pass, projectRoot, readText, textOf, userMessages, withAnswer } from './util.mjs'

const permissions = (entries) => entries.filter((e) => e.kind === 'tool_call' && e.permission)

export const checks = {
  async 'T05.1'(ctx, { answer }) {
    const entries = await ctx.transcript(ctx.state.sessionId)
    const session = (await ctx.sessions()).find((s) => s.id === ctx.state.sessionId)
    const state = all([
      [userMessages(entries).some((m) => /deep links/i.test(textOf(m))), 'the prompt is in the chat'],
      [agentMessages(entries).length > 0, 'the assistant answered'],
      [session?.status === 'idle', 'the turn ended']
    ])
    return withAnswer(state, answer, { keywords: [['redirect.ts'], ['finished', 'done', 'complete', 'fixed', 'changed it', 'made the change']], expect: 'the answer names the file the assistant read (src/auth/redirect.ts) and the file it changed (src/auth/redirect.ts) and says it is finished' })
  },

  async 'T05.2'(ctx) {
    const { desktopId, sessionId } = ctx.state
    const outcomes = await ctx.runOutcomes(desktopId, sessionId)
    const session = (await ctx.sessions()).find((s) => s.id === sessionId)
    const tool = (await ctx.transcript(sessionId)).filter((e) => e.kind === 'tool_call').at(-1)
    return all([
      [outcomes.at(-1) === 'cancelled', `the last turn ended ${outcomes.at(-1) ?? 'never'} (want cancelled)`],
      [session?.status === 'idle', 'the chat is idle'],
      [!tool || tool.status !== 'in_progress', `the tool card is ${tool?.status ?? 'absent'}, not running`]
    ])
  },

  async 'T06.1'(ctx) {
    const entries = await ctx.transcript(ctx.state.sessionId)
    const request = permissions(entries).at(0)
    const disk = readText(projectRoot(ctx), 'src/auth/redirect.ts')
    return all(
      [
        [request?.permission.outcome === 'selected' && request.permission.selectedOptionId === 'allow', `the request was answered ${request?.permission.selectedOptionId ?? request?.permission.outcome ?? 'never'} (want allow)`],
        [disk === REDIRECT_FIXED, 'redirect.ts on disk contains the fix']
      ],
      ['researcher: the panelist should name the changed lines (answer or think-aloud); opening the details is optional because the diff is inline']
    )
  },

  async 'T06.2'(ctx) {
    const { sessionId } = ctx.state
    const entries = await ctx.transcript(sessionId)
    const request = permissions(entries).at(0)
    const terminals = await ctx.terminalsOf(sessionId)
    const session = (await ctx.sessions()).find((s) => s.id === sessionId)
    const denied = request && request.permission.outcome !== 'pending' && request.permission.selectedOptionId !== 'allow' && !String(request.permission.selectedOptionId).startsWith('allow')
    return all([
      [Boolean(denied), `the request was ${request ? `${request.permission.outcome} ${request.permission.selectedOptionId ?? ''}` : 'never raised'} (want a denial)`],
      [!terminals.some((t) => String(t.output).includes('tests passed')), 'the command did not run'],
      [session?.status === 'idle', 'the turn ended'],
      [(await ctx.changes(sessionId)).length === 0, 'no file was written']
    ])
  },

  async 'T06.3'(ctx) {
    const policy = await ctx.policy()
    const entries = await ctx.transcript(ctx.state.sessionId)
    return all([
      [policy.groups.terminal === 'ask' || policy.groups.terminal === 'deny', `Terminal policy is ${policy.groups.terminal}`],
      [permissions(entries).length > 0, 'a request appeared for the command']
    ])
  },

  async 'T07.1'(ctx) {
    const results = []
    for (const id of ctx.state.sessionIds) results.push(permissions(await ctx.transcript(id)).map((e) => e.permission.outcome))
    return all([
      [results.every((r) => r.length > 0), 'both chats had a request'],
      [results.flat().every((o) => o !== 'pending'), `no request is pending (${results.map((r) => r.join('/')).join(' | ')})`]
    ])
  },

  async 'T11.1'(ctx) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    const outcomes = await ctx.runOutcomes(ctx.state.desktopId, ctx.state.sessionId)
    const tools = (await ctx.transcript(ctx.state.sessionId)).filter((e) => e.kind === 'tool_call')
    return all(
      [
        [state?.paused === true, `desktop paused is ${state?.paused}`],
        [outcomes.at(-1) === 'cancelled', `the turn ended ${outcomes.at(-1) ?? 'never'} (want cancelled)`],
        [!tools.some((t) => t.status === 'completed'), 'no tool call completed after the stop']
      ],
      ['researcher: no new tool call may have run after the pause']
    )
  },

  async 'T11.2'(ctx) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    const entries = await ctx.transcript(ctx.state.sessionId)
    const policy = await ctx.policy()
    const groups = Object.values(policy.groups ?? {})
    const allAsk = groups.length > 0 && groups.every((g) => g === 'ask')
    const raised = permissions(entries).length > 0
    return all(
      [[state?.userInControl === true || allAsk, `userInControl is ${state?.userInControl}; all permission groups Ask: ${allAsk}`]],
      [raised ? 'a request was raised for a call (optional proof)' : 'no prompt was sent, so no request was raised (optional: the scenario does not ask for a prompt)']
    )
  },

  async 'T11.3'(ctx) {
    const { desktopId, sessionId } = ctx.state
    const state = await ctx.desktopState(desktopId)
    const outcomes = await ctx.runOutcomes(desktopId, sessionId)
    return all([
      [state?.paused === false, `paused is ${state?.paused}`],
      [outcomes.length > (ctx.state.outcomesAtStart ?? 0) && outcomes.at(-1) === 'success', `a new turn finished (${outcomes.join(',')})`]
    ])
  }
}

void fail
void manual

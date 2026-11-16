// J05-J07, J11: prompts, permissions, stopping, pausing.
import { REDIRECT_FIXED } from '../lib/fixtures.mjs'
import { agentMessages, all, controlNotes, fail, manual, missingNumbers, pass, saysCouldNotTell, projectRoot, readText, userMessages, userText, withAnswer } from './util.mjs'

/** H-74: the lines of redirect.ts that change (REDIRECT_BUG against REDIRECT_FIXED). */
export const REDIRECT_CHANGED_LINES = [1, 3, 4]

/**
 * H-88: the answer gives the counts of the change (3 added, 3 removed) in any spelling: "+3 and -3", "+3 / -3",
 * "3 added and 3 removed", "3 lines added, 3 removed", "added 3 lines", "removed 3". The lines themselves are not required
 * when the counts are right (the box prints the counts); ranges and "could not tell" never reach this test.
 */
export function countsThreeAndThree(text) {
  const t = String(text ?? '')
  const added = /\+\s*3\b|\b3\s+(?:new\s+)?(?:lines?\s+)?(?:were\s+|was\s+)?(?:added|additions?|insertions?)\b|\badded\s+3\b|\b3\s+(?:new\s+)?lines?\s+(?:were\s+)?added\b/i.test(t)
  const removed = /[-\u2212\u2013]\s*3\b|\b3\s+(?:old\s+)?(?:lines?\s+)?(?:were\s+|was\s+)?(?:removed|deleted|deletions?)\b|\b(?:removed|deleted)\s+3\b|\b3\s+(?:old\s+)?lines?\s+(?:were\s+)?(?:removed|deleted)\b/i.test(t)
  return added && removed
}

/**
 * H-85: the order of the answers to the pending requests and the seconds from the request to the answer. A transcript has no
 * "answered at" time; the answer is the first entry after the request (the agent continues when the box is answered).
 * `chats` = [{ label, entries }]. Returns notes for check.json; a read-and-allow shows as many seconds, a click without reading as one or two.
 */
export function answerOrderNotes(chats) {
  const rows = []
  for (const { label, entries } of chats) {
    const request = permissions(entries).at(0)
    if (!request) continue
    const next = entries.filter((e) => e.seq > request.seq && e.createdAt).sort((a, b) => a.seq - b.seq).at(0)
    const raised = Date.parse(request.createdAt)
    const answered = next ? Date.parse(next.createdAt) : NaN
    rows.push({ label, option: request.permission.selectedOptionId ?? request.permission.outcome, answered, seconds: Number.isFinite(answered) && Number.isFinite(raised) ? Math.max(0, Math.round((answered - raised) / 1000)) : null })
  }
  rows.sort((a, b) => (a.answered || Infinity) - (b.answered || Infinity))
  if (!rows.length) return []
  return [
    `answer order: ${rows.map((r, i) => `${i + 1}. chat "${r.label}" (${r.option})`).join('; ')}`,
    `seconds from the request to the next entry: ${rows.map((r) => `"${r.label}" ${r.seconds ?? 'unknown'}`).join('; ')} (the researcher compares with the shots: an Allow without reading shows as a very short time)`
  ]
}

const permissions = (entries) => entries.filter((e) => e.kind === 'tool_call' && e.permission)

/**
 * H-70: the bar banner against the chips. While the user is in control the banner says the tools "are set to Ask"; a chip that
 * reads Off, Deny or Allow beside it contradicts the banner (UX-118). Returns the chips that disagree (empty = consistent).
 */
export const barChipConflicts = (banner, chipLabels) => {
  if (!/\bAsk\b/.test(banner ?? '')) return []
  return chipLabels.filter((label) => /:\s*(Off|Deny|Allow)\s*$/.test(label.trim()))
}

/** The banner and the chip labels of the desktop's top bar; null when the page cannot be read. */
async function readBarAndChips(ctx) {
  try {
    const page = await ctx.desktopPage(ctx.state.desktopId)
    if (!page) return null
    const banner = (await page.getByTestId('topbar-status').first().textContent({ timeout: 2000 }))?.trim() ?? ''
    const chips = (await page.getByTestId('topbar-tool-chips').locator('button.chip').allTextContents()).map((t) => t.trim())
    return { banner, chips }
  } catch {
    return null
  }
}

export const checks = {
  async 'T05.1'(ctx, { answer }) {
    const entries = await ctx.transcript(ctx.state.sessionId)
    const session = (await ctx.sessions()).find((s) => s.id === ctx.state.sessionId)
    const state = all([
      [userMessages(entries).some((m) => /deep links/i.test(userText(m))), 'the prompt is in the chat'],
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

  async 'T06.1'(ctx, { answer } = {}) {
    const entries = await ctx.transcript(ctx.state.sessionId)
    const request = permissions(entries).at(0)
    const disk = readText(projectRoot(ctx), 'src/auth/redirect.ts')
    const state = all(
      [
        [request?.permission.outcome === 'selected' && request.permission.selectedOptionId === 'allow', `the request was answered ${request?.permission.selectedOptionId ?? request?.permission.outcome ?? 'never'} (want allow)`],
        [disk === REDIRECT_FIXED, 'redirect.ts on disk contains the fix']
      ],
      ['opening the details is optional because the diff is inline']
    )
    // H-44: the scenario asks which lines change; the answer must say so.
    // H-88: the counts alone ("3 added, 3 removed" in any spelling) answer the question; the keyword group is for line lists.
    if (state.status === 'PASS' && answer && countsThreeAndThree(answer) && !saysCouldNotTell(answer)) return pass(`${state.reason}; answer gives the counts (3 added, 3 removed)`, state.notes)
    const result = withAnswer(state, answer, { keywords: [['line', 'searchparams', 'next']], expect: 'the answer says which lines of redirect.ts change (lines 1, 3 and 4, or +3 and -3)' })
    // H-74: the change is +3 / -3 on lines 1, 3 and 4 of redirect.ts. A partial answer ("line 1 ...") no longer passes.
    if (result.status !== 'PASS' || !answer) return result
    const plusMinus = countsThreeAndThree(answer)
    const missing = missingNumbers(answer, REDIRECT_CHANGED_LINES)
    if (plusMinus || !missing.length) return result
    // H-77: ranges are not expanded ("lines 1 to 5" is 1 and 5), and an answer that says it could not tell fails with that reason.
    const why = saysCouldNotTell(answer) ? 'the answer says that the panelist could not tell which lines change; ' : ''
    return fail(`state ok but ${why}the answer lacks the line number(s) ${missing.join(', ')} of redirect.ts (want ${REDIRECT_CHANGED_LINES.join(', ')} as written, or the counts "3 added" and "3 removed" in any spelling; a range such as "1 to 5" does not count)`, result.notes)
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
    const state = await ctx.desktopState(ctx.state.desktopId).catch(() => null)
    return all(
      [
        [policy.groups.terminal === 'ask' || policy.groups.terminal === 'deny', `Terminal policy is ${policy.groups.terminal}`],
        [permissions(entries).length > 0, 'a request appeared for the command']
      ],
      controlNotes(state)
    )
  },

  async 'T07.1'(ctx) {
    const results = []
    const chats = []
    for (const id of ctx.state.sessionIds) {
      const entries = await ctx.transcript(id)
      results.push(permissions(entries).map((e) => e.permission.outcome))
      const title = (await ctx.sessions?.().catch(() => []))?.find?.((s) => s.id === id)?.title
      chats.push({ label: title ?? id, entries })
    }
    // H-85: either chat may be answered first (the scenario says so); the order and the seconds between the request and the answer go to the notes.
    return all(
      [
        [results.every((r) => r.length > 0), 'both chats had a request'],
        [results.flat().every((o) => o !== 'pending'), `no request is pending (${results.map((r) => r.join('/')).join(' | ')})`]
      ],
      answerOrderNotes(chats)
    )
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
    // H-70: take over sets userInControl (an overlay), not the policy groups; the groups line only matters for the Set all route.
    const route = state?.userInControl === true ? 'take over: userInControl true' : allAsk ? 'set all: all permission groups Ask' : `take over: userInControl ${state?.userInControl}; Set all: not all groups Ask`
    const bar = await readBarAndChips(ctx)
    const conflicts = bar ? barChipConflicts(bar.banner, bar.chips) : []
    return all(
      [[state?.userInControl === true || allAsk, route]],
      [
        ...controlNotes(state),
        raised ? 'a request was raised for a call (optional proof)' : 'no prompt was sent, so no request was raised (optional: the scenario does not ask for a prompt)',
        ...(bar ? [conflicts.length ? `banner against chips: the bar says "${bar.banner}" but ${conflicts.map((c) => `"${c}"`).join(', ')} disagree(s): researcher, record it as a product defect (UX-118)` : 'banner against chips: consistent'] : [])
      ]
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

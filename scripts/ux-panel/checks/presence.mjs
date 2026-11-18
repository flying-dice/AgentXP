// Checkers of T32.1 to T34.1 (agent presence: Show, notices of agent output, Follow).
import { agentMessages, all, manual, userMessages, userText, withAnswer } from './util.mjs'

/** T32.1: a reply that agrees, or that quotes the note (Reply puts the note in the composer). */
export const AGREES = /\b(yes|yep|agree|agreed|right|correct|ok(ay)?|sure|exactly|makes sense|sounds good|go ahead|fix it|that'?s it|good)\b/i
export const NOTE_WORDS = /afterLogin ignores|deep links are lost|\?next=/i

/** T32.1: the panelist answered the show in the chat, after the prompt of the start state. */
export function judgeShowReply(entries, prompt) {
  const users = userMessages(entries)
  const later = users.filter((m) => userText(m).trim() !== prompt)
  const reply = later.at(-1)
  const text = reply ? userText(reply) : ''
  return [
    [later.length > 0, `the chat has ${later.length} new message(s) from the panelist`],
    [AGREES.test(text) || NOTE_WORDS.test(text), `the reply agrees or quotes the note ("${text.slice(0, 80)}")`]
  ]
}

/** T32.2: Code Review is open, focused and on the comment; the request did not move the view by itself. */
export function judgeShowRequest({ desktop, reviewWindowId, commentId, requested }) {
  const review = desktop?.windows?.find((w) => w.id === reviewWindowId)
  return [
    [requested, 'the reviewer\'s show became a request (the view did not move before the panelist acted)'],
    [Boolean(review) && review.windowState !== 'minimized', 'the Code Review window is open'],
    [Boolean(review) && desktop.focusedWindowId === review.id, `the Code Review window has the focus (focused ${desktop?.focusedWindowId ?? 'none'})`],
    [commentId != null && review?.view?.selectedCommentId === commentId, `Code Review is on the comment ${commentId} (selected ${review?.view?.selectedCommentId ?? 'none'})`]
  ]
}

/**
 * T33.1: the review comments are open: the Code Review window is open on one of the new comments. Panel r9 (T33.1
 * novice): opening the comments does not need the focus to stay there, and any new comment counts (the panelist
 * picked the Blocker from the list, then went back to the Builder chat to check its answer).
 */
export function judgeMissedOutput({ desktop, reviewWindowId, firstCommentId, commentIds }) {
  const review = desktop?.windows?.find((w) => w.id === reviewWindowId)
  const ids = commentIds?.length ? commentIds : firstCommentId != null ? [firstCommentId] : []
  const selected = review?.view?.selectedCommentId ?? null
  const onComment = selected != null && ids.includes(selected)
  // Panel r9b (T33.1 novice): bringing the review window to the front shows both comments inline; that opens them too.
  const inFront = Boolean(review) && desktop?.focusedWindowId === review.id
  return [
    [Boolean(review), 'the Code Review window is open'],
    [onComment || inFront, `the comments are open: Code Review is on a new comment or in front (selected ${selected ?? 'none'}; new ${ids.join(', ') || 'none'}; focused ${desktop?.focusedWindowId ?? 'none'})`]
  ]
}

/** T33.2: the note was typed in Notepad, the diagram was drawn behind it, and the Diagrams window has the focus at the end. */
export function judgeDiagramBehind({ desktop, diagramsWindowId, notepadText, entries }) {
  const drawn = entries.filter((e) => e.kind === 'tool_call' && /diagram_add/.test(e.title ?? '') && e.status === 'completed').length
  return [
    [(notepadText ?? '').trim().length >= 3, `Notepad has the typed note ("${(notepadText ?? '').trim().slice(0, 40)}")`],
    [drawn >= 2, `the assistant drew in Agent Diagrams (${drawn} of 2 steps done)`],
    [diagramsWindowId != null && desktop?.focusedWindowId === diagramsWindowId, `the Diagrams window has the focus at the end (focused ${desktop?.focusedWindowId ?? 'none'})`]
  ]
}

/**
 * T34.1: the recorder log (presets/presence.mjs). Follow was on for the chat while Code landed on a step (a projected
 * step), and then off while the chat still worked (the panelist stopped it, not the end of the turn).
 */
export function judgeFollowLog(log, sessionId) {
  const entries = log ?? []
  const on = entries.findIndex((e) => e.following === sessionId)
  // Code was closed at the start: Code at some lines while Builder is followed is a projected step.
  const projected = on >= 0 && entries.slice(on).some((e) => e.following === sessionId && /:\d+-\d+$/.test(e.code ?? ''))
  const offAt = on >= 0 ? entries.slice(on).findIndex((e) => e.following === null) : -1
  const off = offAt >= 0 ? entries.slice(on)[offAt] : null
  return [
    [entries.length > 0, `the recorder has ${entries.length} reading(s)`],
    [on >= 0, 'Follow was turned on for Builder'],
    [projected, 'Code landed on a step of Builder while it was followed'],
    [Boolean(off), 'Follow was turned off afterwards'],
    [Boolean(off) && off.running, 'it was turned off while Builder still worked (not by the end of the turn)']
  ]
}

const desktopOf = (ctx) => ctx.desktopState(ctx.state.desktopId)

export const checks = {
  async 'T32.1'(ctx) {
    return all(judgeShowReply(await ctx.transcript(ctx.state.sessionId), ctx.state.prompt ?? 'Where is the login redirect checked?'))
  },

  async 'T32.2'(ctx) {
    const entries = await ctx.transcript(ctx.state.reviewSessionId)
    const requested = agentMessages(entries).some((m) => /Sent as a request/.test((m.blocks ?? []).map((b) => b.text ?? '').join('')))
    return all(judgeShowRequest({ desktop: await desktopOf(ctx), reviewWindowId: ctx.state.reviewWindowId, commentId: ctx.state.commentId, requested }))
  },

  async 'T33.1'(ctx, { answer }) {
    const state = all(judgeMissedOutput({ desktop: await desktopOf(ctx), reviewWindowId: ctx.state.reviewWindowId, firstCommentId: ctx.state.firstCommentId, commentIds: ctx.state.commentIds }))
    return withAnswer(state, answer, {
      keywords: [['changed', 'added', 'wrote', 'edited', 'changelog', 'file'], ['comment', 'review', 'remark']],
      expect: 'Builder changed a file (CHANGELOG.md) and ran the tests; Reviewer left 2 comments on notes.txt'
    })
  },

  async 'T33.2'(ctx) {
    const page = await ctx.desktopPage(ctx.state.desktopId)
    const notepadText = await page.getByTestId('window-notepad').getByTestId('notepad-text').inputValue().catch(() => null)
    return all(judgeDiagramBehind({ desktop: await desktopOf(ctx), diagramsWindowId: ctx.state.diagramsWindowId, notepadText, entries: await ctx.transcript(ctx.state.sessionId) }), ['keys lost while typing are not measured: compare the typed note with the panelist record'])
  },

  async 'T34.1'(ctx) {
    const page = await ctx.desktopPage(ctx.state.desktopId)
    const log = await page.evaluate(() => window.__uxFollowLog ?? null).catch(() => null)
    if (!log) return manual('the Follow recorder is gone (the desktop window was reloaded or closed): check the panelist record', [])
    const result = all(judgeFollowLog(log, ctx.state.sessionId), [`readings: ${log.length}`])
    if (result.status === 'FAIL' && log.at(-1)?.running === false && log.some((e) => e.following === ctx.state.sessionId)) {
      return manual(`${result.reason}; the turn ended, so Follow may have ended by itself: check the panelist record`, result.notes)
    }
    return result
  }
}

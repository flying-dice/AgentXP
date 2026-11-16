// Checkers of T25.x to T31.x (features added after the sprint plan).
import { agentMessages, all, fail, manual, pass, textOf, userMessages, windowsOf, withAnswer } from './util.mjs'

const reviewState = (ctx) => ctx.eval((id) => window.agent7.review.state(id), ctx.state.reviewSessionId)
const desktopPage = (ctx) => ctx.desktopPage(ctx.state.desktopId)

async function reviewOpen(ctx) {
  const state = await ctx.desktopState(ctx.state.desktopId)
  return windowsOf(state, 'code-review').length > 0
}

export const checks = {
  async 'T25.1'(ctx, { answer }) {
    const state = all([[await reviewOpen(ctx), 'the Code Review window is still open']])
    return withAnswer(state, answer, { keywords: [['notes.txt', 'notes'], '4'], expect: 'the blocking comment is on notes.txt line 4 ("THREE is shouted in capitals")' })
  },

  async 'T25.2'(ctx, { answer }) {
    const state = all([[await reviewOpen(ctx), 'the Code Review window is still open']])
    return withAnswer(state, answer, { keywords: ['2', ['change', 'not approved', 'not happy']], expect: 'the verdict is "Changes requested" and there are 2 comments' })
  },

  async 'T26.1'(ctx) {
    const entries = await ctx.transcript(ctx.state.sessionId)
    const sent = userMessages(entries).find((m) => /notes\.txt:4/.test(textOf(m)))
    const review = await reviewState(ctx)
    return all([
      [Boolean(sent), 'the chat got a message with the review comments (notes.txt:4)'],
      [agentMessages(entries).some((m) => /Fixing the review comments/.test(textOf(m))), 'the chat answered'],
      [review.comments.every((c) => c.state !== 'open'), `no comment is still open (${review.comments.map((c) => c.state).join(', ')})`]
    ])
  },

  async 'T26.2'(ctx) {
    const review = await reviewState(ctx)
    const mine = review.comments.find((c) => c.author === 'user' && /rename this/i.test(c.body))
    const entries = await ctx.transcript(ctx.state.sessionId)
    return all([
      [Boolean(mine), 'there is a comment by the user with the text "rename this"'],
      [mine?.path === 'notes.txt' && mine?.lineStart === 2, `it is on ${mine?.path ?? '?'} line ${mine?.lineStart ?? '?'} (want notes.txt line 2)`],
      [mine?.state === 'open', `it is ${mine?.state ?? 'absent'} (want open, not sent)`],
      [!userMessages(entries).some((m) => /rename this/i.test(textOf(m))), 'the chat did not get it']
    ])
  },

  async 'T27.1'(ctx) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    const code = windowsOf(state, 'code')[0]
    if (!code?.asideSessionId) return fail('the Code window has no chat pane conversation yet')
    const entries = await ctx.transcript(code.asideSessionId)
    return all(
      [
        [userMessages(entries).length > 0, 'a question was sent from the pane'],
        [agentMessages(entries).length > 0, 'the assistant answered in the pane'],
        [windowsOf(state, 'chat').length === 0, 'no separate Chat window was opened']
      ],
      [`question: ${textOf(userMessages(entries).find((m) => !textOf(m).startsWith('{')) ?? {}).slice(0, 120)}`, 'researcher: the question should name the selected lines (index.ts)']
    )
  },

  async 'T27.2'(ctx) {
    const page = await desktopPage(ctx)
    const open = await page.locator('[data-testid="window-code"] [data-testid="embedded-chat"][data-collapsed="false"]').count()
    const edge = await page.locator('[data-testid="window-code"] [data-testid="chat-pane-toggle"], [data-testid="window-code"] [data-testid="embedded-chat"][data-collapsed="true"]').count()
    return all([
      [open === 0, open ? 'the chat pane is still open' : 'the chat pane is hidden'],
      [edge > 0, 'the Code window still offers a way to show it again']
    ])
  },

  async 'T28.1'(ctx, { answer }) {
    const entries = await ctx.transcript(ctx.state.sessionId)
    const page = await desktopPage(ctx)
    const address = await page.getByTestId('browser-address').inputValue().catch(() => '')
    const state = all([
      [agentMessages(entries).some((m) => /DONE/.test(textOf(m))), 'the assistant finished the web app job (DONE)'],
      [/:4174/.test(address), `the Browser shows the web app (${address || 'no address'})`]
    ])
    return withAnswer(state, answer, { keywords: [['agent', 'assistant'], ['page', 'browser', 'bar']], expect: 'the panelist saw the Browser say the agent is using the page (activity bar and ring) and can say what was posted' })
  },

  async 'T28.2'(ctx) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    return all([[state?.userInControl === true, `userInControl is ${state?.userInControl}`]], ['researcher: was it the Take control button in the Browser bar, or the taskbar or tray control?'])
  },

  async 'T29.1'(ctx) {
    const page = await desktopPage(ctx)
    const tabs = await page.locator('[data-testid^="browser-tab-"]:not([data-testid^="browser-tab-close"]):not([data-testid="browser-tab-new"])').evaluateAll((els) => els.map((e) => ({ id: e.getAttribute('data-testid'), active: e.getAttribute('data-active') })))
    return all([
      [tabs.length === 2, `${tabs.length} tab(s) (want 2)`],
      [tabs[0]?.active === 'true', 'the first tab is the active one']
    ])
  },

  async 'T30.1'(ctx) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    const notepad = windowsOf(state, 'notepad')[0]
    if (!notepad) return fail('no Notepad window is open')
    return all([[/README\.md/i.test(JSON.stringify(notepad.view)), `Notepad shows ${JSON.stringify(notepad.view)} (want README.md)`]])
  },

  async 'T30.2'(ctx, { answer }) {
    const page = await desktopPage(ctx)
    const about = await page.getByTestId('notepad-about').isVisible().catch(() => false)
    const state = about ? pass('the About dialog of Notepad is open') : fail('the About dialog of Notepad is not open (the panelist may have closed it, then the answer decides)')
    return withAnswer(state.status === 'FAIL' && answer ? pass('the About dialog was closed; judge by the answer') : state, answer, { expect: 'the answer gives the version number that the About dialog shows' })
  },

  async 'T31.1'(ctx) {
    const page = await desktopPage(ctx)
    const topic = await page.getByTestId('help-article').getAttribute('data-topic').catch(() => null)
    return all([[topic === 'notepad', `Help and Support shows the topic ${topic ?? 'none'} (want notepad)`]])
  },

  async 'T31.2'(ctx, { answer }) {
    const page = await desktopPage(ctx)
    const topic = await page.getByTestId('help-article').getAttribute('data-topic').catch(() => null)
    const state = all([[topic === 'terminal', `Help and Support shows the topic ${topic ?? 'none'} (want terminal)`]])
    return withAnswer(state, answer, { keywords: [['read only', 'read-only', 'cannot type', 'only watch', 'watch', 'shows what the agent']], expect: 'the Terminal only shows what the agent runs; the user cannot type commands in it' })
  }
}

void manual

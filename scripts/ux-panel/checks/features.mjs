// Checkers of T25.x to T31.x (features added after the sprint plan).
import { TEST_PAGE_URL } from '../lib/fixtures.mjs'
import { agentMessages, all, countWords, fail, manual, pass, resourceText, textOf, userMessages, userText, windowsOf, withAnswer } from './util.mjs'

/** H-26: the file fills the window when the editor is at least 90 percent as wide as the Code window's client area. */
export const FILL_RATIO = 0.9
export const fillsWindow = (editorWidth, windowWidth) => windowWidth > 0 && editorWidth / windowWidth >= FILL_RATIO

/**
 * H-28: the tabs of the Browser. The first one stays the test page and is active; the second one is the page the scenario
 * names (`<test page address>second`) and loaded (its title is not empty and not an error page).
 */
export function judgeTabs(tabs, testPageUrl) {
  const second = tabs[1]
  const secondUrl = `${testPageUrl}second`
  const loaded = Boolean(second) && !/^\s*$|can't be displayed|could not be reached|ERR_|error/i.test(second.label ?? '')
  return [
    [tabs.length === 2, `${tabs.length} tab(s) (want 2)`],
    [tabs[0]?.active === 'true', 'the first tab is the active one'],
    [Boolean(tabs[0]) && String(tabs[0].url).startsWith(testPageUrl) && !String(tabs[0].url).startsWith(secondUrl), `the first tab still shows the test page (${tabs[0]?.url ?? 'none'})`],
    [Boolean(second) && String(second.url).startsWith(secondUrl), `the second tab has the address ${secondUrl} (${second?.url ?? 'none'})`],
    [loaded, `the second page loaded (tab title "${second?.label ?? ''}")`]
  ]
}

/**
 * H-47: reads the tabs of the Browser. The tab is one `button.tab` with the address in its `title` attribute and the page
 * title in `.label` (BrowserApp.svelte); there is no `.tabtitle` child. No closure: Playwright serialises it into the page.
 */
export const readTabs = (els) => els.map((e) => ({ id: e.getAttribute('data-testid'), active: e.getAttribute('data-active'), url: e.getAttribute('title') ?? '', label: e.querySelector('.label')?.textContent ?? '' }))

/** H-47: an empty address or label means the selectors are stale (the markup changed), not that the user did something wrong. */
export const staleTabNotes = (tabs) => (tabs.some((t) => !t.url || !t.label) ? ['warning: a tab reading is empty (address or label); the selectors of readTabs may be stale after a markup change of BrowserApp.svelte'] : [])

/** H-23/H-38: the question sent from the pane names the file, a line, the selected text, or carries the desktop's selection. */
export const namesSelection = (message) => /index\.ts|lines?\s*\d|first (two|2)|export const (answer|question)/i.test(userText(message)) || (/"selection"/.test(resourceText(message)) && /index\.ts/.test(resourceText(message)))

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
    return withAnswer(state, answer, { keywords: [countWords(2), ['change', 'not approved', 'not happy']], expect: 'the verdict is "Changes requested" and there are 2 comments' })
  },

  async 'T26.1'(ctx) {
    const entries = await ctx.transcript(ctx.state.sessionId)
    const sent = userMessages(entries).find((m) => /notes\.txt:4/.test(userText(m)))
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
      [!userMessages(entries).some((m) => /rename this/i.test(userText(m))), 'the chat did not get it']
    ])
  },

  async 'T27.1'(ctx) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    const code = windowsOf(state, 'code')[0]
    if (!code?.asideSessionId) return fail('the Code window has no chat pane conversation yet')
    const entries = await ctx.transcript(code.asideSessionId)
    const questions = userMessages(entries)
    const named = questions.find(namesSelection)
    return all(
      [
        [questions.length > 0, 'a question was sent from the pane'],
        [Boolean(named), 'the question names index.ts or lines, or carries the selection'],
        [agentMessages(entries).length > 0, 'the assistant answered in the pane'],
        [windowsOf(state, 'chat').length === 0, 'no separate Chat window was opened']
      ],
      [`question: ${userText(questions[0] ?? {}).slice(0, 120)}`]
    )
  },

  async 'T27.2'(ctx) {
    const page = await desktopPage(ctx)
    const open = await page.locator('[data-testid="window-code"] [data-testid="embedded-chat"][data-collapsed="false"]').count()
    const edge = await page.locator('[data-testid="window-code"] [data-testid="chat-pane-toggle"], [data-testid="window-code"] [data-testid="embedded-chat"][data-collapsed="true"]').count()
    // H-26: the editor must really fill the window (the pane being hidden is not enough: a fixed editor width leaves a grey area).
    const box = async (sel) => (await page.locator(sel).first().boundingBox().catch(() => null))?.width ?? 0
    const editorWidth = await box('[data-testid="window-code"] [data-testid="code-editor"]')
    const windowWidth = await box('[data-testid="window-code"] [data-testid="code-app"]')
    return all(
      [
        [open === 0, open ? 'the chat pane is still open' : 'the chat pane is hidden'],
        [edge > 0, 'the Code window still offers a way to show it again'],
        [fillsWindow(editorWidth, windowWidth), `the file area is ${Math.round(editorWidth)} px wide of ${Math.round(windowWidth)} px (want at least ${FILL_RATIO * 100} percent)`]
      ],
      [`editor width ${Math.round(editorWidth)} of window width ${Math.round(windowWidth)}`]
    )
  },

  async 'T28.1'(ctx, { answer }) {
    const entries = await ctx.transcript(ctx.state.sessionId)
    const page = await desktopPage(ctx)
    const address = await page.getByTestId('browser-address').inputValue().catch(() => '')
    const state = all([
      [agentMessages(entries).some((m) => /found it in #general/.test(textOf(m))), 'the assistant finished the web app job (its last reply says it found the message in #general; H-71)'],
      [/:4174/.test(address), `the Browser shows the web app (${address || 'no address'})`]
    ])
    return withAnswer(state, answer, { keywords: [['agent', 'assistant'], ['page', 'browser', 'bar']], expect: 'the panelist saw the Browser say the agent is using the page (activity bar and ring) and can say what was posted' })
  },

  async 'T28.2'(ctx) {
    // H-33: "take over" (userInControl) and "Pause all agents" (paused) both make the assistant leave the page alone.
    const state = await ctx.desktopState(ctx.state.desktopId)
    const control = state?.userInControl === true ? 'userInControl' : state?.paused === true ? 'paused' : null
    const calls = async () => (await ctx.transcript(ctx.state.sessionId)).filter((e) => e.kind === 'tool_call').length
    // No tool call may start in the next 3 seconds (the slow job calls a tool every 1.8 s).
    const before = control ? await calls() : 0
    if (control) await (ctx.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))))(3000)
    const after = control ? await calls() : 0
    return all(
      [
        [control !== null, `userInControl is ${state?.userInControl}, paused is ${state?.paused} (want one of them true)`],
        [after === before, `no tool call in the last 3 s (${before} -> ${after})`]
      ],
      [`control used: ${control ?? 'none'}; researcher: see log.jsonl, was it the bar's Take over, the top bar's Pause all agents, or the taskbar or tray control?`]
    )
  },

  async 'T29.1'(ctx) {
    const page = await desktopPage(ctx)
    const tabs = await page
      .locator('[data-testid^="browser-tab-"]:not([data-testid^="browser-tab-close"]):not([data-testid="browser-tab-new"])')
      .evaluateAll(readTabs)
    return all(judgeTabs(tabs, ctx.state.testPageUrl ?? TEST_PAGE_URL), staleTabNotes(tabs))
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

  async 'T31.1'(ctx, { answer }) {
    const page = await desktopPage(ctx)
    const topic = await page.getByTestId('help-article').getAttribute('data-topic').catch(() => null)
    // H-84: the answer names the shortcut (Ctrl+S); a clause that the panelist did not see on screen does not count as evidence.
    return withAnswer(all([[topic === 'notepad', `Help and Support shows the topic ${topic ?? 'none'} (want notepad)`]]), answer, { keywords: [['ctrl+s', 'ctrl + s', 'control+s', 'control + s', 'ctrl-s']], expect: 'the answer names Ctrl+S (read from the Notepad topic in a shot)' })
  },

  async 'T31.2'(ctx, { answer }) {
    const page = await desktopPage(ctx)
    const topic = await page.getByTestId('help-article').getAttribute('data-topic').catch(() => null)
    const state = all([[topic === 'terminal', `Help and Support shows the topic ${topic ?? 'none'} (want terminal)`]])
    return withAnswer(state, answer, { keywords: [['read only', 'read-only', 'cannot type', 'only watch', 'watch', 'shows what the agent']], expect: 'the Terminal only shows what the agent runs; the user cannot type commands in it' })
  }
}

void manual

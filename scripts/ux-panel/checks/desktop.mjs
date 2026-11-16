// J10, J12-J15, J19, J20: tools follow apps, drives, disconnect, many desktops, browser, investigate.
import { LOGIN_ORIGINAL, REDIRECT_BUG, TEST_PAGE_URL } from '../lib/fixtures.mjs'
import { all, fail, lastProgress, manual, pass, projectRoot, readText, windowsOf, withAnswer } from './util.mjs'

const loginAppIntact = (ctx) => readText(ctx.fixtures.loginApp, 'src/auth/redirect.ts') === REDIRECT_BUG && readText(ctx.fixtures.loginApp, 'src/auth/login.ts') === LOGIN_ORIGINAL

export const checks = {
  async 'T10.1'(ctx, { answer }) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    if (!state) return fail('the desktop window is closed')
    const denied = (await ctx.policy()).groups.terminal === 'deny'
    const closed = windowsOf(state, 'terminal').length === 0 && !state.tools.includes('terminal')
    const stateResult = denied ? pass('Terminal policy is Deny (Permissions route)') : closed ? pass('no Terminal window is open and the terminal tool is off (closing route)') : fail('Terminal is still usable: a Terminal window is open or its tool is on, and the policy is not Deny')
    return withAnswer(stateResult, answer, {
      keywords: [['chip', 'top bar', 'tools', 'workspace bar', 'agent can use', 'closed', 'deny', 'denied']],
      expect: 'the panelist names the chip list (Workspace bar / Agent can use), the closed Terminal or the Deny policy as the proof'
    })
  },

  async 'T10.2'(ctx, { answer }) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    if (!state) return fail('the desktop window is closed')
    return withAnswer(
      all([
        [state.tools.includes('fs.read'), 'read files is on'],
        [!state.tools.includes('terminal'), 'run commands is off'],
        [state.tools.includes('browser'), 'browse is on']
      ]),
      answer,
      { expect: 'read files: yes, run commands: no, browse the web: yes' }
    )
  },

  async 'T12.1'(ctx) {
    const drives = (await ctx.drives(ctx.state.desktopId)).filter((d) => d.kind === 'removable')
    return all([
      [drives.length === 1 && drives[0].label === 'docs-site', `removable drives: ${drives.map((d) => `${d.letter}:${d.label}`).join(', ') || 'none'} (want only docs-site)`],
      [loginAppIntact(ctx), 'the login-app folder on disk is untouched']
    ])
  },

  async 'T12.2'(ctx, { answer }) {
    const drives = await ctx.drives(ctx.state.desktopId)
    return withAnswer(all([[drives.some((d) => d.kind === 'removable' && d.folderId === ctx.state.ejectedFolderId), 'login-app is plugged in again']]), answer, { keywords: [['drive was removed', 'drive is missing', 'drive was ejected', 'ejected', 'unplugged', 'not plugged in', 'removed the drive', 'was removed', 'is not plugged']], expect: 'the answer names the missing drive as the cause' })
  },

  async 'T13.1'(ctx) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    const entries = await ctx.transcript(ctx.state.sessionId)
    const progress = lastProgress(entries)
    const toolCalls = entries.filter((e) => e.kind === 'tool_call').length
    const runState = (await ctx.launcherList()).find((d) => d.id === ctx.state.desktopId)?.runState ?? 'unknown'
    const chatOpen = windowsOf(state, 'chat').some((w) => w.view.sessionId === ctx.state.sessionId)
    return all(
      [
        [Boolean(state), 'the desktop is connected again'],
        [progress > (ctx.state.progressAtStart ?? 0) || toolCalls > (ctx.state.toolCallsAtStart ?? 0), `the chat shows new progress (last "N of 30" is ${progress}, was ${ctx.state.progressAtStart ?? 0} at the start; ${toolCalls} tool calls, was ${ctx.state.toolCallsAtStart ?? 0})`]
      ],
      [`run state at reconnect: ${runState}`, `chat window ${chatOpen ? 'is open' : 'is not open'}`, 'researcher: the session log should show the chat window or the desktop was closed (disconnect) and later reopened from the launcher']
    )
  },

  async 'T13.2'(ctx) {
    const entries = await ctx.transcript(ctx.state.sessionId)
    const requests = entries.filter((e) => e.kind === 'tool_call' && e.permission)
    const state = await ctx.desktopState(ctx.state.desktopId)
    return all([
      [requests.length > 0 && requests.every((r) => r.permission.outcome === 'selected' && String(r.permission.selectedOptionId).startsWith('allow')), 'the request was answered Allow'],
      [Boolean(state), 'the desktop is connected']
    ])
  },

  async 'T14.1'(ctx, { answer }) {
    const list = await ctx.launcherList()
    const row = list.find((d) => d.id === ctx.state.pendingDesktopId)
    void answer // the scenario does not ask for the error desktop, so the answer is not checked
    return all([[row?.connected === true, 'the desktop with the pending request is connected']], ['researcher: record whether the waiting row was preselected when the launcher opened'])
  },

  async 'T14.2'(ctx) {
    const list = await ctx.launcherList()
    const row = list.find((d) => d.title === 'Experiments')
    return all([
      [row?.id === ctx.state.desktopId, 'the desktop is called "Experiments"'],
      [!list.some((d) => d.title === 'Try new ideas'), 'the old name is gone']
    ])
  },

  async 'T15.1'(ctx, { answer }) {
    const list = await ctx.launcherList()
    return withAnswer(
      all([
        [!list.some((d) => d.title === 'Try new ideas'), '"Try new ideas" is deleted'],
        [loginAppIntact(ctx), 'the project folder remains']
      ]),
      answer,
      { keywords: [['chat'], ['c:', 'drive', 'notes', 'logs'], ['stay', 'kept', 'remain', 'ejected', 'not deleted']], expect: 'chats and C: files are lost, the project folder stays' }
    )
  },

  async 'T19.1'(ctx, { answer }) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    if (!state) return fail('the desktop window is closed')
    const browser = windowsOf(state, 'browser')[0]
    const host = new URL(ctx.state.testPageUrl ?? TEST_PAGE_URL).host
    return withAnswer(
      all([
        [Boolean(browser) && String(browser.view.url).includes(host), `a Browser window shows the page (${browser?.view.url ?? 'none'}; want ${host})`],
        [state.tools.includes('browser'), 'the Browser chip is on']
      ]),
      answer,
      { keywords: [['assistant can', 'agent can', 'can now see', 'can see the page', 'can read the page', 'assistant sees', 'agent sees', 'browser chip', 'chip is on']], expect: 'the panelist said the assistant can now see the page' }
    )
  },

  async 'T19.2'(ctx, { answer }) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    if (!state) return fail('the desktop window is closed')
    return withAnswer(all([[windowsOf(state, 'browser').length > 0, 'the Browser window is open']]), answer, { keywords: [["could not connect", "couldn't connect", "can't connect", 'cannot connect', 'not connect', 'unreachable', 'refused', 'no network', 'no internet', 'not load', 'refresh']], expect: 'the panelist names the connection problem and retried via Refresh or a new address (check the session log)' })
  },

  async 'T20.1'(ctx, { answer }) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    if (!state) return fail('the desktop window is closed')
    return withAnswer(all([[windowsOf(state, 'event-viewer').length > 0, 'the Event Viewer is open']]), answer, { keywords: [[`${ctx.state.ejectedLetter}:`, 'drive', 'eject', 'removed']], expect: 'the answer names the removed drive' })
  },

  async 'T20.2'(ctx) {
    const procs = await ctx.processes()
    const mine = procs.filter((p) => p.desktopId === ctx.state.desktopId)
    return all([[mine.length === 0, `agent processes left on the desktop: ${mine.length}`], [(await ctx.launcherList()).length > 0, 'the app still runs']])
  }
}

void manual
void pass
void projectRoot

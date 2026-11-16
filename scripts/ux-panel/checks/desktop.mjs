// J10, J12-J15, J19, J20: tools follow apps, drives, disconnect, many desktops, browser, investigate.
import { LOGIN_ORIGINAL, REDIRECT_BUG } from '../lib/fixtures.mjs'
import { all, fail, manual, pass, projectRoot, readText, windowsOf, withAnswer } from './util.mjs'

const loginAppIntact = (ctx) => readText(ctx.fixtures.loginApp, 'src/auth/redirect.ts') === REDIRECT_BUG && readText(ctx.fixtures.loginApp, 'src/auth/login.ts') === LOGIN_ORIGINAL

export const checks = {
  async 'T10.1'(ctx, { answer }) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    if (!state) return fail('the desktop window is closed')
    return withAnswer(
      all([
        [windowsOf(state, 'terminal').length === 0, 'no Terminal window is open'],
        [!state.tools.includes('terminal'), 'the terminal tool group is off (no Terminal chip)']
      ]),
      answer,
      { keywords: [['chip', 'top bar', 'tools']], expect: 'the panelist names the chip list in the top bar as the proof' }
    )
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
    return withAnswer(all([[drives.some((d) => d.kind === 'removable' && d.folderId === ctx.state.ejectedFolderId), 'login-app is plugged in again']]), answer, { keywords: [['drive', 'eject', 'removed', 'not plugged', 'unplug']], expect: 'the answer names the missing drive as the cause' })
  },

  async 'T13.1'(ctx) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    const entries = await ctx.transcript(ctx.state.sessionId)
    return all(
      [
        [Boolean(state), 'the desktop is connected again'],
        [entries.length > (ctx.state.messagesAtStart ?? 0), `the chat shows new progress (${entries.length} rows, ${ctx.state.messagesAtStart} at the start)`]
      ],
      ['researcher: the session log should show the window was closed and later reopened from the launcher']
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
    return withAnswer(all([[row?.connected === true, 'the desktop with the pending request is connected']]), answer, { keywords: [ctx.state.errorDesktopTitle], expect: `the answer names the desktop with the error: "${ctx.state.errorDesktopTitle}"` })
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
      { keywords: ['chat'], expect: 'chats and C: files are lost, the project folder stays' }
    )
  },

  async 'T19.1'(ctx, { answer }) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    if (!state) return fail('the desktop window is closed')
    const browser = windowsOf(state, 'browser')[0]
    return withAnswer(
      all([
        [Boolean(browser) && String(browser.view.url).includes('127.0.0.1:4173'), `a Browser window shows the page (${browser?.view.url ?? 'none'})`],
        [state.tools.includes('browser'), 'the Browser chip is on']
      ]),
      answer,
      { keywords: [['assistant', 'agent', 'can see', 'chip']], expect: 'the panelist said the assistant can now see the page' }
    )
  },

  async 'T19.2'(ctx, { answer }) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    if (!state) return fail('the desktop window is closed')
    return withAnswer(all([[windowsOf(state, 'browser').length > 0, 'the Browser window is open']]), answer, { keywords: [['connect', 'network', 'unreachable', 'refused', 'internet']], expect: 'the panelist names the connection problem and retried via Refresh or a new address (check the session log)' })
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

// J01-J04: launcher, desktops, projects, chats.
import { all, fail, manual, pass, textOf, userMessages, windowsOf, withAnswer } from './util.mjs'

export const checks = {
  async 'T01.1'(ctx) {
    const launcher = await ctx.launcher()
    const dialog = await launcher.getByTestId('new-desktop-dialog').isVisible().catch(() => false)
    const list = await ctx.launcherList()
    return dialog || list.length ? pass(dialog ? 'the New desktop dialog is open' : `a desktop was created (${list[0].title})`) : fail('no New desktop dialog and no desktop')
  },

  async 'T02.1'(ctx) {
    const list = await ctx.launcherList()
    const d = list.filter((x) => x.title === 'Fix login redirect')
    if (list.length !== 1 || d.length !== 1) return fail(`expected exactly one desktop "Fix login redirect", found ${list.map((x) => `"${x.title}"`).join(', ') || 'none'}`)
    return all([
      [d[0].drives.some((x) => x.label === 'login-app'), 'login-app is plugged in'],
      [d[0].connected, 'its window is open']
    ])
  },

  async 'T02.2'(ctx, { answer }) {
    const list = await ctx.launcherList()
    const titles = list.map((x) => x.title)
    const second = list.find((x) => x.id !== ctx.state.desktopId)
    return withAnswer(
      all([
        [list.length === 2, `two desktops exist (${titles.join(', ')})`],
        [new Set(titles).size === 2, 'the names differ'],
        [Boolean(second?.drives.some((x) => x.label === 'docs-site')), 'the second desktop has docs-site plugged in']
      ]),
      answer,
      { keywords: [['already', 'exists', 'same name', 'own name', 'unique', 'in use', 'taken']], expect: 'the panelist states why the first name was refused (the name is already used)' }
    )
  },

  async 'T03.1'(ctx) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    if (!state) return fail('the desktop window is closed')
    const docs = state.drives.find((d) => d.label === 'docs-site')
    const explorers = windowsOf(state, 'explorer')
    return all([
      [Boolean(docs), 'docs-site is plugged in'],
      [explorers.some((w) => docs && String(w.view.path).toUpperCase() === `${docs.letter}:\\`), 'an Explorer window shows its root']
    ])
  },

  async 'T04.1'(ctx) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    if (!state) return fail('the desktop window is closed')
    const drive = state.drives.find((d) => d.label === 'login-app')
    const chats = windowsOf(state, 'chat')
    const sessions = await ctx.sessions(ctx.state.desktopId)
    const ok = chats.map((w) => sessions.find((s) => s.id === w.view.sessionId)).filter((s) => s && drive && s.cwd.toUpperCase().startsWith(`${drive.letter}:`))
    return all([
      [ok.length > 0, 'a chat window is open with the login-app drive as its working folder'],
      [ok.some((s) => s.status === 'idle'), 'the agent is connected (ready)']
    ])
  },

  async 'T04.2'(ctx) {
    const state = await ctx.desktopState(ctx.state.desktopId)
    if (!state) return fail('the desktop window is closed')
    const chats = windowsOf(state, 'chat').filter((w) => w.view.sessionId === ctx.state.sessionId)
    const users = userMessages(await ctx.transcript(ctx.state.sessionId)).length
    return all([
      [chats.length === 1, 'the chat window of the same chat is open'],
      [users >= 3, `the transcript still has ${users} user messages`]
    ])
  }
}

void manual
void textOf

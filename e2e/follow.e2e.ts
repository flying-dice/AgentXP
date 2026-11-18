import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ControlClient } from '../agents/scripted-agent/controlClient'
import type { AgentXPApi } from '../src/shared/ipc'
import { createWorkspace, see, serveFixtureWeb, setToolPolicy, setWindowSize, shot as shotOf, startScriptedDesktop, type ScriptedDesktop, type WebServer, type Workspace } from './fixtures'

const AUTH = Array.from({ length: 12 }, (_, i) => `// line ${i + 1}`).join('\n') + '\n'

/**
 * Follow (docs/AGENT_PRESENCE.md, section 7), with follow-steps.json: the operator follows a chat from its View menu, a
 * team room member row or the top-bar agents popup; the followed chat's reads and edits move Code to the lines with its
 * cursor, its run shows in the Terminal, the focus never moves; typing pauses the projection; Stop following, Pause and
 * the end of the turn end it (Keep following keeps it).
 */
describe('Follow', () => {
  let ctx: ScriptedDesktop
  let workspace: Workspace
  let control: ControlClient
  const shot = (name: string): Promise<void> => shotOf(ctx.desktopPage, `follow-${name}`)
  const page = () => ctx.desktopPage
  const following = () => page().getByTestId('topbar-following')
  const cursor = () => page().getByTestId('agent-cursor')
  const editor = () => ctx.desktop.window('code').getByTestId('code-editor')
  const followFromMenu = async (index = 0): Promise<void> => {
    await ctx.desktop.window('chat', index).getByTestId('menubar-view').click()
    await page().getByTestId('chat-menu-follow').click()
  }
  const pauseAt = async (label: string): Promise<void> => {
    expect((await control.waitForPause()).label).toBe(label)
  }
  const idle = async (index = 0): Promise<void> => see.attribute(ctx.desktop.chat(index).transcript, 'data-running', 'false')

  beforeAll(async () => {
    workspace = await createWorkspace({ 'auth.ts': AUTH })
    ctx = await startScriptedDesktop({ script: 'follow-steps', name: 'Builder', title: 'Follow desktop', workspace })
    await setToolPolicy(page(), { 'fs.write': 'allow', terminal: 'allow' })
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat().composer)
    while (await ctx.desktop.balloon.isVisible()) await page().getByTestId('balloon-close').click()
    control = await ctx.scripted.control()
  })
  afterAll(async () => {
    control?.close()
    await ctx?.close()
  })

  it('View > Follow this chat: the top bar says Following Builder, with Stop following and Keep following', async () => {
    await followFromMenu()
    await see.visible(following())
    await see.text(following(), /Following Builder/)
    await see.attribute(following(), 'data-agent', 'Builder')
    await see.visible(page().getByTestId('topbar-stop-following'))
    await see.visible(page().getByTestId('topbar-keep-following'))
    // The menu item is checked now.
    await ctx.desktop.window('chat').getByTestId('menubar-view').click()
    await see.attribute(page().getByTestId('chat-menu-follow'), 'aria-checked', 'true')
    await page().keyboard.press('Escape')
    await shot('01-following')
  })

  it("Code follows the chat's read and edit at the lines, its cursor goes there, and the focus stays in the chat", async () => {
    await ctx.desktop.chat().send('follow steps')
    await pauseAt('read')
    await control.next()
    await see.visible(ctx.desktop.window('code'))
    await see.attribute(editor(), 'data-path', 'E:\\auth.ts')
    await see.attribute(editor(), 'data-highlight', '3-5')
    await see.attribute(cursor(), 'data-agent', 'Builder')
    await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')
    // No note callout: Follow is quiet.
    await see.count(page().getByTestId('show-callout'), 0)
    await shot('02-read')
    await pauseAt('edit')
    await control.next()
    await see.attribute(editor(), 'data-highlight', '8-8')
    await see.text(editor(), /line 8 \(checked\)/)
    await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')
    await shot('03-edit')
  })

  it('a run brings the Terminal forward on it, without the focus', async () => {
    await pauseAt('run')
    await control.next()
    await see.visible(ctx.desktop.window('terminal'))
    await see.text(ctx.desktop.window('terminal').getByTestId('terminal-output'), /followed/)
    await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')
    await shot('04-run')
  })

  it('typing in Notepad pauses the projection and keeps the focus there; it resumes after', async () => {
    await pauseAt('read again')
    const notepad = await ctx.desktop.openApp('notepad')
    const text = notepad.getByTestId('notepad-text')
    await text.click()
    await text.press('a')
    await control.next()
    // Keep typing until the read is done: Code must not move while the operator types.
    const reads = ctx.desktop.chat().toolCalls.filter({ hasText: 'Read a file' })
    for (let i = 0; i < 40 && (await reads.last().getAttribute('data-status')) !== 'done'; i++) await text.press('b')
    await see.attribute(reads.last(), 'data-status', 'done')
    await text.press('c')
    expect(await editor().getAttribute('data-highlight')).toBe('8-8')
    await see.attribute(notepad, 'data-focused', 'true')
    expect(await text.evaluate((el) => el === document.activeElement)).toBe(true)
    await shot('05-typing-paused')
    // The operator stops typing: after the grace period the newest step lands.
    await see.attribute(editor(), 'data-highlight', '10-11')
    await see.attribute(notepad, 'data-focused', 'true')
    await shot('06-resumed')
  })

  it('Stop following stops the projection', async () => {
    await pauseAt('done')
    await page().getByTestId('topbar-stop-following').click()
    await see.gone(following())
    // The operator ended it: no "Stopped following" line.
    await see.count(page().getByTestId('topbar-follow-ended'), 0)
    await control.next()
    await idle()
  })

  it('the end of the turn ends it, unless Keep following is checked', async () => {
    await ctx.desktop.taskbarItem('chat').click()
    await followFromMenu()
    await see.visible(following())
    await page().getByTestId('topbar-keep-following').click()
    await ctx.desktop.chat().send('hello')
    await idle()
    await see.text(ctx.desktop.chat().agentMessages.last(), 'Nothing to do.')
    await see.visible(following())
    await page().getByTestId('topbar-keep-following').click()
    await ctx.desktop.chat().send('hello again')
    await idle()
    await see.gone(following())
    await see.text(page().getByTestId('topbar-follow-ended'), 'Stopped following Builder: the turn ended.')
    await shot('07-turn-ended')
  })

  it('Pause ends it: no cursor, the top bar says why', async () => {
    await followFromMenu()
    await see.visible(following())
    await ctx.desktop.chat().send('follow steps')
    await pauseAt('read')
    await ctx.desktop.pauseButton.click()
    await see.attribute(page().getByTestId('topbar'), 'data-state', 'paused')
    await see.gone(following())
    await see.count(cursor(), 0)
    await see.text(page().getByTestId('topbar-follow-ended'), 'Stopped following Builder: agents are paused.')
    await shot('08-paused')
    await ctx.desktop.pauseButton.click()
    await see.attribute(page().getByTestId('topbar'), 'data-state', /idle|working/)
    await idle()
  })

  it('two chats working: "2 agents working" opens the agents popup with both, and Follow there follows one', async () => {
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat(1).composer)
    // Enter sends (the windows overlap, so no pointer clicks on a covered Send button).
    await ctx.desktop.chat(0).composer.fill('keep busy')
    await ctx.desktop.chat(0).composer.press('Enter')
    await ctx.desktop.chat(1).composer.fill('keep busy')
    await ctx.desktop.chat(1).composer.press('Enter')
    const link = page().getByTestId('topbar-agents-link')
    await see.text(link, '2 agents working')
    await link.click()
    const menu = page().getByTestId('topbar-agents-menu')
    await see.visible(menu)
    await see.count(menu.getByTestId('topbar-agents-row'), 2)
    await see.text(menu.getByTestId('topbar-agents-step').first(), 'reading auth.ts')
    await shot('09-agents-popup')
    await setWindowSize(ctx.app, page(), 900, 600)
    await see.visible(menu)
    await shot('10-agents-popup-small')
    await menu.getByTestId('topbar-agents-follow').first().click()
    await see.gone(menu)
    await see.visible(following())
    // Each turn reads for 8 s, then answers.
    await idle(0)
    await idle(1)
    await see.gone(following())
  })

  it('a team room member: its row shows its step in plain words, Follow follows it with its own cursor', async () => {
    const roomId = await page().evaluate(async (desktopId) => {
      const api = (window as unknown as { agentxp: AgentXPApi }).agentxp
      const tester = await api.profiles.create({ name: 'Tester', instructions: '', agentId: null, model: null, skillIds: [], mcpServerIds: [] })
      const team = await api.teams.create({ name: 'Dev', instructions: '', skillIds: [], memberIds: [tester.id], boardRef: null })
      const created = await api.rooms.create(desktopId, team.id, 'E:\\')
      await api.desktop.openWindow({ desktopId, app: 'team-chat', roomId: created.id })
      return created.id
    }, ctx.desktopId)
    expect(roomId).toBeGreaterThan(0)
    const room = ctx.desktop.window('team-chat')
    await see.visible(room.getByTestId('team-chat-app'))
    await room.getByTestId('team-chat-input').fill('member steps please')
    await room.getByTestId('team-chat-send').click()
    // The member runs in its own agent program (no control socket): its script waits 5 s on the read, then reads lines 6-7.
    const member = room.getByTestId('team-chat-member')
    await see.text(member.getByTestId('team-chat-member-step'), 'reading auth.ts')
    await member.getByTestId('team-chat-member-follow').click()
    await see.text(following(), /Following Tester/)
    await see.attribute(member, 'data-following', 'true')
    await shot('11-member-following')
    await see.attribute(editor(), 'data-highlight', '6-7')
    await see.visible(cursor().filter({ hasText: 'Tester' }))
    await see.attribute(room, 'data-focused', 'true')
    await shot('12-member-projected')
    await see.gone(following())
  })
})

/**
 * Follow checked in the real app beyond the walk above: with **Agent may open apps** on Ask nothing asks and only windows
 * that are already open follow; the agent cursor goes with its window (moved) and goes away at once when the window is
 * minimized; the Browser cursor points for a followed chat that is in the background.
 */
describe('Follow: open apps on Ask, the cursor and its window, the Browser in the background', () => {
  let ctx: ScriptedDesktop
  let workspace: Workspace
  let web: WebServer
  let control: ControlClient
  const shot = (name: string): Promise<void> => shotOf(ctx.desktopPage, `follow-${name}`)
  const page = () => ctx.desktopPage
  const following = () => page().getByTestId('topbar-following')
  const cursor = () => page().getByTestId('agent-cursor')
  const asks = () => page().getByTestId('uac-dialog')
  const editor = () => ctx.desktop.window('code').getByTestId('code-editor')
  const pauseAt = async (label: string): Promise<void> => {
    expect((await control.waitForPause()).label).toBe(label)
  }
  const followFromMenu = async (): Promise<void> => {
    await ctx.desktop.window('chat').getByTestId('menubar-view').click()
    await page().getByTestId('chat-menu-follow').click()
    await see.visible(following())
  }
  const left = async (): Promise<number> => cursor().evaluate((el) => (el as HTMLElement).getBoundingClientRect().left)

  beforeAll(async () => {
    web = await serveFixtureWeb()
    workspace = await createWorkspace({ 'auth.ts': AUTH })
    ctx = await startScriptedDesktop({ script: 'follow-steps', name: 'Builder', title: 'Follow ask desktop', workspace })
    // Agent may open apps: Ask. Writing and running are allowed, so the only possible question is about opening a window.
    await setToolPolicy(page(), { 'fs.write': 'allow', terminal: 'allow', browser: 'allow' }, 'ask')
    await ctx.desktop.openApp('code')
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat().composer)
    while (await ctx.desktop.balloon.isVisible()) await page().getByTestId('balloon-close').click()
    control = await ctx.scripted.control()
  })
  afterAll(async () => {
    control?.close()
    await ctx?.close()
    await web?.close()
  })

  it('Agent may open apps on Ask: Code (open) follows, the Terminal (closed) does not open, and nothing asks', async () => {
    await followFromMenu()
    await ctx.desktop.chat().send('follow steps')
    await pauseAt('read')
    await control.next()
    await see.attribute(editor(), 'data-highlight', '3-5')
    await see.attribute(cursor(), 'data-agent', 'Builder')
    await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')
    await see.count(asks(), 0)
    await see.attribute(cursor(), 'data-state', 'arrived')
    await shot('13-ask-code-follows')
    // The window moves: the cursor goes with it (measured once the glide is over).
    const before = await left()
    const windowBefore = (await ctx.desktop.window('code').boundingBox())!
    const title = ctx.desktop.window('code').getByTestId('window-title')
    const box = (await title.boundingBox())!
    await page().mouse.move(box.x + 200, box.y + box.height / 2)
    await page().mouse.down()
    await page().mouse.move(box.x + 120, box.y + box.height / 2 + 40, { steps: 6 })
    await page().mouse.up()
    const windowAfter = (await ctx.desktop.window('code').boundingBox())!
    expect(windowAfter.x).toBeLessThan(windowBefore.x)
    await see.eventually(async () => expect(Math.round((await left()) - before)).toBe(Math.round(windowAfter.x - windowBefore.x)))
    await see.attribute(cursor(), 'data-state', /arrived|idle/)
    await pauseAt('edit')
    await control.next()
    await see.attribute(editor(), 'data-highlight', '8-8')
    await pauseAt('run')
    await control.next()
    await pauseAt('read again')
    // The run did not open the Terminal and did not ask to.
    await see.count(ctx.desktop.windows('terminal'), 0)
    await see.count(asks(), 0)
    await shot('14-ask-no-terminal-no-question')
    await control.next()
    await see.attribute(editor(), 'data-highlight', '10-11')
    await see.attribute(cursor(), 'data-state', 'arrived')
  })

  it('the cursor goes at once when its window is minimized, instead of floating where the window was', async () => {
    await ctx.desktop.minimizeWindow('code')
    await see.attribute(cursor(), 'data-state', 'hidden')
    await shot('15-cursor-gone-with-minimized-window')
    await pauseAt('done')
    await control.next()
    await see.attribute(ctx.desktop.chat().transcript, 'data-running', 'false')
    await see.count(asks(), 0)
  })

  it('the Browser: the cursor points for the followed chat while the operator is in another window, not for an unfollowed one', async () => {
    await ctx.desktop.openApp('browser')
    await see.visible(ctx.desktop.window('browser').getByTestId('browser-app'))
    const notepad = await ctx.desktop.openApp('notepad')
    await ctx.desktop.taskbarItem('chat').click()
    await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')
    await ctx.desktop.chat().send(`browse along at ${web.origin}/`)
    await pauseAt('click random')
    // Not followed and in the background: the click happens without the cursor.
    await ctx.desktop.taskbarItem('notepad').click()
    await see.attribute(notepad, 'data-focused', 'true')
    const pointed = await cursor().count()
    await control.next()
    await pauseAt('click general')
    expect(await cursor().count()).toBe(pointed)
    if (pointed > 0) expect(await cursor().getAttribute('data-state')).toMatch(/idle|hidden|cancelled/)
    // Followed, still in the background: the cursor goes to the button before the click.
    await ctx.desktop.taskbarItem('chat').click()
    await followFromMenu()
    await ctx.desktop.taskbarItem('notepad').click()
    await see.attribute(notepad, 'data-focused', 'true')
    await control.next()
    await see.attribute(cursor(), 'data-state', /gliding|arrived/)
    await see.attribute(cursor(), 'data-agent', 'Builder')
    await see.attribute(cursor(), 'data-state', /arrived|idle/)
    await see.attribute(notepad, 'data-focused', 'true')
    await shot('16-browser-followed-background')
    await pauseAt('browsed')
    await control.next()
    await see.attribute(ctx.desktop.chat().transcript, 'data-running', 'false')
  })
})

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ControlClient } from '../agents/scripted-agent/controlClient'
import { createWorkspace, see, setToolPolicy, shot as shotOf, startScriptedDesktop, type ScriptedDesktop, type Workspace } from './fixtures'

const AUTH = Array.from({ length: 12 }, (_, i) => `// line ${i + 1}`).join('\n') + '\n'
const NOTE = 'Here the token is checked before it expires'

/**
 * Show and the agent cursor (docs/AGENT_PRESENCE.md, sections 5 and 8), with show.json: the foreground chat's show lands
 * at the exact lines with the cursor and a note; any other chat asks with a request balloon; the operator's input, Pause
 * and the policy win; reduced motion jumps instead of gliding.
 */
describe('Show', () => {
  let ctx: ScriptedDesktop
  let workspace: Workspace
  let control: ControlClient
  const shot = (name: string): Promise<void> => shotOf(ctx.desktopPage, `show-${name}`)
  const callout = () => ctx.desktopPage.getByTestId('show-callout')
  const cursor = () => ctx.desktopPage.getByTestId('agent-cursor')
  const closeCode = async (): Promise<void> => {
    if ((await ctx.desktop.windows('code').count()) > 0) await ctx.desktop.closeWindow('code')
    await see.count(ctx.desktop.windows('code'), 0)
  }
  const sendAndWait = async (text: string, reply: string | RegExp): Promise<void> => {
    const chat = ctx.desktop.chat()
    const before = await chat.agentMessages.count()
    await chat.send(text)
    await see.eventually(async () => expect(await chat.agentMessages.count()).toBeGreaterThan(before))
    await see.attribute(chat.transcript, 'data-running', 'false')
    await see.text(chat.agentMessages.last(), reply)
  }

  beforeAll(async () => {
    workspace = await createWorkspace({ 'auth.ts': AUTH })
    ctx = await startScriptedDesktop({ script: 'show', name: 'Builder', title: 'Show desktop', workspace })
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat().composer)
    while (await ctx.desktop.balloon.isVisible()) await ctx.desktopPage.getByTestId('balloon-close').click()
  })
  afterAll(async () => {
    control?.close()
    await ctx?.close()
  })

  it('the foreground chat: Code comes forward at exactly those lines, the cursor arrives and the note says why', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('show the token check')
    const code = ctx.desktop.window('code')
    await see.visible(code)
    await see.attribute(code.getByTestId('code-editor'), 'data-highlight', '3-5')
    await see.attribute(cursor(), 'data-agent', 'Builder')
    await see.attribute(cursor(), 'data-state', /gliding|arrived/)
    await see.visible(callout())
    await see.attribute(cursor(), 'data-state', /arrived|idle/)
    await see.text(callout().getByTestId('show-callout-note'), NOTE)
    await see.text(callout().getByTestId('show-callout-label'), 'auth.ts:3-5')
    await see.attribute(callout(), 'data-agent', 'Builder')
    await see.text(ctx.desktopPage.getByTestId('notice-announcer'), `Builder shows you auth.ts:3-5: ${NOTE}`)
    // The operator keeps the keyboard: the chat still has the focus, the Code window is in front of it.
    await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')
    await shot('01-foreground-arrived')
    // The transcript keeps a row per show.
    await see.visible(chat.toolCalls.filter({ hasText: `Showed you auth.ts:3-5: ${NOTE}` }))
    await see.attribute(chat.transcript, 'data-running', 'false')
    control = await ctx.scripted.control()
  })

  it('Reply puts the note quoted in that chat\'s composer and ends the show', async () => {
    await ctx.desktopPage.getByTestId('show-callout-reply').click()
    await see.gone(callout())
    const composer = ctx.desktop.chat().composer
    await see.eventually(async () => expect(await composer.inputValue()).toContain(`> ${NOTE}`))
    await shot('02-reply-quoted')
    await composer.fill('')
  })

  it('OK dismisses the callout; Show again on the row lands at the spot without the cursor', async () => {
    await closeCode()
    await sendAndWait('show the token check', 'Shown now')
    await see.visible(callout())
    await ctx.desktopPage.getByTestId('show-callout-ok').click()
    await see.gone(callout())
    await closeCode()
    const row = ctx.desktop.chat().toolCalls.filter({ hasText: 'Showed you auth.ts:3-5' }).last()
    await row.getByTestId('tool-call-show-again').click()
    await see.attribute(ctx.desktop.window('code').getByTestId('code-editor'), 'data-highlight', '3-5')
    await see.visible(callout())
    // The operator asked: Code has the focus.
    await see.attribute(ctx.desktop.window('code'), 'data-focused', 'true')
    await ctx.desktopPage.getByTestId('show-callout-ok').click()
    await see.gone(callout())
  })

  it('typing during a show ends it and the focus stays in the operator\'s text box', async () => {
    await ctx.desktop.focusWindow('chat')
    await sendAndWait('show the end', 'Shown now')
    await see.visible(callout())
    const composer = ctx.desktop.chat().composer
    await composer.focus()
    await composer.press('h')
    await see.gone(callout())
    await see.attribute(cursor(), 'data-state', /cancelled|idle/)
    expect(await composer.evaluate((el) => el === document.activeElement)).toBe(true)
    expect(await composer.inputValue()).toBe('h')
    await composer.fill('')
  })

  it('a chat the operator is not in asks: only a request balloon until Show, then Code lands at the spot', async () => {
    await closeCode()
    const chat = ctx.desktop.chat()
    await chat.send('background show')
    expect((await control.waitForPause()).label).toBe('show')
    await ctx.desktop.openApp('notepad')
    await see.attribute(ctx.desktop.window('notepad'), 'data-focused', 'true')
    await control.next()
    await see.text(ctx.desktop.balloonTitle, 'Show request')
    await see.text(ctx.desktop.balloonText, 'Builder wants to show you auth.ts:8-9: This branch never runs')
    await see.text(ctx.desktop.balloonAction, 'Show')
    await see.text(ctx.desktopPage.getByTestId('balloon-secondary'), 'Not now')
    // The operator's view is unchanged.
    await see.count(ctx.desktop.windows('code'), 0)
    await see.count(callout(), 0)
    await see.attribute(ctx.desktop.window('notepad'), 'data-focused', 'true')
    await shot('03-background-request')
    await see.visible(chat.toolCalls.filter({ hasText: 'Asked to show you auth.ts:8-9' }))
    // Not now: the balloon goes, the request stays in the Action Center with "1 thing to look at".
    await ctx.desktopPage.getByTestId('balloon-secondary').click()
    // (The turn's summary balloon may come next: the operator was not in the chat.)
    await see.count(ctx.desktop.balloon.filter({ hasText: 'wants to show you' }), 0)
    await ctx.desktop.openActionCenter()
    await see.text(ctx.desktopPage.getByTestId('action-center-shows'), '1 thing to look at')
    const request = ctx.desktopPage.getByTestId('action-center-message').filter({ hasText: 'wants to show you auth.ts:8-9' })
    await shot('04-action-center-request')
    await request.getByTestId('action-center-message-action').filter({ hasText: 'Show' }).first().click()
    await see.attribute(ctx.desktop.window('code').getByTestId('code-editor'), 'data-highlight', '8-9')
    await see.text(callout().getByTestId('show-callout-note'), 'This branch never runs')
    await see.attribute(ctx.desktop.window('code'), 'data-focused', 'true')
    await shot('05-request-accepted')
    await ctx.desktopPage.getByTestId('show-callout-ok').click()
    await see.gone(callout())
    await ctx.desktop.closeWindow('notepad')
  })

  it('Pause hides the cursor and drops the show', async () => {
    await closeCode()
    await ctx.desktop.focusWindow('chat')
    await sendAndWait('show the token check', 'Shown now')
    await see.visible(callout())
    await ctx.desktop.pauseButton.click()
    await see.attribute(ctx.desktopPage.getByTestId('topbar'), 'data-state', 'paused')
    await see.count(callout(), 0)
    await see.count(cursor(), 0)
    await shot('06-paused')
    await ctx.desktop.pauseButton.click()
    await see.attribute(ctx.desktopPage.getByTestId('topbar'), 'data-state', /idle|working/)
  })

  it('reduced motion: the cursor jumps and pulses instead of gliding', async () => {
    await closeCode()
    await ctx.desktop.focusWindow('chat')
    await ctx.desktopPage.emulateMedia({ reducedMotion: 'reduce' })
    await ctx.desktop.chat().send('show the token check')
    await see.visible(callout())
    await see.attribute(cursor(), 'data-motion', 'reduced')
    await see.attribute(cursor(), 'data-state', /arrived|idle/)
    await shot('07-reduced-motion')
    await ctx.desktopPage.getByTestId('show-callout-ok').click()
    await see.gone(callout())
    await ctx.desktopPage.emulateMedia({ reducedMotion: 'no-preference' })
    await see.attribute(ctx.desktop.chat().transcript, 'data-running', 'false')
  })

  it('"Agent may show you things" Never: nothing moves, the row says Not shown (Never)', async () => {
    await closeCode()
    await ctx.desktop.focusWindow('chat')
    await setToolPolicy(ctx.desktopPage, { show: 'deny' })
    await sendAndWait('show the token check', 'Not shown (Never)')
    await see.visible(ctx.desktop.chat().toolCalls.filter({ hasText: 'Not shown (Never): auth.ts:3-5' }))
    await see.count(ctx.desktop.windows('code'), 0)
    await see.count(callout(), 0)
    await shot('08-never')
    await setToolPolicy(ctx.desktopPage, { show: 'allow' })
  })
})

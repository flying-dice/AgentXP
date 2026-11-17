import { afterAll, describe, expect, it } from 'vitest'
import { registerAgent, registerFakeAgent, see, startConnectedDesktop, type ConnectedDesktop } from './fixtures'

/** What the chat says and offers when the agent cannot start, or is stopped: plain words, Restart, no protocol names. */
describe('chat: the agent cannot start', () => {
  let ctx: ConnectedDesktop

  afterAll(async () => ctx?.app.close())

  it('says which program was not found in the chat itself, with buttons that stay reachable and no dialog box over them', async () => {
    ctx = await startConnectedDesktop({
      title: 'Broken agent',
      agent: (page) => registerAgent(page, { name: 'Broken agent', command: 'not-a-real-command', args: [], env: {} })
    })
    await ctx.desktop.openApp('chat')
    const chat = ctx.desktop.chat()
    await see.text(chat.errors, "Broken agent could not start: the program 'not-a-real-command' was not found.")
    expect(await chat.errors.innerText()).not.toMatch(/ACP|ENOENT|JSON/)
    await see.count(ctx.desktopPage.getByTestId('message-box'), 0)
    await see.text(chat.errors, 'Check the command in Agents, or choose another agent.')
    await see.text(chat.frame.getByTestId('chat-error-restart'), 'Try again')
    await see.visible(chat.frame.getByTestId('chat-error-open-agents'))
    await see.visible(chat.frame.getByTestId('chat-error-choose-agent'))
    // UX-174: a retry cannot find a program that is not there, so "Choose another agent" is the highlighted button and "Try again" is second.
    expect(await chat.frame.getByTestId('chat-error-choose-agent').getAttribute('class')).toMatch(/\bdef\b/)
    expect(await chat.frame.getByTestId('chat-error-restart').getAttribute('class')).not.toMatch(/\bdef\b/)
    await see.visible(chat.frame.getByTestId('chat-error-details'))
    await see.text(chat.frame.getByTestId('chat-status'), 'Disconnected')
    await see.visible(ctx.desktopPage.getByTestId('topbar-agent-problem'))
  })

  it('Details opens the technical text inline and Hide details closes it', async () => {
    const chat = ctx.desktop.chat()
    await chat.frame.getByTestId('chat-error-details').click()
    await see.text(chat.frame.getByTestId('chat-error-details-text'), 'ENOENT')
    // UX-174: the first line is the plain sentence of the box, never "Internal error".
    const details = await chat.frame.getByTestId('chat-error-details-text').innerText()
    expect(details).toMatch(/^Broken agent could not start/)
    // UX-196: then what to do, and the protocol lines below the label "Technical details".
    expect(details).toContain('What to do: open Agents and choose another agent.')
    expect(details.indexOf('Technical details')).toBeGreaterThan(details.indexOf('What to do'))
    expect(details.indexOf('ENOENT')).toBeGreaterThan(details.indexOf('Technical details'))
    await see.text(chat.frame.getByTestId('chat-error-details'), 'Hide details')
    await chat.frame.getByTestId('chat-error-details').click()
    await see.gone(chat.frame.getByTestId('chat-error-details-text'))
  })

  it('Open Agents opens Control Center at Agents and leaves the chat as it was', async () => {
    const chat = ctx.desktop.chat()
    // A second agent whose program is missing, not the default (UX-197).
    await registerAgent(ctx.desktopPage, { name: 'Other missing', command: 'also-not-a-real-command', args: [], env: {} }, { makeDefault: false })
    await chat.frame.getByTestId('chat-error-open-agents').click()
    await see.visible(ctx.desktop.window('control-centre'))
    await see.text(ctx.desktopPage.getByTestId('control-centre-heading'), 'Agents')
    await see.visible(chat.errors)
  })

  it('the Agents list marks an agent whose program is missing, and asks before it becomes the default (UX-197)', async () => {
    const rows = ctx.desktopPage.getByTestId('agents-row')
    // The default agent shows the same words as any other row; the built-in agent runs, so it says what it is.
    await see.text(rows.filter({ hasText: 'Broken agent' }), 'Not found')
    await see.text(rows.filter({ hasText: 'Other missing' }), 'Not found')
    expect(await rows.filter({ hasText: 'Scripted Agent' }).first().innerText()).not.toMatch(/Not found|Not installed/)
    await rows.filter({ hasText: 'Other missing' }).click()
    await ctx.desktopPage.getByTestId('agents-set-default').click()
    await see.text(ctx.desktopPage.getByTestId('message-box'), 'This program was not found. Make it the default anyway?')
    // No is the default answer: Enter keeps the old default.
    await ctx.desktopPage.getByTestId('message-box').getByTestId('dialog-button-no').click()
    await see.text(rows.filter({ hasText: 'Broken agent' }), 'Yes')
    expect(await rows.filter({ hasText: 'Other missing' }).innerText()).not.toMatch(/\bYes\b/)
  })

  it('Try again names the new default agent, and uses it', async () => {
    const chat = ctx.desktop.chat()
    // The person makes another agent the default in Control Center and closes it: back in the chat, the button says
    // which agent it will use.
    await registerFakeAgent(ctx.desktopPage, 'Working agent')
    await ctx.desktop.closeWindow('control-centre')
    await see.text(chat.frame.getByTestId('chat-error-restart'), 'Try again with Working agent')
    await chat.frame.getByTestId('chat-error-restart').click()
    await see.gone(chat.errors)
    await see.text(chat.frame.getByTestId('chat-status'), 'Connected')
  })

  it('Ctrl+N in the chat starts a new chat on the same folder', async () => {
    await ctx.desktop.chat().composer.press('Control+n')
    await see.visible(ctx.desktop.window('chat', 1))
  })
})

describe('chat: the agent program is stopped from Task Manager', () => {
  let ctx: ConnectedDesktop

  afterAll(async () => ctx?.app.close())

  it('the chat says so and Restart starts a new program', async () => {
    ctx = await startConnectedDesktop({ title: 'Stopped agent' })
    await ctx.desktop.openApp('chat')
    const chat = ctx.desktop.chat()
    await see.visible(chat.composer)
    await see.text(chat.frame.getByTestId('chat-status'), 'Connected')

    await ctx.desktop.openApp('agent-manager')
    const manager = ctx.desktop.window('agent-manager')
    await manager.getByTestId('menubar-view').click()
    await ctx.desktopPage.getByTestId('agent-manager-menu-tab-processes').click()
    await see.eventually(async () => expect(await manager.getByTestId('agent-manager-end-process').isEnabled()).toBe(true))
    await manager.getByTestId('agent-manager-end-process').click()
    await see.text(ctx.desktopPage.getByTestId('message-box'), "Its 1 chat will stop and work in progress is lost.")
    await ctx.desktopPage.getByTestId('message-box').getByTestId('dialog-button-yes').click()

    // UX-201: the user's own end is a plain notice, not a red box; one end is the first stop and is not "stopped again" (UX-141).
    await see.text(chat.errors, 'You ended the agent program. Click Restart to use the chat again.')
    await see.attribute(chat.errors, 'data-notice', 'true')
    expect(await chat.frame.getByTestId('chat-error-text').innerText()).not.toMatch(/stopped again|ended again/i)
    await chat.frame.getByTestId('chat-error-restart').click()
    await see.visible(chat.frame.getByTestId('chat-restart-status'))
    await see.gone(chat.errors)
    await see.text(chat.frame.getByTestId('chat-restart-status'), 'The agent is running again.')
    await see.text(chat.frame.getByTestId('chat-status'), 'Connected')
  })

  it('Event Viewer opens from the Tools menu of the chat and from the Activity list, and starts on warnings and errors (UX-121)', async () => {
    await ctx.desktop.closeWindow('agent-manager') // it covers the Activity list
    const chat = ctx.desktop.chat()
    await chat.frame.getByTestId('menubar-tools').click()
    await ctx.desktopPage.getByTestId('chat-menu-event-viewer').click()
    const viewer = ctx.desktop.window('event-viewer')
    await see.visible(viewer)
    await see.attribute(viewer.getByTestId('event-viewer-show-all'), 'aria-checked', 'false')
    // UX-171: the first view is never empty while the log is not; the hidden events are one link away.
    await see.eventually(async () => expect(await viewer.getByTestId('event-viewer-row').count()).toBeGreaterThan(0))
    if (await viewer.getByTestId('event-viewer-show-hidden').count()) await see.text(viewer.getByTestId('event-viewer-show-hidden'), 'Show all')
    await viewer.getByTestId('event-viewer-show-all').click()
    await see.attribute(viewer.getByTestId('event-viewer-show-all'), 'aria-checked', 'true')
    await ctx.desktop.closeWindow('event-viewer')
    await ctx.desktopPage.getByTestId('infopanel-activity-open-event-viewer').click()
    await see.visible(ctx.desktop.window('event-viewer'))
    await ctx.desktop.closeWindow('event-viewer')
    await ctx.desktopPage.getByTestId('infopanel-activity').dblclick()
    await see.visible(ctx.desktop.window('event-viewer'))
  })

  it('the mode list ends with "Ask before every action", which is the same switch as the top bar', async () => {
    await ctx.desktop.closeWindow('event-viewer') // the previous test leaves it open over the composer
    const chat = ctx.desktop.chat()
    await chat.frame.getByTestId('chat-mode').click()
    await see.visible(ctx.desktopPage.getByTestId('chat-mode-ask-first'))
    await ctx.desktopPage.getByTestId('chat-mode-ask-first').click()
    await see.attribute(ctx.desktopPage.getByTestId('topbar-take-control'), 'aria-checked', 'true')
  })
})

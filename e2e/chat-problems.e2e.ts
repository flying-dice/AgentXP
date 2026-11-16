import { afterAll, describe, expect, it } from 'vitest'
import { registerAgent, see, startConnectedDesktop, type ConnectedDesktop } from './fixtures'

/** What the chat says and offers when the agent cannot start, or is stopped: plain words, Restart, no protocol names. */
describe('chat: the agent cannot start', () => {
  let ctx: ConnectedDesktop

  afterAll(async () => ctx?.app.close())

  it('says which program was not found, offers Try again and Details, and shows the problem on the top bar', async () => {
    ctx = await startConnectedDesktop({
      title: 'Broken agent',
      agent: (page) => registerAgent(page, { name: 'Broken agent', command: 'not-a-real-command', args: [], env: {} })
    })
    await ctx.desktop.openApp('chat')
    const box = ctx.desktopPage.getByTestId('message-box')
    await see.visible(box)
    await see.text(box, "The program 'not-a-real-command' was not found.")
    await see.visible(ctx.desktopPage.getByTestId('message-box-action-agents'))
    await see.visible(ctx.desktopPage.getByTestId('message-box-action-other'))
    await ctx.desktopPage.getByTestId('message-box-action-close').click()
    await see.gone(box)

    const chat = ctx.desktop.chat()
    await see.text(chat.errors, 'The agent could not start.')
    expect(await chat.errors.innerText()).not.toMatch(/ACP|ENOENT|JSON/)
    await see.visible(chat.frame.getByTestId('chat-error-restart'))
    await see.visible(chat.frame.getByTestId('chat-error-details'))
    await see.text(chat.frame.getByTestId('chat-status'), 'Disconnected')
    await see.visible(ctx.desktopPage.getByTestId('topbar-agent-problem'))

    await chat.frame.getByTestId('chat-error-details').click()
    await see.text(ctx.desktopPage.getByTestId('message-box'), 'ENOENT')
    await ctx.desktopPage.getByTestId('message-box').getByTestId('dialog-button-ok').click()
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

    await see.text(chat.errors, 'The agent program was stopped.')
    await chat.frame.getByTestId('chat-error-restart').click()
    await see.gone(chat.errors)
    await see.text(chat.frame.getByTestId('chat-status'), 'Connected')
  })

  it('the mode list ends with "Ask before every action", which is the same switch as the top bar', async () => {
    const chat = ctx.desktop.chat()
    await chat.frame.getByTestId('chat-mode').click()
    await see.visible(ctx.desktopPage.getByTestId('chat-mode-ask-first'))
    await ctx.desktopPage.getByTestId('chat-mode-ask-first').click()
    await see.attribute(ctx.desktopPage.getByTestId('topbar-take-control'), 'aria-pressed', 'true')
  })
})

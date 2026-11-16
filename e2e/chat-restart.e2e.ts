import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { see, startScriptedDesktop, type ScriptedDesktop } from './fixtures'

/**
 * UX-140 and UX-141: the agent program is ended while a request runs. One end counts once ("again" only after a restart), and after
 * the second end Restart says that the request was not sent again and offers to send it in one click.
 */
describe('chat: the agent program ends while a request runs', () => {
  let ctx: ScriptedDesktop

  beforeAll(async () => {
    ctx = await startScriptedDesktop({ script: 'stepping', stepMode: 'manual', title: 'Restart desktop' })
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat().composer)
  })
  afterAll(async () => ctx?.close())

  /** Ends the agent program of the desktop from Task Manager (View > Processes > End Process, Yes). */
  async function endAgentProgram(): Promise<void> {
    await ctx.desktop.openApp('agent-manager')
    const manager = ctx.desktop.window('agent-manager')
    await manager.getByTestId('menubar-view').click()
    await ctx.desktopPage.getByTestId('agent-manager-menu-tab-processes').click()
    await see.eventually(async () => expect(await manager.getByTestId('agent-manager-end-process').isEnabled()).toBe(true))
    await manager.getByTestId('agent-manager-end-process').click()
    await ctx.desktopPage.getByTestId('message-box').getByTestId('dialog-button-yes').click()
    await ctx.desktop.closeWindow('agent-manager')
  }

  it('the first end says it once, without "again", and Restart and send again sends the request', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('step through')
    await see.attribute(chat.transcript, 'data-running', 'true')
    await endAgentProgram()
    await see.visible(chat.errors)
    expect(await chat.frame.getByTestId('chat-error-text').innerText()).not.toMatch(/again/i)
    await see.visible(chat.frame.getByTestId('chat-error-restart-send'))
    await chat.frame.getByTestId('chat-error-restart-send').click()
    await see.attribute(chat.transcript, 'data-running', 'true')
  })

  it('the second end after a restart says "again", keeps the text, and Restart then says the request was not sent again', async () => {
    const chat = ctx.desktop.chat()
    await endAgentProgram()
    await see.text(chat.frame.getByTestId('chat-error-text'), 'It stopped again')
    await see.text(chat.frame.getByTestId('chat-error-new-chat'), 'Start a new chat with your text')
    // UX-160: Restart is the highlighted button; Event Viewer is a link in the sentence after the buttons.
    expect(await chat.frame.getByTestId('chat-error-restart').getAttribute('class')).toContain('def')
    expect(await chat.frame.getByTestId('chat-error-event-viewer').getAttribute('class')).not.toContain('w7-btn')
    expect(await chat.frame.getByTestId('chat-error-text').innerText()).not.toContain('Show in Event Viewer')
    await chat.frame.getByTestId('chat-error-restart').click()
    await see.text(chat.frame.getByTestId('chat-restarted-note'), 'Agent7 restarted. Your last request was not sent again:')
    await see.text(chat.frame.getByTestId('chat-restarted-text'), 'step through')
  })

  it('Send it again sends the request in one click, and the note goes away', async () => {
    const chat = ctx.desktop.chat()
    await chat.frame.getByTestId('chat-restarted-resend').click()
    await see.attribute(chat.transcript, 'data-running', 'true')
    await see.gone(chat.frame.getByTestId('chat-restarted-note'))
    await see.text(chat.userMessages.last(), 'step through')
  })
  it('after 20 seconds of work the status line offers to end the agent program, and the menus lead to Task Manager (UX-176)', async () => {
    const chat = ctx.desktop.chat()
    await see.attribute(chat.transcript, 'data-running', 'true')
    await chat.frame.getByTestId('chat-end-agent-link').waitFor({ state: 'visible', timeout: 40_000 })
    await see.text(chat.frame.getByTestId('chat-end-agent-link'), 'Not responding? End the agent program')
    await chat.frame.getByTestId('chat-end-agent-link').click()
    const manager = ctx.desktop.window('agent-manager')
    await see.visible(manager)
    await see.eventually(async () => expect(await manager.getByTestId('agent-manager-end-process').isEnabled()).toBe(true))
    await ctx.desktop.closeWindow('agent-manager')
    await chat.frame.getByTestId('menubar-file').click()
    await ctx.desktopPage.getByTestId('chat-menu-end-agent').click()
    await see.eventually(async () => expect(await manager.getByTestId('agent-manager-end-process').isEnabled()).toBe(true))
    await ctx.desktop.closeWindow('agent-manager')
    await chat.frame.getByTestId('menubar-tools').click()
    await ctx.desktopPage.getByTestId('chat-menu-task-manager').click()
    await see.visible(ctx.desktop.window('agent-manager'))
    await ctx.desktop.closeWindow('agent-manager')
  })

  it('Start a new chat opens a chat with the failed text in its message box, empties this one and says where it went (UX-175)', async () => {
    const chat = ctx.desktop.chat()
    await endAgentProgram()
    await see.visible(chat.frame.getByTestId('chat-error-new-chat'))
    await chat.frame.getByTestId('chat-error-new-chat').click()
    await see.visible(ctx.desktop.window('chat', 1))
    const next = ctx.desktop.chat(1)
    await see.eventually(async () => expect(await next.composer.inputValue()).toBe('step through'))
    expect(await chat.composer.inputValue()).toBe('')
    await see.text(chat.frame.getByTestId('chat-continued-note'), 'Continued in a new chat.')
    await see.visible(chat.errors)
  })
})

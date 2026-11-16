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
    await see.text(chat.frame.getByTestId('chat-error-new-chat'), 'your text is kept in the box')
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
})

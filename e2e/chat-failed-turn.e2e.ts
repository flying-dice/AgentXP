import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { see, startScriptedDesktop, type ScriptedDesktop } from './fixtures'
import { projectRoot } from './fixtures/launch'

/**
 * UX-195 and UX-201: a turn that fails after the agent started on it. The box says what happened and what to do, "Send again" is the
 * highlighted button, the message box is not refilled, and the repeat is marked once ("Stopped", then "Sent again").
 */
describe('chat: a failed turn ends in a route, not a dead end', () => {
  let ctx: ScriptedDesktop

  beforeAll(async () => {
    ctx = await startScriptedDesktop({ script: join(projectRoot, 'e2e/fixtures/scripts/chat-failures.json'), title: 'Failed turn' })
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat().composer)
  })
  afterAll(async () => ctx?.close())

  it('a step that timed out says so, offers Send again as the highlighted button, and shorter words fit the status bar', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('check the page')
    await see.visible(chat.errors)
    await see.text(chat.frame.getByTestId('chat-error-text'), 'A step took too long (waiting for the page). Click Send again to try again.')
    expect(await chat.frame.getByTestId('chat-error-text').innerText()).not.toMatch(/did not answer/)
    expect(await chat.frame.getByTestId('chat-error-send-again').getAttribute('class')).toContain('def')
    await see.visible(chat.frame.getByTestId('chat-error-details'))
    await see.text(chat.frame.getByTestId('chat-problem-line'), 'A step took too long. Click Send again.')
    // The agent had started on the message: it stays in the chat as Stopped, and the box is not refilled.
    await see.text(chat.frame.getByTestId('chat-message-stopped'), 'Stopped')
    expect(await chat.composer.inputValue()).toBe('')
  })

  it('Details start with the plain sentence, the log below it under "Technical details"', async () => {
    const chat = ctx.desktop.chat()
    await chat.frame.getByTestId('chat-error-details').click()
    const details = await chat.frame.getByTestId('chat-error-details-text').innerText()
    expect(details).toMatch(/^A step took too long/)
    expect(details.indexOf('Technical details')).toBeGreaterThan(0)
    await chat.frame.getByTestId('chat-error-details').click()
  })

  it('Send again sends the request once more in the same chat, and the repeat is marked "Sent again"', async () => {
    const chat = ctx.desktop.chat()
    await chat.frame.getByTestId('chat-error-send-again').click()
    await see.visible(chat.agentMessage('Finished: check the page'))
    await see.gone(chat.errors)
    await see.count(chat.userMessages, 2)
    await see.count(chat.frame.getByTestId('chat-message-stopped'), 1)
    await see.text(chat.frame.getByTestId('chat-message-sent-again'), 'Sent again')
    await see.count(chat.frame.getByTestId('chat-message-sent-again'), 1)
  })
})

import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { see, startScriptedDesktop, type ScriptedDesktop } from './fixtures'
import { projectRoot } from './fixtures/launch'

/** host-paths.json: the agent reports HOST paths (its real working directory); the transcript shows virtual paths. */
describe('scripted agent: paths and clearing the transcript', () => {
  let ctx: ScriptedDesktop

  beforeAll(async () => {
    ctx = await startScriptedDesktop({ script: join(projectRoot, 'e2e/fixtures/scripts/host-paths.json'), title: 'Host paths' })
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat().composer)
  })
  afterAll(async () => ctx?.close())

  it('the tool card shows C:\\Users\\Agent\\notes.txt, not the host path', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('read the notes')
    await see.visible(chat.agentMessage('Reading the notes.'))
    await see.attribute(chat.transcript, 'data-running', 'false')
    await see.count(chat.toolCalls, 1)
    await see.text(chat.toolCalls, 'C:\\Users\\Agent\\notes.txt')
    const text = await chat.toolCalls.first().innerText()
    expect(text).not.toContain('agent7-desktops')
    expect(text).not.toMatch(/[\\/](tmp|var|home)[\\/]/)
  })

  it('Chat > Clear transcript empties the window, tool cards included', async () => {
    const chat = ctx.desktop.chat()
    await chat.frame.getByTestId('menubar-chat').click()
    await ctx.desktopPage.getByTestId('chat-menu-clear').click()
    await ctx.desktopPage.getByTestId('message-box').getByTestId('dialog-button-yes').click()
    await see.count(chat.toolCalls, 0)
    await see.count(chat.userMessages, 0)
    await see.count(chat.agentMessage('Reading the notes.'), 0)
  })

  it('the chat keeps working after the transcript was cleared', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('again')
    await see.visible(chat.agentMessage('Reading the notes.'))
    await see.attribute(chat.transcript, 'data-running', 'false')
    await see.count(chat.toolCalls, 1)
    await see.count(chat.userMessages, 1)
  })
})

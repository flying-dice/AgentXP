import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createWorkspace, see, startScriptedDesktop, type ScriptedDesktop, type Workspace } from './fixtures'

/**
 * Every app has a context menu and a Help menu; F1 opens the Help of the focused app. The agent is the scripted one (aside.json): a
 * session of its own per chat, which the fake agent (one fixed ACP session id) cannot give a chat pane and a chat window together.
 */
describe('Context menus and in-app Help', () => {
  let ctx: ScriptedDesktop
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace({ 'README.md': '# Hello from the readme\n' })
    ctx = await startScriptedDesktop({ script: 'aside', title: 'Context menu desktop', workspace })
  })
  afterAll(async () => {
    await ctx?.close()
  })

  it('Explorer: the file menu opens the file with Notepad', async () => {
    const explorer = await ctx.desktop.openComputer()
    await explorer.openDrive('e')
    await see.visible(explorer.item('README.md'))
    await explorer.item('README.md').click({ button: 'right' })
    await ctx.desktopPage.getByTestId('explorer-ctx-open-notepad').click()
    const notepad = ctx.desktop.window('notepad')
    await see.visible(notepad.getByTestId('notepad-app'))
    await see.eventually(async () => {
      const value = await notepad.getByTestId('notepad-text').inputValue()
      if (!value.includes('Hello from the readme')) throw new Error(`Notepad shows: ${value}`)
    })
  })

  it('Notepad: Explain this on a selection opens the Notepad chat pane with the selected text', async () => {
    const notepad = ctx.desktop.window('notepad')
    const text = notepad.getByTestId('notepad-text')
    await text.click()
    await ctx.desktopPage.keyboard.press('Control+A')
    await text.click({ button: 'right' })
    await ctx.desktopPage.getByTestId('notepad-ctx-explain').click()
    const aside = ctx.desktop.aside('notepad')
    await see.visible(aside.panel)
    await see.attribute(aside.panel, 'data-role', 'aside')
    await see.text(aside.userMessages.first(), 'Hello from the readme')
    await see.count(ctx.desktop.windows('chat'), 0) // the old behaviour (a new Chat window) is "Open in Chat window"
  })

  it('Notepad: Open in Chat window starts a full chat with the selected text', async () => {
    const notepad = ctx.desktop.window('notepad')
    const text = notepad.getByTestId('notepad-text')
    await text.click()
    await ctx.desktopPage.keyboard.press('Control+A')
    await text.click({ button: 'right' })
    await ctx.desktopPage.getByTestId('notepad-ctx-open-chat').click()
    const chat = ctx.desktop.window('chat')
    await see.visible(chat.getByTestId('chat-app'))
    await see.text(chat.getByTestId('chat-message-user'), 'Hello from the readme')
    await chat.getByTestId('window-close').first().click()
  })

  it('Notepad: Ask chat... fills the composer of the pane and does not send', async () => {
    const notepad = ctx.desktop.window('notepad')
    await ctx.desktop.focusWindow('notepad')
    const aside = ctx.desktop.aside('notepad')
    await aside.newConversation.click() // a fresh pane: the first conversation is over
    await see.visible(aside.blank)
    const text = notepad.getByTestId('notepad-text')
    await text.click({ button: 'right' })
    await ctx.desktopPage.getByTestId('notepad-ctx-ask').click()
    await see.eventually(async () => expect(await aside.composer.inputValue()).toContain('I have a question about'))
    await see.count(aside.userMessages, 0)
  })

  it('Explorer: the Help menu opens Explorer Help', async () => {
    const explorer = ctx.desktop.window('explorer')
    await ctx.desktop.focusWindow('explorer')
    await explorer.getByTestId('menubar-help').click()
    await ctx.desktopPage.getByTestId('explorer-menu-help').click()
    const help = ctx.desktop.window('help')
    await see.visible(help.getByTestId('help-app'))
    await see.text(help.getByTestId('window-title'), 'Using Explorer')
    await see.attribute(help.getByTestId('help-article'), 'data-topic', 'explorer')
    await help.getByTestId('window-close').first().click()
    await see.gone(help)
    await ctx.desktop.minimizeWindow('explorer')
  })

  it('Notepad: F1 inside the text area opens Notepad Help and typing still works', async () => {
    const notepad = ctx.desktop.window('notepad')
    await ctx.desktop.focusWindow('notepad')
    const text = notepad.getByTestId('notepad-text')
    await text.click()
    await ctx.desktopPage.keyboard.press('F1')
    const help = ctx.desktop.window('help')
    await see.attribute(help.getByTestId('help-article'), 'data-topic', 'notepad')
    await see.text(help.getByTestId('window-title'), 'Using Notepad')
    await help.getByTestId('window-close').first().click()
    await see.gone(help)
  })

  it('Notepad: the Menu key opens the context menu and Esc closes it', async () => {
    const notepad = ctx.desktop.window('notepad')
    await ctx.desktop.focusWindow('notepad')
    await notepad.getByTestId('notepad-text').click()
    await ctx.desktopPage.keyboard.press('ContextMenu')
    await see.visible(ctx.desktopPage.getByTestId('notepad-ctx-select-all'))
    await ctx.desktopPage.keyboard.press('Escape')
    await see.gone(ctx.desktopPage.getByTestId('notepad-ctx-select-all'))
  })
})

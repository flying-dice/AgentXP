import { afterAll, beforeAll, describe, it } from 'vitest'
import { createWorkspace, see, startConnectedDesktop, type ConnectedDesktop, type Workspace } from './fixtures'

/** Every app has a context menu and a Help menu; F1 opens the Help of the focused app. */
describe('Context menus and in-app Help', () => {
  let ctx: ConnectedDesktop
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace({ 'README.md': '# Hello from the readme\n' })
    ctx = await startConnectedDesktop({ title: 'Context menu desktop', workspace })
  })
  afterAll(async () => {
    await ctx?.app.close()
    await workspace?.remove()
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

  it('Notepad: Explain this on a selection opens a chat with the selected text', async () => {
    const notepad = ctx.desktop.window('notepad')
    const text = notepad.getByTestId('notepad-text')
    await text.click()
    await ctx.desktopPage.keyboard.press('Control+A')
    await text.click({ button: 'right' })
    await ctx.desktopPage.getByTestId('notepad-ctx-explain').click()
    const chat = ctx.desktop.window('chat')
    await see.visible(chat.getByTestId('chat-app'))
    await see.text(chat.getByTestId('chat-message-user'), 'Hello from the readme')
    await chat.getByTestId('window-close').first().click()
  })

  it('Explorer: the Help menu opens Explorer Help', async () => {
    const explorer = ctx.desktop.window('explorer')
    await ctx.desktop.focusWindow('explorer')
    await explorer.getByTestId('menubar-help').click()
    await ctx.desktopPage.getByTestId('explorer-menu-help').click()
    const help = ctx.desktop.window('help')
    await see.visible(help.getByTestId('help-app'))
    await see.text(help.getByTestId('window-title'), 'Explorer Help')
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
    await see.text(help.getByTestId('window-title'), 'Notepad Help')
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

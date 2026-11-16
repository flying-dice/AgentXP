import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createWorkspace, see, startScriptedDesktop, type ScriptedDesktop, type Workspace } from './fixtures'

/** UX-55 (windows come to the front, one window per app), UX-56 (own names), UX-57 (keyboard reach of the shell). */
describe('shell: windows come forward, have their own names, and the keyboard reaches the shell', () => {
  let ctx: ScriptedDesktop
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace({ 'README.md': '# Hello\n' })
    // The scripted agent numbers its ACP sessions uniquely, so several chats can share the agent row.
    ctx = await startScriptedDesktop({ script: 'demo', title: 'Shell keys desktop', workspace })
  })
  afterAll(async () => {
    await ctx?.close()
    await workspace?.remove()
  })

  it('the Start menu opens with the first item highlighted, a footer that names the keys, and Enter starts the highlighted item', async () => {
    await ctx.desktop.openStart()
    await see.attribute(ctx.desktopPage.getByTestId('start-menu-item-chat'), 'data-hot', 'true')
    await see.text(ctx.desktopPage.getByTestId('start-menu-hint'), 'Ctrl+Esc opens this menu. Ctrl+N starts a new chat. F6 moves between the desktop, windows and the taskbar.')
    await ctx.desktopPage.keyboard.press('ArrowDown')
    await see.attribute(ctx.desktopPage.getByTestId('start-menu-item-explorer'), 'data-hot', 'true')
    await ctx.desktopPage.keyboard.press('ArrowUp')
    await see.attribute(ctx.desktopPage.getByTestId('start-menu-item-chat'), 'data-hot', 'true')
    await ctx.desktopPage.keyboard.press('Enter')
    await ctx.desktop.window('chat', 0).waitFor()
    await see.gone(ctx.desktopPage.getByTestId('start-menu'))
  })

  it('typing in the Start menu highlights the first match and Enter starts it', async () => {
    await ctx.desktop.openStart()
    await ctx.desktop.startSearch.fill('explorer')
    await see.attribute(ctx.desktopPage.getByTestId('start-menu-item-explorer'), 'data-hot', 'true')
    await ctx.desktopPage.keyboard.press('Enter')
    await ctx.desktop.window('explorer', 0).waitFor()
  })

  it('Ctrl+N starts a new chat on the default drive with the composer ready to type in', async () => {
    const before = await ctx.desktop.windows('chat').count()
    await ctx.desktopPage.keyboard.press('Control+n')
    await ctx.desktop.window('chat', before).waitFor()
    await see.text(ctx.desktop.window('chat', before).getByTestId('chat-cwd'), '(E:)')
    await ctx.desktopPage.keyboard.type('hello')
    await see.eventually(async () => expect(await ctx.desktop.chat(before).composer.inputValue()).toBe('hello'))
  })

  it('Ctrl+N also works with an Explorer window in front', async () => {
    await ctx.desktop.window('explorer', 0).getByTestId('explorer-app').click({ position: { x: 4, y: 4 } })
    const before = await ctx.desktop.windows('chat').count()
    await ctx.desktopPage.keyboard.press('Control+n')
    await ctx.desktop.window('chat', before).waitFor()
  })

  it('a taskbar button raises a window that is behind, and minimizes the one that is on top', async () => {
    await ctx.desktop.focusWindow('explorer', 0)
    const chatItem = ctx.desktop.taskbarItem('chat').first()
    await chatItem.click()
    await see.attribute(ctx.desktop.window('chat', 0), 'data-focused', 'true')
    // The same button again: the window is on top, so it is minimized.
    await chatItem.click()
    await see.attribute(ctx.desktop.window('chat', 0), 'data-window-state', 'minimized')
    // And once more: the minimized window comes back in front.
    await chatItem.click()
    await see.attribute(ctx.desktop.window('chat', 0), 'data-window-state', 'normal')
    await see.attribute(ctx.desktop.window('chat', 0), 'data-focused', 'true')
  })

  it('Enter on a taskbar button raises the window and never minimizes it', async () => {
    await ctx.desktop.focusWindow('explorer', 0)
    const chatItem = ctx.desktop.taskbarItem('chat').first()
    await chatItem.focus()
    await ctx.desktopPage.keyboard.press('Enter')
    await see.attribute(ctx.desktop.window('chat', 0), 'data-focused', 'true')
    await chatItem.focus()
    await ctx.desktopPage.keyboard.press('Enter')
    await see.attribute(ctx.desktop.window('chat', 0), 'data-window-state', 'normal')
    await see.attribute(ctx.desktop.window('chat', 0), 'data-focused', 'true')
  })

  it('two windows of one app get their own names on the taskbar', async () => {
    await ctx.desktop.openComputer()
    await see.count(ctx.desktop.windows('explorer'), 2)
    // The taskbar buttons carry the window title as their tooltip.
    await see.attribute(ctx.desktop.taskbarItem('explorer').nth(0), 'title', 'Computer')
    await see.attribute(ctx.desktop.taskbarItem('explorer').nth(1), 'title', 'Computer (2)')
    await see.text(ctx.desktop.window('explorer', 1).getByTestId('window-title'), 'Computer (2)')
  })

  it('the Browser icon raises the Browser window instead of opening a second one', async () => {
    // Windows cover the icons, so the icon is reached with the keyboard (focus, then Enter).
    await ctx.desktop.icon('browser').focus()
    await ctx.desktopPage.keyboard.press('Enter')
    await ctx.desktop.window('browser', 0).waitFor()
    await ctx.desktop.taskbarItem('explorer').nth(0).click()
    await see.attribute(ctx.desktop.window('browser', 0), 'data-focused', 'false')
    await ctx.desktop.icon('browser').focus()
    await ctx.desktopPage.keyboard.press('Enter')
    await see.attribute(ctx.desktop.window('browser', 0), 'data-focused', 'true')
    await see.count(ctx.desktop.windows('browser'), 1)
  })
})

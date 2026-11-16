import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createWorkspace, desktopIdByTitle, see, startScriptedDesktop, type ScriptedDesktop, type Workspace } from './fixtures'

/** The desktop window's own controls: connection bar, Start menu Disconnect, "New chat on a drive", "Start a chat here". */
describe('desktop shell: connection bar, disconnect and chats on a drive', () => {
  let ctx: ScriptedDesktop
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace({ 'README.md': '# Hello\n', 'src/main.ts': 'export {}\n' })
    // The scripted agent numbers its ACP sessions uniquely, so several chats can share the agent row.
    ctx = await startScriptedDesktop({ script: 'demo', title: 'Shell desktop', workspace })
  })
  afterAll(async () => {
    await ctx?.close()
  })

  const bar = (testid: string) => ctx.desktopPage.getByTestId(testid)

  it('shows the connection bar with the desktop title and a tooltip that says the agents keep running', async () => {
    await see.visible(bar('connbar'))
    await see.text(bar('connbar-title'), 'Shell desktop')
    expect(await bar('connbar-close').getAttribute('title')).toContain('agents keep running')
    await see.attribute(bar('connbar'), 'data-pinned', 'true')
  })

  it('the pin folds the bar to its connection row, and hover shows the rest again', async () => {
    await bar('connbar-pin').click()
    await see.attribute(bar('connbar'), 'data-pinned', 'false')
    await ctx.desktop.taskbar.hover()
    await see.gone(ctx.desktop.pauseButton)
    await bar('connbar').hover()
    await see.visible(ctx.desktop.pauseButton)
    await bar('connbar-pin').click()
    await see.attribute(bar('connbar'), 'data-pinned', 'true')
  })

  it('the status dot follows the status text', async () => {
    await see.attribute(bar('topbar-dot'), 'data-state', 'idle')
    await see.attribute(ctx.desktop.topBar, 'data-state', 'idle')
    await ctx.desktop.pauseButton.click()
    await see.attribute(bar('topbar-dot'), 'data-state', 'paused')
    await see.text(ctx.desktop.status, 'Paused')
    await ctx.desktop.pauseButton.click()
    await see.attribute(bar('topbar-dot'), 'data-state', 'idle')
  })

  it('New chat on a drive: the Start menu dialog starts a chat in the root of the plugged-in drive', async () => {
    await ctx.desktop.openStart()
    await ctx.desktopPage.getByTestId('start-menu-place-chat-on').click()
    await see.visible(bar('new-chat-dialog'))
    await see.visible(bar('new-chat-drive-c'))
    await bar('new-chat-drive-e').click()
    await bar('new-chat-start').click()
    await see.gone(bar('new-chat-dialog'))
    await ctx.desktop.window('chat', 0).waitFor()
    await see.text(ctx.desktop.window('chat', 0).getByTestId('chat-cwd'), '(E:)')
  })

  it('New chat on a drive offers C: with the home of the agent', async () => {
    await ctx.desktop.openStart()
    await ctx.desktopPage.getByTestId('start-menu-place-chat-on').click()
    await bar('new-chat-drive-c').click()
    await bar('new-chat-start').click()
    await ctx.desktop.window('chat', 1).waitFor()
    await see.text(ctx.desktop.window('chat', 1).getByTestId('chat-cwd'), 'Agent (C:)')
  })

  it('Explorer: "Start a chat here" on a drive and on a folder', async () => {
    const explorer = await ctx.desktop.openComputer()
    await explorer.drive('e').click({ button: 'right' })
    await ctx.desktopPage.getByTestId('menu-item-explorer-drive-chat').click()
    await ctx.desktop.window('chat', 2).waitFor()
    await see.text(ctx.desktop.window('chat', 2).getByTestId('chat-cwd'), '(E:)')

    await ctx.desktop.focusWindow('explorer')
    await explorer.openDrive('e')
    await ctx.desktop.focusWindow('explorer')
    await explorer.item('src').click({ button: 'right' })
    await ctx.desktopPage.getByTestId('menu-item-explorer-folder-chat').click()
    await ctx.desktop.window('chat', 3).waitFor()
    await see.text(ctx.desktop.window('chat', 3).getByTestId('chat-cwd'), 'src (E:)')
  })

  it('Start menu: the Disconnect arrow lists Disconnect, Switch desktop and Delete desktop', async () => {
    await ctx.desktop.openStart()
    await see.visible(bar('start-menu-disconnect'))
    await bar('start-menu-disconnect-arrow').click()
    await see.visible(bar('start-menu-shutdown-disconnect'))
    await see.visible(bar('start-menu-shutdown-switch'))
    await see.visible(bar('start-menu-shutdown-delete'))
  })

  it('Switch desktop shows the launcher and keeps this desktop open', async () => {
    await bar('start-menu-shutdown-switch').click()
    await see.visible(ctx.launcher.window)
    await see.visible(bar('taskbar-start'))
  })

  it('Disconnect in the Start menu closes the window; the desktop stays and can be connected again', async () => {
    await ctx.desktop.openStart()
    await bar('start-menu-disconnect').click()
    await ctx.app.waitForDesktopWindowClosed(ctx.desktopId)
    await see.gone(ctx.launcher.connectedChip('Shell desktop'))
    await see.visible(ctx.launcher.row('Shell desktop'))
  })

  it('the connection bar close button disconnects too', async () => {
    await ctx.launcher.connect('Shell desktop')
    const page = await ctx.app.desktopWindow(ctx.desktopId)
    await see.visible(page.getByTestId('connbar-close'))
    await page.getByTestId('connbar-close').click()
    await ctx.app.waitForDesktopWindowClosed(ctx.desktopId)
    await see.gone(ctx.launcher.connectedChip('Shell desktop'))
  })

  it('Delete desktop asks first, then removes the desktop', async () => {
    await ctx.launcher.createDesktop('Doomed')
    const id = await desktopIdByTitle(ctx.launcherPage, 'Doomed')
    await ctx.launcher.connect('Doomed')
    const page = await ctx.app.desktopWindow(id)
    await page.getByTestId('taskbar-start').click()
    await page.getByTestId('start-menu-disconnect-arrow').click()
    await page.getByTestId('start-menu-shutdown-delete').click()
    await page.getByTestId('message-box').getByTestId('dialog-button-no').click()
    await see.visible(page.getByTestId('taskbar-start'))
    await page.getByTestId('taskbar-start').click()
    await page.getByTestId('start-menu-disconnect-arrow').click()
    await page.getByTestId('start-menu-shutdown-delete').click()
    await page.getByTestId('message-box').getByTestId('dialog-button-yes').click()
    await ctx.app.waitForDesktopWindowClosed(id)
    await see.count(ctx.launcher.row('Doomed'), 0)
  })
})

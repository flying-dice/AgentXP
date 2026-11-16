import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Page } from 'playwright'
import { addProject, createWorkspace, desktopIdByTitle, launchAgent7, LauncherPage, registerFakeAgent, see, type Agent7Instance, type Workspace } from './fixtures'

describe('launcher', () => {
  let app: Agent7Instance
  let page: Page
  let launcher: LauncherPage
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace()
    app = await launchAgent7()
    page = await app.launcherWindow()
    launcher = new LauncherPage(page)
    await registerFakeAgent(page)
  })

  afterAll(async () => {
    await app?.close()
    await workspace?.remove()
  })

  it('opens the launcher first, with no desktops yet', async () => {
    await see.visible(launcher.window)
    await see.visible(page.getByTestId('launcher-empty'))
    await see.count(launcher.rows, 0)
  })

  it('the New dialog says that Create opens the desktop', async () => {
    await page.getByTestId('launcher-new').click()
    await see.text(page.getByTestId('new-desktop-opens-note'), 'Agent7 opens the new desktop when you click Create.')
    await see.text(page.getByTestId('new-desktop-projects-note'), 'You can add projects later.')
    await page.getByTestId('dialog-button-cancel').click()
  })

  it('creates a desktop through the New dialog and the desktop window opens at once (UX-86)', async () => {
    await launcher.createDesktop('Alpha')
    await see.count(launcher.rows, 1)
    await see.text(launcher.row('Alpha'), 'Alpha')
    await see.visible(launcher.connectedChip('Alpha'))
    const desktopPage = await app.desktopWindow(await desktopIdByTitle(page, 'Alpha'))
    await see.visible(desktopPage.getByTestId('taskbar-start'))
    // A desktop without a project says what to do next and names Computer (UX-164).
    await see.text(desktopPage.getByTestId('balloon-text'), 'Plug in a project to let the agent work on it: open Computer, then Plug in a project.')
    await desktopPage.getByTestId('balloon-action').click()
    // The button really opens Computer (UX-179): in front, on the taskbar, with Plug in a project... in it, and the balloon is gone.
    await see.visible(desktopPage.getByTestId('window-explorer'))
    await see.visible(desktopPage.getByTestId('taskbar-item-explorer'))
    await see.visible(desktopPage.getByTestId('explorer-plug-in'))
    await see.gone(desktopPage.getByTestId('balloon'))
    expect(await desktopPage.getByTestId('window-explorer').getAttribute('data-focused')).toBe('true')
  })

  it('connects: Show desktop brings the open window forward and the row shows Connected', async () => {
    const id = await desktopIdByTitle(page, 'Alpha')
    await launcher.connect('Alpha')
    const desktopPage = await app.desktopWindow(id)
    await see.visible(desktopPage.getByTestId('taskbar-start'))
    await see.visible(desktopPage.getByTestId('topbar'))
    await see.visible(launcher.connectedChip('Alpha'))
  })

  it('disconnects: the desktop window closes and the Connected chip goes away', async () => {
    const id = await desktopIdByTitle(page, 'Alpha')
    await launcher.disconnect('Alpha')
    await app.waitForDesktopWindowClosed(id)
    await see.gone(launcher.connectedChip('Alpha'))
  })

  it('reconnects to the same desktop', async () => {
    const id = await desktopIdByTitle(page, 'Alpha')
    await launcher.connect('Alpha')
    const desktopPage = await app.desktopWindow(id)
    await see.visible(desktopPage.getByTestId('taskbar-start'))
    await see.visible(launcher.connectedChip('Alpha'))
    expect(await desktopIdByTitle(page, 'Alpha')).toBe(id)
  })

  it('deletes a desktop after confirming', async () => {
    await launcher.createDesktop('Beta')
    await see.count(launcher.rows, 2)
    await launcher.deleteDesktop('Beta')
    await see.count(launcher.rows, 1)
    await see.visible(launcher.row('Alpha'))
  })

  it('creates a desktop with a project plugged in as a USB drive', async () => {
    await addProject(page, workspace)
    await launcher.createDesktop('Gamma', { projects: [workspace.name] })
    await see.text(launcher.row('Gamma'), workspace.name)
  })
})

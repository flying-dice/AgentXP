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

  it('creates a desktop through the New dialog', async () => {
    await launcher.createDesktop('Alpha')
    await see.count(launcher.rows, 1)
    await see.text(launcher.row('Alpha'), 'Alpha')
  })

  it('connects: a desktop window opens and the row shows Connected', async () => {
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

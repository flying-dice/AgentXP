import { afterAll, beforeAll, describe, it } from 'vitest'
import { createWorkspace, plugWorkspaceIn, see, startConnectedDesktop, type ConnectedDesktop, type Workspace } from './fixtures'

describe('Explorer and USB drives', () => {
  let ctx: ConnectedDesktop
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace({ 'README.md': '# Hello\n', 'src/main.ts': 'export {}\n' })
    ctx = await startConnectedDesktop({ title: 'USB desktop', workspace })
  })
  afterAll(async () => {
    await ctx?.app.close()
    await workspace?.remove()
  })

  it('Computer view shows the system drive C: and the project as USB drive E:', async () => {
    const explorer = await ctx.desktop.openComputer()
    await see.visible(explorer.drive('c'))
    await see.visible(explorer.drive('e'))
    await see.text(explorer.drive('e'), workspace.name)
    await see.text(explorer.drive('c'), 'Private to this desktop')
    await see.text(explorer.drive('e'), 'Project folder (plugged in)')
  })

  it('shows the USB tray icon', async () => {
    await see.visible(ctx.desktop.usbTray)
  })

  it('double-clicking E: lists the project files', async () => {
    const explorer = ctx.desktop.explorer()
    await explorer.openDrive('e')
    await see.visible(explorer.item('README.md'))
    await see.visible(explorer.item('src'))
    await see.text(explorer.address, 'E:')
  })

  it('opens a folder and goes back up', async () => {
    const explorer = ctx.desktop.explorer()
    await explorer.openItem('src')
    await see.visible(explorer.item('main.ts'))
    await explorer.up()
    await see.visible(explorer.item('README.md'))
  })

  it('Safely Remove from the tray ejects E: and its tile disappears', async () => {
    const explorer = ctx.desktop.explorer()
    await explorer.up()
    await see.visible(explorer.drive('e'))
    await ctx.desktop.ejectDrive('e')
    await see.gone(explorer.drive('e'))
    await see.visible(explorer.drive('c'))
    // The tray stays while a removed project can be plugged in again.
    await see.visible(ctx.desktop.usbTray)
    await ctx.desktop.usbTray.click()
    await see.text(ctx.desktopPage.getByTestId('usb-plug-again'), `Plug in ${workspace.name} (E:) again`)
    await ctx.desktopPage.keyboard.press('Escape')
  })

  it('plugging a project into the running desktop shows AutoPlay and the new drive', async () => {
    const again = await createWorkspace({ 'notes.txt': 'later\n' })
    try {
      await plugWorkspaceIn(ctx.desktopPage, ctx.desktopId, again)
      await see.visible(ctx.desktop.autoPlay)
      await ctx.desktopPage.getByTestId('autoplay-open-folder').click()
      await see.gone(ctx.desktop.autoPlay)
      await see.visible(ctx.desktop.usbTray)
    } finally {
      await again.remove()
    }
  })
})

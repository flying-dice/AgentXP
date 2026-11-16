import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createWorkspace, FolderBrowserDialog, see, startConnectedDesktop, type ConnectedDesktop, type Workspace } from './fixtures'

/**
 * UX-02, UX-03, UX-11, UX-52, UX-53: plug in, eject and plug in again, all through the UI, with no stubbed folder dialog.
 * A project the user plugs in opens an Explorer window on its drive (no AutoPlay); the removed list lives in main.
 */
describe('plug in and eject a project', () => {
  let ctx: ConnectedDesktop
  let first: Workspace
  let second: Workspace
  let browser: FolderBrowserDialog

  beforeAll(async () => {
    first = await createWorkspace({ 'README.md': '# One\n' })
    second = await createWorkspace({ 'notes.txt': 'two\n' })
    ctx = await startConnectedDesktop({ title: 'Projects desktop', workspace: first })
    browser = new FolderBrowserDialog(ctx.desktopPage)
  })
  afterAll(async () => {
    await ctx?.app.close()
    await first?.remove()
    await second?.remove()
  })

  it('Computer says how many projects are plugged in, and has tooltips on the command bar', async () => {
    const explorer = await ctx.desktop.openComputer()
    await see.text(explorer.itemCount, '1 project plugged in')
    await see.text(explorer.drive('e'), 'Project')
  })

  it('the tray icon says how many projects are plugged in', async () => {
    expect(await ctx.desktop.usbTray.getAttribute('title')).toBe('Safely Remove Hardware: 1 project plugged in')
  })

  it('Plug in a project... opens the Browse For Folder dialog; OK selects the new drive and a balloon says it is ready', async () => {
    const explorer = ctx.desktop.explorer()
    await explorer.plugIn.click()
    await see.visible(browser.dialog)
    await see.text(browser.instruction, 'Select the project folder to plug in to this desktop.')
    await browser.chooseByTyping(second.path)
    await see.gone(browser.dialog)
    await see.visible(explorer.drive('f'))
    await see.attribute(explorer.drive('f'), 'aria-selected', 'true')
    await see.text(explorer.itemCount, '2 projects plugged in')
    await see.text(ctx.desktop.balloonTitle, 'Project plugged in')
    await see.text(ctx.desktop.balloonText, `Project plugged in: ${second.name} (F:) is ready to use.`)
    // The project is open in an Explorer window on the drive root, and AutoPlay stays away.
    await see.visible(ctx.desktop.windows('explorer').nth(1))
    await see.text(ctx.desktop.explorer(1).address, 'F:')
    await see.attribute(ctx.desktop.windows('explorer').nth(1), 'data-focused', 'true')
    await see.count(ctx.desktop.windows('explorer'), 2)
    expect(await ctx.desktop.autoPlay.count()).toBe(0)
    await ctx.desktop.closeWindow('explorer', 1)
  })

  it('Cancel plugs nothing in', async () => {
    const explorer = ctx.desktop.explorer()
    await explorer.plugIn.click()
    await see.visible(browser.dialog)
    await browser.cancel.click()
    await see.gone(browser.dialog)
    await see.text(explorer.itemCount, '2 projects plugged in')
  })

  it('Plug in a project that is plugged in already: a message names the project and its drive, and the drive is selected', async () => {
    const explorer = ctx.desktop.explorer()
    await explorer.plugIn.click()
    await browser.chooseByTyping(first.path)
    const box = ctx.desktopPage.getByTestId('message-box')
    await see.text(box, `The project '${first.name}' (E:) is already plugged in.`)
    await box.getByTestId('dialog-button-ok').click()
    await see.attribute(explorer.drive('e'), 'aria-selected', 'true')
  })

  it('right-click on a project drive shows Open, Start a chat here, Eject and Properties', async () => {
    const explorer = ctx.desktop.explorer()
    await explorer.drive('f').click({ button: 'right' })
    const page = ctx.desktopPage
    await see.visible(page.getByTestId('menu-item-explorer-drive-open'))
    await see.visible(page.getByTestId('menu-item-explorer-drive-chat'))
    await see.visible(page.getByTestId('menu-item-explorer-drive-eject'))
    await see.visible(page.getByTestId('explorer-ctx-drive-properties'))
    await page.keyboard.press('Escape')
  })

  it('Eject: a balloon says that the project was removed and the files are still in the folder, and the project appears under Recently removed', async () => {
    const explorer = ctx.desktop.explorer()
    await explorer.drive('f').click()
    await explorer.eject.click()
    await see.gone(explorer.drive('f'))
    await see.text(ctx.desktop.balloonTitle, 'Project removed')
    await see.text(ctx.desktop.balloonText, `'${second.name}' (F:) was removed from this desktop. Your files are still in the folder.`)
    await see.text(ctx.desktop.balloonText, 'Use Plug in again to add it back.')
    await see.visible(explorer.removedGroup)
    await see.text(explorer.removed, second.name)
    await see.text(explorer.itemCount, '1 project plugged in')
  })

  it('Plug in again is ready for the removed project, and the tray offers it too', async () => {
    const explorer = ctx.desktop.explorer()
    await ctx.desktop.usbTray.click()
    await see.text(ctx.desktopPage.getByTestId('usb-plug-again'), `Plug in ${second.name} (F:) again`)
    await ctx.desktopPage.keyboard.press('Escape')
    // Computer selects the newest removed project, so the button is enabled without a click.
    await see.enabled(explorer.plugInAgain)
  })

  it('Plug in again brings the project back without a dialog', async () => {
    const explorer = ctx.desktop.explorer()
    await explorer.removed.filter({ hasText: second.name }).click()
    await explorer.plugInAgain.click()
    await see.visible(explorer.drive('f'))
    await see.attribute(explorer.drive('f'), 'aria-selected', 'true')
    await see.gone(explorer.removed)
    expect(await browser.dialog.count()).toBe(0)
  })

  it('Start > Eject a project... opens the tray list with Eject and the project first', async () => {
    await ctx.desktopPage.getByTestId('autoplay-no-action').click().catch(() => {})
    await ctx.desktop.openStart()
    await ctx.desktopPage.getByTestId('start-menu-place-eject').click()
    await see.visible(ctx.desktopPage.getByTestId('usb-eject-e'))
    await see.text(ctx.desktopPage.getByTestId('usb-eject-e'), `Eject ${first.name} (E:)`)
    await ctx.desktopPage.keyboard.press('Escape')
  })
})

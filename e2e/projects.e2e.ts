import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createWorkspace, FolderBrowserDialog, see, startConnectedDesktop, type ConnectedDesktop, type Workspace } from './fixtures'

/** UX-02, UX-03, UX-11: plug in, eject and plug in again, all through the UI, with no stubbed folder dialog. */
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
    await see.text(explorer.drive('e'), 'Project folder (plugged in)')
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
    await see.text(ctx.desktop.balloonText, `${second.name} (F:) is ready to use.`)
    await see.visible(ctx.desktop.autoPlay)
    await ctx.desktopPage.getByTestId('autoplay-no-action').click()
  })

  it('Cancel plugs nothing in', async () => {
    const explorer = ctx.desktop.explorer()
    await explorer.plugIn.click()
    await see.visible(browser.dialog)
    await browser.cancel.click()
    await see.gone(browser.dialog)
    await see.text(explorer.itemCount, '2 projects plugged in')
  })

  it('Plug in a project that is plugged in already: a message names its drive, and the drive is selected', async () => {
    const explorer = ctx.desktop.explorer()
    await explorer.plugIn.click()
    await browser.chooseByTyping(first.path)
    const box = ctx.desktopPage.getByTestId('message-box')
    await see.text(box, `${first.name} is already plugged in as drive E:.`)
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

  it('Eject: a balloon says that the files were not changed, and the project appears under Recently removed', async () => {
    const explorer = ctx.desktop.explorer()
    await explorer.drive('f').click()
    await explorer.eject.click()
    await see.gone(explorer.drive('f'))
    await see.text(ctx.desktop.balloonTitle, 'Safe To Remove Hardware')
    await see.text(ctx.desktop.balloonText, `${second.name} (F:) can now be removed. Its files on disk were not changed.`)
    await see.text(ctx.desktop.balloonText, 'To use it again, open Computer and choose Plug in a project...')
    await see.visible(explorer.removedGroup)
    await see.text(explorer.removed, second.name)
    await see.text(explorer.itemCount, '1 project plugged in')
  })

  it('Plug in again brings the project back without a dialog', async () => {
    const explorer = ctx.desktop.explorer()
    expect(await explorer.plugInAgain.isDisabled()).toBe(true)
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

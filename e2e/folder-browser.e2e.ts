import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Page } from 'playwright'
import { createWorkspace, FolderBrowserDialog, launchAgent7, LauncherPage, registerFakeAgent, see, type Agent7Instance, type Workspace } from './fixtures'

/** UX-01: the in-app Browse For Folder dialog replaces the native folder dialog; no stub is needed. */
describe('Browse For Folder dialog (New desktop > Browse...)', () => {
  let app: Agent7Instance
  let page: Page
  let launcher: LauncherPage
  let browser: FolderBrowserDialog
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace({ 'README.md': '# Hello\n', 'src/main.ts': 'export {}\n' })
    app = await launchAgent7()
    page = await app.launcherWindow()
    launcher = new LauncherPage(page)
    browser = new FolderBrowserDialog(page)
    await registerFakeAgent(page)
    await page.getByTestId('launcher-new').click()
  })

  afterAll(async () => {
    await app?.close()
    await workspace?.remove()
  })

  const openDialog = async (): Promise<void> => {
    await page.getByTestId('new-desktop-browse').click()
    await see.visible(browser.dialog)
  }

  it('opens inside the app with the instruction, the tree, the Folder box and the buttons', async () => {
    await openDialog()
    await see.text(browser.dialog, 'Browse For Folder')
    await see.text(browser.instruction, 'Select a folder for the agent to work on.')
    await see.visible(browser.tree)
    await see.visible(browser.node('Computer'))
    await see.visible(browser.makeNewFolder)
    await see.visible(browser.ok)
    await see.visible(browser.cancel)
  })

  it('keeps OK and Make New Folder dimmed until a folder is selected', async () => {
    expect(await browser.ok.isDisabled()).toBe(true)
    expect(await browser.makeNewFolder.isDisabled()).toBe(true)
  })

  it('Esc cancels and adds nothing', async () => {
    await page.keyboard.press('Escape')
    await see.gone(browser.dialog)
    await see.count(page.getByTestId('new-desktop-project'), 0)
  })

  it('selecting a folder with the mouse fills the Folder box; OK adds it to the list ticked', async () => {
    await openDialog()
    await browser.selectByMouse(workspace.path)
    await see.eventually(async () => expect(await browser.path.inputValue()).toBe(workspace.path))
    await browser.ok.click()
    await see.gone(browser.dialog)
    const project = page.getByTestId('new-desktop-project').filter({ hasText: workspace.name })
    await see.visible(project)
  })

  it('a path typed into the Folder box is accepted, and a folder that does not exist is refused with a reason', async () => {
    await openDialog()
    await browser.path.fill(`${workspace.path}/nowhere`)
    await browser.ok.click()
    await see.text(browser.status, `The folder '${workspace.path}/nowhere' does not exist. Check the spelling, or select the parent folder and click Make New Folder.`)
    await see.visible(browser.dialog)
    await browser.path.fill(`${workspace.path}/src`)
    await browser.ok.click()
    await see.gone(browser.dialog)
    await see.visible(page.getByTestId('new-desktop-project').filter({ hasText: 'src' }))
  })

  it('works with the keyboard only: End, Right, type-ahead, Tab to the Folder box, Enter', async () => {
    await openDialog()
    await browser.tree.focus()
    // The last row is the root of the disk; Right opens it, then each name is found by typing it.
    await page.keyboard.press('End')
    const names = workspace.path.split('/').filter(Boolean)
    for (const name of names) {
      await page.keyboard.press('ArrowRight')
      await see.visible(browser.node(name))
      await page.keyboard.type(name)
      await see.eventually(async () => expect(await browser.path.inputValue()).toContain(name))
    }
    await see.eventually(async () => expect(await browser.path.inputValue()).toBe(workspace.path))
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    await see.gone(browser.dialog)
  })

  it('Make New Folder creates a folder in the selected folder and selects it', async () => {
    await openDialog()
    await browser.path.fill(workspace.path)
    // The Folder box alone does not select a tree node, so choose the folder in the tree first.
    await browser.selectByMouse(workspace.path)
    await browser.makeNewFolder.click()
    await see.eventually(async () => expect(await browser.path.inputValue()).toBe(`${workspace.path}/New Folder`))
    await see.visible(browser.node('New Folder'))
    await browser.cancel.click()
    await see.gone(browser.dialog)
  })

  // UX-51: the dialog finds the folders Agent7 already knows, and accepts a bare folder name.
  it('lists "Projects you used before" first and open, with no folder selected', async () => {
    await openDialog()
    await see.visible(browser.group('Projects you used before'))
    await see.visible(browser.node(workspace.name))
    expect(await browser.path.inputValue()).toBe('')
    expect(await browser.ok.isDisabled()).toBe(true)
    await browser.cancel.click()
    await see.gone(browser.dialog)
  })

  it('a bare folder name is found in the recent projects: the Folder box shows the full path and OK accepts it', async () => {
    await openDialog()
    await browser.path.fill(workspace.name)
    await see.eventually(async () => expect(await browser.path.inputValue()).toBe(workspace.path))
    await browser.ok.click()
    await see.gone(browser.dialog)
  })

  it('a bare name that no folder has is refused with the places that were searched', async () => {
    await openDialog()
    await browser.path.fill('no-such-folder-anywhere')
    await browser.ok.click()
    await see.text(browser.status, "No folder called 'no-such-folder-anywhere' was found in your recent folders, Documents, Desktop or Home.")
    await browser.cancel.click()
    await see.gone(browser.dialog)
  })
})

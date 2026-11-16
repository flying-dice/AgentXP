import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Page } from 'playwright'
import { addProject, createWorkspace, launchAgent7, LauncherPage, registerAgent, registerFakeAgent, see, type Agent7Instance, type Workspace } from './fixtures'

/** UX-54 (a taken desktop name gets a suggestion that fits) and UX-58 (a start error on the row, what you can do). */
describe('launcher: empty text, name suggestions and a start error on the row', () => {
  let app: Agent7Instance
  let page: Page
  let launcher: LauncherPage
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace({ 'README.md': '# Docs\n' })
    app = await launchAgent7()
    page = await app.launcherWindow()
    launcher = new LauncherPage(page)
    await registerFakeAgent(page)
  })
  afterAll(async () => {
    await app?.close()
    await workspace?.remove()
  })

  it('the empty launcher says what you can do', async () => {
    await see.text(page.getByTestId('launcher-empty'), 'No desktops yet.')
    await see.text(page.getByTestId('launcher-empty-help'), 'What you can do: plug in a project folder, ask the agent to read or change it, and approve each change yourself.')
  })

  it('a taken name offers the name with the first project folder, and a numbered name', async () => {
    await launcher.createDesktop('Fix login redirect')
    await addProject(page, workspace)
    await page.getByTestId('launcher-new').click()
    const name = page.getByTestId('new-desktop-name')
    await name.fill('Fix login redirect')
    await see.text(page.getByTestId('new-desktop-error'), "A desktop named 'Fix login redirect' already exists. Each desktop needs its own name so that you can tell them apart.")
    await see.text(page.getByTestId('new-desktop-use-suggestion'), "Use 'Fix login redirect (2)'")
    // The project suggestion needs a chosen folder.
    expect(await page.getByTestId('new-desktop-use-project-suggestion').count()).toBe(0)
    await page.getByTestId('new-desktop-project').filter({ hasText: workspace.name }).getByTestId('new-desktop-project-check').click()
    await see.text(page.getByTestId('new-desktop-use-project-suggestion'), `Use 'Fix login redirect - ${workspace.name}'`)
    await page.getByTestId('new-desktop-use-project-suggestion').click()
    expect(await name.inputValue()).toBe(`Fix login redirect - ${workspace.name}`)
    // The focus stays in the name box: typing goes there.
    await page.keyboard.type('!')
    expect(await name.inputValue()).toBe(`Fix login redirect - ${workspace.name}!`)
    await page.getByTestId('dialog-button-cancel').click()
  })

  it('the buttons of the New desktop dialog stay where they are when the name error appears (UX-89)', async () => {
    await page.getByTestId('launcher-new').click()
    const ok = page.getByTestId('dialog-button-ok')
    const browse = page.getByTestId('new-desktop-browse')
    const before = { ok: await ok.boundingBox(), browse: await browse.boundingBox(), cancel: await page.getByTestId('dialog-button-cancel').boundingBox() }
    await page.getByTestId('new-desktop-name').fill('Fix login redirect')
    await see.text(page.getByTestId('new-desktop-error'), 'already exists')
    await see.visible(page.getByTestId('new-desktop-use-suggestion'))
    expect({ ok: await ok.boundingBox(), browse: await browse.boundingBox(), cancel: await page.getByTestId('dialog-button-cancel').boundingBox() }).toEqual(before)
    await page.getByTestId('dialog-button-cancel').click()
  })

  it('the Rename dialog offers the numbered name only', async () => {
    await launcher.select('Fix login redirect')
    await page.getByTestId('launcher-rename').click()
    await page.getByTestId('rename-desktop-name').fill('Fix login redirect')
    await see.text(page.getByTestId('rename-desktop-error'), /^\s*$/)
    await page.getByTestId('dialog-button-cancel').click()
    await launcher.createDesktop('Other')
    await launcher.select('Other')
    await page.getByTestId('launcher-rename').click()
    await page.getByTestId('rename-desktop-name').fill('Fix login redirect')
    await see.text(page.getByTestId('rename-desktop-use-suggestion'), "Use 'Fix login redirect (2)'")
    expect(await page.getByTestId('rename-desktop-use-project-suggestion').count()).toBe(0)
    await page.getByTestId('dialog-button-cancel').click()
  })

  it('a desktop whose agent program is missing shows "Agent problem" on its row', async () => {
    await registerAgent(page, { name: 'Missing agent', command: 'agent7-test-no-such-program', args: [], env: {} })
    // The New desktop dialog reads the agents when the launcher opens, so open it again to see the new default agent.
    await page.reload()
    await launcher.createDesktop('Docs site')
    // No reload: the launcher looks for the program again when a desktop is created (UX-87).
    const state = launcher.row('Docs site').getByTestId('launcher-desktop-state')
    await see.text(state, "Agent problem: The program 'agent7-test-no-such-program' was not found.")
    await see.attribute(state, 'data-state', 'error')
    await see.attribute(state, 'title', 'Open the desktop, then Control Center > Agents, to change the command.')
  })
})

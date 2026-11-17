import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Locator } from 'playwright'
import { see, startConnectedDesktop, type ConnectedDesktop } from './fixtures'

/** Control Center: the Permissions page (two blocks, Set all, Apply), the Agents dialog (Test) and the version. */
describe('control center', () => {
  let ctx: ConnectedDesktop
  let centre: Locator

  const page = (id: string): Locator => ctx.desktopPage.getByTestId(id)

  /** Picks an entry of a kit list by its test id (the list opens on a click). */
  async function pick(list: string, value: string): Promise<void> {
    await page(list).click()
    await page(`${list}-option-${value}`).click()
  }

  beforeAll(async () => {
    ctx = await startConnectedDesktop({ title: 'Control desktop' })
    centre = await ctx.desktop.openApp('control-centre')
  })
  afterAll(async () => {
    await ctx?.app.close()
  })

  it('the Permissions page has two blocks with a row for each permission', async () => {
    await centre.getByTestId('control-centre-page-permissions').click()
    await see.visible(page('permissions-table'))
    await see.count(page('permissions-group'), 2)
    await see.text(page('permissions-group').first(), 'What the agent may do')
    await see.text(page('permissions-group').last(), 'Apps the agent may use')
    await see.count(page('permissions-row'), 14)
    await see.text(page('permissions-row').filter({ has: page('permissions-setting-terminal') }), 'Run commands')
    await see.text(page('permissions-setting-terminal'), 'Ask')
    await see.text(page('permissions-row').filter({ has: page('permissions-setting-terminal') }).getByTestId('permissions-mode'), 'Ask: asks you each time')
  })

  it('with the chat pane open the Permissions page keeps readable columns and a whole page (UX-198)', async () => {
    await centre.getByTestId('chat-pane-toggle').click()
    const pageBody = page('permissions-page')
    await see.visible(pageBody)
    // The pane never takes so much that the app has under 420 px; the pages go in a strip on top, so the text keeps the width.
    await see.eventually(async () => expect((await pageBody.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(300))
    await see.eventually(async () => expect((await page('permissions-covers').first().boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(300))
    // "Set every permission to" and the buttons stay in the page: they are reachable (the page scrolls).
    await page('permissions-set-all').scrollIntoViewIfNeeded()
    await see.visible(page('permissions-set-all'))
    await page('permissions-ok').scrollIntoViewIfNeeded()
    await see.visible(page('permissions-ok'))
    // A narrow page shows the first two sentences of the help, with More for the rest.
    if ((await pageBody.getAttribute('data-narrow')) === 'true') {
      await see.visible(page('permissions-help-more'))
      await page('permissions-help-more').click()
      await see.visible(page('permissions-help-less'))
    }
    await centre.getByTestId('embedded-chat-toggle').click()
    await see.visible(centre.getByTestId('chat-pane-toggle'))
  })

  it('Set all changes every row, says Not applied yet, and Apply saves and shows the chips', async () => {
    await see.attribute(page('permissions-status'), 'data-kind', 'none')
    await pick('permissions-set-all-value', 'deny')
    await page('permissions-set-all').click()
    await see.text(page('permissions-setting-fs-read'), 'Deny')
    await see.text(page('permissions-setting-openApps'), 'Deny')
    await see.attribute(page('permissions-status'), 'data-kind', 'pending')
    await see.text(page('permissions-status'), 'Not applied yet')
    await page('permissions-apply').click()
    await see.attribute(page('permissions-status'), 'data-kind', 'saved')
    await see.text(page('permissions-status'), 'Saved. New requests use these settings.')
    await see.attribute(ctx.desktop.toolChip('fs.read'), 'data-state', 'off')
  })

  it('OK stays on the same pixel when the first change is made, and a row name stays on one line (UX-115)', async () => {
    const ok = page('permissions-ok')
    const before = await ok.boundingBox()
    await pick('permissions-setting-fs-read', 'allow')
    await see.attribute(page('permissions-status'), 'data-kind', 'pending')
    expect(await ok.boundingBox()).toEqual(before)
    const row = page('permissions-row').filter({ has: page('permissions-setting-terminal') })
    const box = await row.boundingBox()
    // Name, setting, what it covers and the mode line: no row grows by a wrapped name.
    expect(box!.height).toBeLessThan(90)
    await page('permissions-cancel').click()
    await see.visible(page('permissions-callout'))
  })

  it('a button that is off says why in its tooltip (UX-127)', async () => {
    await centre.getByTestId('control-centre-page-agents').click()
    await see.attribute(page('agents-edit'), 'title', 'Select an agent first')
    await page('agents-row').filter({ hasText: 'Yes' }).first().click()
    await see.attribute(page('agents-set-default'), 'title', 'This is already the default')
    await see.text(page('agents-reason'), 'This is already the default')
    await centre.getByTestId('control-centre-page-permissions').click()
  })

  it('one row can be changed and saved with OK, and the line goes away by itself', async () => {
    await pick('permissions-setting-fs-read', 'allow')
    await see.attribute(page('permissions-status'), 'data-kind', 'pending')
    await page('permissions-ok').click()
    await see.attribute(page('permissions-status'), 'data-kind', 'saved')
    await see.attribute(page('permissions-status'), 'data-kind', 'none')
  })

  it('Cancel drops a change that was not saved', async () => {
    await pick('permissions-setting-browser', 'allow')
    await see.text(page('permissions-setting-browser'), 'Allow')
    await page('permissions-cancel').click()
    await see.text(page('permissions-setting-browser'), 'Deny')
    await see.attribute(page('permissions-status'), 'data-kind', 'none')
  })

  it('the Add Agent dialog tests the command, names the agent after it and makes it the default', async () => {
    await centre.getByTestId('control-centre-page-agents').click()
    await page('agents-add').click()
    await see.visible(page('agents-dialog'))
    await page('agents-dialog-command').fill('node')
    await page('agents-dialog-test').click()
    await see.text(page('agents-dialog-test-result'), "Found 'node'.")
    await page('agents-dialog-command').fill('no-such-program-agentxp')
    await page('agents-dialog-test').click()
    await see.text(page('agents-dialog-test-result'), "Could not find 'no-such-program-agentxp'.")
    await page('agents-dialog-command').fill('node')
    await page('agents-dialog-args').fill('my-agent.js')
    await page('dialog-button-ok').click()
    await see.gone(page('agents-dialog'))
    const row = page('agents-row').filter({ hasText: 'node my-agent.js' })
    await see.visible(row)
    await see.text(row, 'Yes')
  })

  it('the About box shows the package version and its close button is whole inside the frame', async () => {
    await centre.getByTestId('menubar-help').click()
    await page('control-centre-menu-about').click()
    const box = page('control-centre-about')
    await see.visible(box)
    await see.text(box, 'Control Center is part of AgentXP (version 0.1.0). It has no separate version.')
    const frame = await box.boundingBox()
    const close = await box.getByTestId('window-close').boundingBox()
    expect(frame && close && close.y >= frame.y && close.y + close.height <= frame.y + 30 && close.height >= 18).toBe(true)
    await page('control-centre-about-ok').click()
    await see.gone(box)
  })

  it('the About page shows the version of package.json', async () => {
    await centre.getByTestId('control-centre-page-about').click()
    await see.text(page('control-centre-version'), 'Version 0.1.0')
    expect(await page('control-centre-version').innerText()).not.toContain('45.')
  })
})

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { see, startConnectedDesktop, type ConnectedDesktop } from './fixtures'

/** WordPad: write markdown, read it formatted, save it, start a new one and open the saved file again. */
describe('WordPad', () => {
  let ctx: ConnectedDesktop

  beforeAll(async () => {
    ctx = await startConnectedDesktop({ title: 'WordPad desktop' })
  })
  afterAll(async () => ctx?.app.close())

  const app = () => ctx.desktop.window('wordpad').getByTestId('wordpad-app')
  const openSaved = async (name: string) => {
    await ctx.desktopPage.keyboard.press('Control+O')
    await see.visible(ctx.desktopPage.getByTestId('open-file-dialog'))
    await ctx.desktopPage.getByTestId('open-file-dialog').getByTestId('open-file-item').filter({ hasText: name }).dblclick()
  }

  it('Edit takes markdown and Read shows it formatted', async () => {
    await ctx.desktop.openApp('wordpad')
    await see.visible(app())
    await app().getByTestId('wordpad-mode-edit').click()
    await app().getByTestId('wordpad-source').fill('# Release plan\n\nShip the **beta** on Friday.')
    await app().getByTestId('wordpad-mode-read').click()
    await see.text(app().getByTestId('wordpad-reader'), 'Release plan')
    await see.text(app().getByTestId('wordpad-reader'), 'Ship the beta on Friday.')
  })

  it('Save asks for a name and saves a markdown file, adding .md when the name has none', async () => {
    await app().getByTestId('wordpad-reader').click()
    await ctx.desktopPage.keyboard.press('Control+S')
    await see.visible(ctx.desktopPage.getByTestId('save-as-dialog'))
    await ctx.desktopPage.getByTestId('save-as-name').fill('release-plan')
    await ctx.desktopPage.getByTestId('save-as-dialog').getByTestId('dialog-button-ok').click()
    await see.gone(ctx.desktopPage.getByTestId('save-as-dialog'))
    await see.text(app(), 'Saved release-plan.md')
  })

  it('New empties the document, and Open brings the saved file back', async () => {
    await ctx.desktopPage.keyboard.press('Control+N')
    await see.text(app().getByTestId('wordpad-reader'), 'This document is empty')
    await openSaved('release-plan.md')
    await see.text(app().getByTestId('wordpad-reader'), 'Release plan')
  })

  it('an edit is saved to the same file, and a new window opens it with the edit', async () => {
    await app().getByTestId('wordpad-mode-edit').click()
    await app().getByTestId('wordpad-source').fill('# Release plan\n\nShip on Monday instead.')
    await app().getByTestId('wordpad-source').press('Control+S')
    await see.text(app(), 'Saved release-plan.md')
    await ctx.desktop.closeWindow('wordpad')
    await see.count(ctx.desktop.windows('wordpad'), 0)
    await ctx.desktop.openApp('wordpad')
    await openSaved('release-plan.md')
    await see.text(app().getByTestId('wordpad-reader'), 'Ship on Monday instead.')
    await app().getByTestId('wordpad-mode-edit').click()
    await see.eventually(async () => expect(await app().getByTestId('wordpad-source').inputValue()).toContain('Monday'))
  })
})

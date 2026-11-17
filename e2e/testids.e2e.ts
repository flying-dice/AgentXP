import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { see, shot, startConnectedDesktop, type ConnectedDesktop } from './fixtures'

/**
 * Agents validate changes with tools, so every control and every open menu can be found by a stable data-testid
 * (scripts/check-testids.mjs checks the source; this spec checks that the ids reach the running app).
 */
describe('stable test ids', () => {
  let ctx: ConnectedDesktop

  beforeAll(async () => {
    ctx = await startConnectedDesktop({ title: 'Test id desktop' })
  })
  afterAll(async () => {
    await ctx?.app.close()
  })

  it('open menus are found by id: menu bar menus, drop-down menus and context menus', async () => {
    const page = ctx.desktopPage
    const kanban = await ctx.desktop.openApp('kanban')
    await kanban.getByTestId('menubar-file').click()
    const fileMenu = page.getByTestId('menubar-file-menu')
    await see.visible(fileMenu)
    await see.visible(fileMenu.getByTestId('kanban-menu-new-board'))
    const button = await kanban.getByTestId('menubar-file').boundingBox()
    const menu = await fileMenu.boundingBox()
    expect(menu && button && menu.y >= button.y + button.height - 2).toBe(true)
    await shot(page, 'testids-menubar-menu')
    await page.keyboard.press('Escape')
    await see.count(fileMenu, 0)

    await kanban.getByTestId('kanban-board').click({ button: 'right' })
    await see.visible(page.getByTestId('context-menu'))
    await see.visible(page.getByTestId('context-menu').getByTestId('kanban-ctx-new-board'))
    await page.keyboard.press('Escape')
    await see.count(page.getByTestId('context-menu'), 0)
    await ctx.desktop.closeWindow('kanban')

    const notes = await ctx.desktop.openApp('sticky-notes')
    await notes.getByTestId('sticky-color').click()
    await see.visible(page.getByTestId('sticky-color-menu').getByTestId('sticky-color-blue'))
    await shot(page, 'testids-dropdown-menu')
    await page.getByTestId('sticky-color-blue').click()
    await see.count(page.getByTestId('sticky-color-menu'), 0)
    await ctx.desktop.closeWindow('sticky-notes')
  })

  it('backfilled controls are found by id and work', async () => {
    const page = ctx.desktopPage
    const snip = await ctx.desktop.openApp('snipping-tool')
    await snip.getByTestId('snipping-tool-type').click()
    const types = page.getByTestId('snipping-tool-type-menu')
    await see.visible(types.getByTestId('snipping-tool-type-rect'))
    await see.visible(types.getByTestId('snipping-tool-type-window'))
    await see.visible(types.getByTestId('snipping-tool-type-full'))
    await page.keyboard.press('Escape')
    await snip.getByTestId('snipping-tool-options').click()
    await see.visible(snip.getByTestId('snipping-tool-delay'))
    await snip.getByTestId('dialog-button-ok').click()
    await see.count(snip.getByTestId('snipping-tool-delay'), 0)
    await ctx.desktop.closeWindow('snipping-tool')

    const paint = await ctx.desktop.openApp('paint')
    // Color 1 is the front swatch; Color 2 sits behind it, as in XP Paint.
    await see.attribute(paint.getByTestId('paint-color-1'), 'aria-pressed', 'true')
    await see.attribute(paint.getByTestId('paint-color-2'), 'aria-pressed', 'false')
    await see.visible(paint.getByTestId('paint-canvas-grip'))
    await shot(page, 'testids-paint')
    await ctx.desktop.closeWindow('paint')

    const wordpad = await ctx.desktop.openApp('wordpad')
    await wordpad.getByTestId('wordpad-mode-edit').click()
    for (const id of ['bold', 'italic', 'h1', 'h2', 'bullets', 'numbers', 'code', 'link']) await see.visible(wordpad.getByTestId(`wordpad-format-${id}`))
    await shot(page, 'testids-wordpad')
    await ctx.desktop.closeWindow('wordpad')

    const diagrams = await ctx.desktop.openApp('diagrams')
    await see.visible(diagrams.getByTestId('diagrams-page-first'))
    await see.visible(diagrams.getByTestId('diagrams-page-last'))
    await ctx.desktop.closeWindow('diagrams')
  })
})

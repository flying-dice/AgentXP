import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Locator, Page } from 'playwright'
import { see, startConnectedDesktop, startScriptedDesktop, type ConnectedDesktop, type ScriptedDesktop } from './fixtures'

/** Drags a stencil from the Shapes window and lets it go over the drawing page, `dx`/`dy` from the page's top-left. */
async function dropStencil(page: Page, app: Locator, stencil: string, dx: number, dy: number): Promise<void> {
  const tile = app.getByTestId('diagrams-shapes').getByTestId(`diagrams-stencil-${stencil}`)
  await tile.scrollIntoViewIfNeeded()
  const from = await tile.boundingBox()
  const to = await app.getByTestId('diagrams-page').boundingBox()
  if (!from || !to) throw new Error('no box')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + dx - 20, to.y + dy - 20, { steps: 6 })
  await page.mouse.move(to.x + dx, to.y + dy, { steps: 4 })
  await page.mouse.up()
}

/** Drags with the mouse between the centres of two elements. */
async function dragBetween(page: Page, a: Locator, b: Locator): Promise<void> {
  const [x, y] = [await a.boundingBox(), await b.boundingBox()]
  if (!x || !y) throw new Error('no box')
  await page.mouse.move(x.x + x.width / 2, x.y + x.height / 2)
  await page.mouse.down()
  await page.mouse.move(y.x + y.width / 2, y.y + y.height / 2, { steps: 10 })
  await page.mouse.up()
}

describe('Agent Diagrams: drawing by hand', () => {
  let ctx: ConnectedDesktop
  let app: Locator

  beforeAll(async () => {
    ctx = await startConnectedDesktop({ title: 'Diagrams desktop' })
    app = await ctx.desktop.openApp('diagrams')
    await see.visible(app.getByTestId('diagrams-app'))
  })
  afterAll(async () => ctx?.app.close())

  it('drops shapes from the Shapes window, connects them and undoes the connector', async () => {
    const svg = app.getByTestId('diagrams-svg')
    await see.visible(app.getByTestId('diagrams-shapes'))
    await dropStencil(ctx.desktopPage, app, 'flowchart.process', 200, 120)
    await dropStencil(ctx.desktopPage, app, 'flowchart.decision', 200, 300)
    await see.attribute(svg, 'data-shapes', '2')
    // The dropped shape is selected: typing replaces its text, Ctrl+Enter ends the edit.
    await ctx.desktopPage.keyboard.type('Valid?')
    await see.visible(app.getByTestId('diagrams-text-editor'))
    await ctx.desktopPage.keyboard.press('Control+Enter')
    await see.gone(app.getByTestId('diagrams-text-editor'))
    await see.text(app.getByTestId('diagrams-shape').nth(1), 'Valid?')

    await app.getByTestId('diagrams-tool-connector').click()
    await dragBetween(ctx.desktopPage, app.getByTestId('diagrams-shape').nth(0), app.getByTestId('diagrams-shape').nth(1))
    await see.attribute(svg, 'data-connectors', '1')
    await app.getByTestId('diagrams-tool-pointer').click()

    await app.getByTestId('diagrams-tb-undo').click()
    await see.attribute(svg, 'data-connectors', '0')
    await app.getByTestId('diagrams-tb-redo').click()
    await see.attribute(svg, 'data-connectors', '1')
  })

  it('selects a shape and changes it in the Format pane', async () => {
    await app.getByTestId('diagrams-shape').nth(0).click()
    await see.visible(app.getByTestId('diagrams-selection'))
    await see.visible(app.getByTestId('diagrams-format-shape'))
    const text = app.getByTestId('diagrams-format-text')
    await text.fill('Check order')
    await text.press('Tab')
    await see.text(app.getByTestId('diagrams-shape').nth(0), 'Check order')
    await app.getByTestId('diagrams-tb-bold').click()
    await see.attribute(app.getByTestId('diagrams-tb-bold'), 'aria-pressed', 'true')
  })

  it('finds shapes with Search for Shapes', async () => {
    await app.getByTestId('diagrams-shape-search').fill('crow entity')
    await see.visible(app.getByTestId('diagrams-search-results'))
    await see.visible(app.getByTestId('diagrams-search-results').getByTestId('diagrams-stencil-erd.entity'))
    await app.getByTestId('diagrams-shape-search').fill('')
    await see.gone(app.getByTestId('diagrams-search-results'))
  })

  it('adds and renames a page from the page tabs', async () => {
    await app.getByTestId('diagrams-page-add').click()
    await see.count(app.getByTestId('diagrams-page-tab'), 2)
    await see.attribute(app.getByTestId('diagrams-svg'), 'data-shapes', '0')
    await app.getByTestId('diagrams-page-tab').nth(1).dblclick()
    await app.getByTestId('diagrams-page-rename').fill('Data model')
    await app.getByTestId('diagrams-page-rename').press('Enter')
    await see.text(app.getByTestId('diagrams-page-tab').nth(1), 'Data model')
    await app.getByTestId('diagrams-page-tab').nth(0).click()
    await see.attribute(app.getByTestId('diagrams-svg'), 'data-shapes', '2')
  })

  it('saves the drawing as an .xpdiagram file and opens it again', async () => {
    await app.getByTestId('menubar-file').click()
    await ctx.desktopPage.getByTestId('diagrams-menu-save').click()
    await see.visible(ctx.desktopPage.getByTestId('save-as-dialog'))
    await ctx.desktopPage.getByTestId('save-as-name').fill('order-check')
    await ctx.desktopPage.getByTestId('save-as-dialog').getByTestId('dialog-button-ok').click()
    await see.text(app.getByTestId('diagrams-status'), 'order-check.xpdiagram')
    await see.text(ctx.desktop.window('diagrams'), 'order-check.xpdiagram - Agent Diagrams')

    await app.getByTestId('menubar-file').click()
    await ctx.desktopPage.getByTestId('diagrams-menu-new').click()
    await see.attribute(app.getByTestId('diagrams-svg'), 'data-shapes', '0')
    await ctx.desktopPage.keyboard.press('Control+O')
    await see.visible(ctx.desktopPage.getByTestId('open-file-dialog'))
    await ctx.desktopPage.getByTestId('open-file-dialog').getByTestId('open-file-item').filter({ hasText: 'order-check.xpdiagram' }).dblclick()
    await see.attribute(app.getByTestId('diagrams-svg'), 'data-shapes', '2')
    await see.count(app.getByTestId('diagrams-page-tab'), 2)
  })
})

/** The agent draws through the diagram_* tools: desktop.json's "diagram" rule. */
describe('Agent Diagrams: the agent draws', () => {
  let ctx: ScriptedDesktop

  beforeAll(async () => {
    ctx = await startScriptedDesktop({ script: 'desktop', title: 'Agent draws a diagram' })
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat().composer)
  })
  afterAll(async () => ctx?.close())

  it('opens Agent Diagrams, draws a flowchart with auto layout and saves it', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('Please draw a diagram of the login flow')
    await see.visible(chat.agentMessage('Drew the login flow'))
    await see.text(chat.agentMessage('Drew the login flow'), 'login-flow.xpdiagram')
    const app = ctx.desktop.window('diagrams')
    await see.attribute(app.getByTestId('diagrams-svg'), 'data-shapes', '4')
    await see.attribute(app.getByTestId('diagrams-svg'), 'data-connectors', '4')
    await see.text(app.getByTestId('diagrams-status'), 'login-flow.xpdiagram')
    await see.attribute(chat.toolCalls.last(), 'data-status', 'done')
    expect(await chat.toolCalls.count()).toBe(4)
  })
})

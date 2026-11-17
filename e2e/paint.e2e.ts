import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Locator } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { reconnectDesktop, see, startConnectedDesktop, type ConnectedDesktop } from './fixtures'

/** The colour of one canvas pixel, as [r, g, b]. */
const pixel = (canvas: Locator, x: number, y: number): Promise<number[]> =>
  canvas.evaluate((el, [px, py]) => [...(el as HTMLCanvasElement).getContext('2d')!.getImageData(px, py, 1, 1).data].slice(0, 3), [x, y])

/** Agent Paint: draw, save the picture in Documents, start again, open it, and see it again after a restart. */
describe('Agent Paint', () => {
  let userData: string
  let ctx: ConnectedDesktop

  beforeAll(async () => {
    userData = await mkdtemp(join(tmpdir(), 'a7-e2e-paint-'))
    ctx = await startConnectedDesktop({ title: 'Paint desktop', userData })
  })
  afterAll(async () => {
    await ctx?.app.close()
    await rm(userData, { recursive: true, force: true })
  })

  const app = () => ctx.desktop.window('paint').getByTestId('paint-app')
  const canvas = () => app().getByTestId('paint-canvas')

  it('the pencil draws on the canvas', async () => {
    await ctx.desktop.openApp('paint')
    await see.visible(app())
    await app().getByTestId('paint-tool-rect').click()
    await app().getByTestId('paint-size-8').click()
    const box = (await canvas().boundingBox())!
    await ctx.desktopPage.mouse.move(box.x + 20, box.y + 20)
    await ctx.desktopPage.mouse.down()
    await ctx.desktopPage.mouse.move(box.x + 120, box.y + 90, { steps: 5 })
    await ctx.desktopPage.mouse.up()
    await see.eventually(async () => expect(await pixel(canvas(), 20, 50)).not.toEqual([255, 255, 255]))
  })

  it('Save asks for a name and saves a PNG in Documents', async () => {
    await ctx.desktopPage.keyboard.press('Control+S')
    await see.visible(ctx.desktopPage.getByTestId('save-as-dialog'))
    await ctx.desktopPage.getByTestId('save-as-name').fill('sketch')
    await ctx.desktopPage.getByTestId('save-as-dialog').getByTestId('dialog-button-ok').click()
    await see.text(app().getByTestId('paint-status'), 'Saved sketch.png')
  })

  it('New clears the canvas, and Open brings the saved picture back', async () => {
    await ctx.desktopPage.keyboard.press('Control+N')
    await see.eventually(async () => expect(await pixel(canvas(), 20, 50)).toEqual([255, 255, 255]))
    await ctx.desktopPage.keyboard.press('Control+O')
    await see.visible(ctx.desktopPage.getByTestId('open-file-dialog'))
    await ctx.desktopPage.getByTestId('open-file-dialog').getByTestId('open-file-item').filter({ hasText: 'sketch.png' }).dblclick()
    await see.text(app().getByTestId('paint-status'), 'sketch.png')
    await see.eventually(async () => expect(await pixel(canvas(), 20, 50)).not.toEqual([255, 255, 255]))
  })

  it('a new stroke marks the picture modified, and Save writes the same file without asking', async () => {
    const box = (await canvas().boundingBox())!
    await ctx.desktopPage.mouse.move(box.x + 200, box.y + 150)
    await ctx.desktopPage.mouse.down()
    await ctx.desktopPage.mouse.move(box.x + 260, box.y + 190, { steps: 5 })
    await ctx.desktopPage.mouse.up()
    await see.text(app().getByTestId('paint-status'), 'sketch.png (modified)')
    await ctx.desktopPage.keyboard.press('Control+S')
    await see.text(app().getByTestId('paint-status'), 'Saved sketch.png')
    await see.count(ctx.desktopPage.getByTestId('save-as-dialog'), 0)
  })

  it('after a restart the window shows the saved picture again', async () => {
    await ctx.app.close()
    ctx = await reconnectDesktop(userData, 'Paint desktop')
    await see.visible(app())
    await see.text(app().getByTestId('paint-status'), 'sketch.png')
    await see.eventually(async () => expect(await pixel(canvas(), 20, 50)).not.toEqual([255, 255, 255]))
    await see.eventually(async () => expect(await pixel(canvas(), 200, 170)).not.toEqual([255, 255, 255]))
  })
})

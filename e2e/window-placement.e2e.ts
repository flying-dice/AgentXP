import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { see, startConnectedDesktop, type ConnectedDesktop } from './fixtures'

/** UX-88: a new window starts below the top bar and beside its parent, so every title bar and close button can be seen. */
describe('window placement below the top bar', () => {
  let ctx: ConnectedDesktop

  beforeAll(async () => {
    ctx = await startConnectedDesktop({ title: 'Placement desktop' })
  })
  afterAll(async () => {
    await ctx?.app.close()
  })

  const box = async (locator: ReturnType<ConnectedDesktop['desktop']['window']>) => {
    const b = await locator.boundingBox()
    if (!b) throw new Error('window has no box')
    return b
  }
  const barBottom = async (): Promise<number> => {
    const b = await ctx.desktopPage.getByTestId('topbar').boundingBox()
    return b ? b.y + b.height : 0
  }

  it('the title bar and close button of a new window are below the top bar', async () => {
    const notepad = await ctx.desktop.openApp('notepad')
    const close = await box(notepad.getByTestId('window-close'))
    expect(close.y).toBeGreaterThanOrEqual(await barBottom())
  })

  it('a second window opens beside the first and leaves its title bar visible', async () => {
    const first = ctx.desktop.window('notepad')
    const firstBox = await box(first)
    const second = await ctx.desktop.openApp('terminal')
    const secondBox = await box(second)
    expect(secondBox.y).toBeGreaterThanOrEqual(await barBottom())
    // 28 px right and down from the focused window: its title bar (the top 28 px) is not covered.
    const covers = secondBox.x < firstBox.x + firstBox.width && firstBox.x < secondBox.x + secondBox.width && secondBox.y < firstBox.y + 28 && firstBox.y < secondBox.y + secondBox.height
    expect(covers).toBe(false)
  })

  it('Help opens without covering the title bar of the window that is open', async () => {
    const help = await ctx.desktop.openHelp()
    await see.visible(help)
    const helpBox = await box(help)
    expect(helpBox.y).toBeGreaterThanOrEqual(await barBottom())
    const terminal = await box(ctx.desktop.window('terminal'))
    const covers = helpBox.x < terminal.x + terminal.width && terminal.x < helpBox.x + helpBox.width && helpBox.y < terminal.y + 28 && terminal.y < helpBox.y + helpBox.height
    expect(covers).toBe(false)
  })
})

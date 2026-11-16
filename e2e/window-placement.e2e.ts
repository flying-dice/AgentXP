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

  it('Help opens whole and centred, with its search box inside the window (UX-165)', async () => {
    const help = await ctx.desktop.openHelp()
    await see.visible(help)
    const helpBox = await box(help)
    expect(helpBox.y).toBeGreaterThanOrEqual(await barBottom())
    expect(helpBox.width).toBeGreaterThanOrEqual(640)
    const work = await box(ctx.desktop.taskbar)
    expect(helpBox.x).toBeGreaterThanOrEqual(work.x)
    expect(helpBox.x + helpBox.width).toBeLessThanOrEqual(work.x + work.width)
    expect(Math.abs(helpBox.x - work.x - (work.width - helpBox.width) / 2)).toBeLessThanOrEqual(2)
    const search = await box(help.getByTestId('help-search'))
    expect(search.x + search.width).toBeLessThanOrEqual(helpBox.x + helpBox.width - 8)
  })

  it('a new window does not cover the desktop icons (UX-166)', async () => {
    const icons = await box(ctx.desktop.icon('control-centre'))
    const win = await box(await ctx.desktop.openApp('notepad'))
    expect(win.x).toBeGreaterThanOrEqual(icons.x + icons.width)
  })

  const covers = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

  it('Event Viewer and Computer open beside the chat they came from, and the Send button of the chat stays visible (UX-181)', async () => {
    await ctx.desktop.openApp('chat')
    const chat = ctx.desktop.window('chat')
    await see.visible(chat.getByTestId('chat-send'))
    await ctx.desktop.openApp('event-viewer')
    const viewer = ctx.desktop.window('event-viewer')
    await see.visible(viewer)
    await see.eventually(async () => expect(covers(await box(viewer), await box(chat))).toBe(false))
    await ctx.desktop.focusWindow('chat')
    const computer = await ctx.desktop.openComputer()
    await see.eventually(async () => expect(covers(await box(computer.frame), await box(chat))).toBe(false))
    const viewport = await ctx.desktopPage.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))
    const send = await box(chat.getByTestId('chat-send'))
    expect(send.y + send.height).toBeLessThanOrEqual(viewport.height)
    for (const win of [viewer, computer.frame]) {
      const b = await box(win)
      expect(b.x).toBeGreaterThanOrEqual(0)
      expect(b.x + b.width).toBeLessThanOrEqual(viewport.width + 1)
      expect(b.y + b.height).toBeLessThanOrEqual(viewport.height + 1)
    }
  })
})

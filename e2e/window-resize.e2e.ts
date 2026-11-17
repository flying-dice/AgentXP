import type { Locator } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createWorkspace, see, startConnectedDesktop, type AppId, type ConnectedDesktop, type Workspace } from './fixtures'

/**
 * Every app window lays out at its smallest size, at a medium size and maximized, with the chat pane hidden and shown: nothing
 * in the app runs past its client area, the menu bar and status bar stay whole, and the docked pane never covers the app (in a
 * window too narrow to dock it floats over the app instead). Sizes are set the way a user sets them: by dragging the corner grip.
 */
describe('window resizing', () => {
  let ctx: ConnectedDesktop
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace()
    ctx = await startConnectedDesktop({ title: 'Resize desktop', workspace })
    await ctx.desktopPage.setViewportSize({ width: 1440, height: 900 })
  })
  afterAll(async () => {
    await ctx?.app.close()
    await workspace?.remove()
  })

  type Box = { x: number; y: number; width: number; height: number }
  const box = async (locator: Locator): Promise<Box> => {
    const b = await locator.boundingBox()
    if (!b) throw new Error('no box')
    return b
  }
  const inside = (inner: Box, outer: Box): boolean =>
    inner.x >= outer.x - 1 && inner.y >= outer.y - 1 && inner.x + inner.width <= outer.x + outer.width + 1 && inner.y + inner.height <= outer.y + outer.height + 1

  /** Drags the bottom-right grip so that the window gets as close to `width` x `height` as its minimum and the desktop allow. */
  async function dragTo(win: Locator, width: number, height: number): Promise<void> {
    if ((await win.getAttribute('data-window-state')) === 'maximized') await win.getByTestId('window-maximize').click()
    await see.visible(win.getByTestId('window-grip-se'))
    const frame = await box(win)
    const grip = await box(win.getByTestId('window-grip-se'))
    const page = ctx.desktopPage
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
    await page.mouse.down()
    await page.mouse.move(grip.x + grip.width / 2 + (width - frame.width) / 2, grip.y + grip.height / 2 + (height - frame.height) / 2, { steps: 3 })
    await page.mouse.move(grip.x + grip.width / 2 + (width - frame.width), grip.y + grip.height / 2 + (height - frame.height), { steps: 3 })
    await page.mouse.up()
  }

  async function setPane(win: Locator, open: boolean): Promise<void> {
    const shown = (await win.getByTestId('chat-pane').count()) > 0
    if (open && !shown) await win.getByTestId('chat-pane-toggle').click()
    if (!open && shown) await win.getByTestId('embedded-chat-toggle').click()
    await see.count(win.getByTestId('chat-pane'), open ? 1 : 0)
  }

  /** The checks every size and pane state must pass. */
  async function expectWholeLayout(app: AppId, win: Locator, label: string): Promise<void> {
    await see.eventually(async () => {
      const client = win.getByTestId('window-client')
      const clientBox = await box(client)
      // Nothing in the app is wider or taller than its client area (it would be cut off at the frame or behind the pane).
      const overflow = await client.evaluate((el) => ({ x: el.scrollWidth - el.clientWidth, y: el.scrollHeight - el.clientHeight }))
      expect(overflow.x, `${app} ${label}: content wider than the window`).toBeLessThanOrEqual(1)
      expect(overflow.y, `${app} ${label}: content taller than the window`).toBeLessThanOrEqual(1)
      // The menu bar (when the app has one) shows every menu inside the window.
      const menubar = client.getByTestId('menubar').first()
      if ((await menubar.count()) > 0) {
        const items = menubar.getByTestId(/^menubar-/)
        for (let i = 0; i < (await items.count()); i++) expect(inside(await box(items.nth(i)), clientBox), `${app} ${label}: a menu is cut off`).toBe(true)
      }
      // The status bar is whole and inside the window.
      const status = client.getByTestId('status-strip').first()
      if ((await status.count()) > 0 && (await status.isVisible())) expect(inside(await box(status), clientBox), `${app} ${label}: the status bar is cut off`).toBe(true)
      // A docked pane sits beside the app, never over it.
      const pane = win.getByTestId('chat-pane')
      if ((await pane.count()) > 0) {
        const paneBox = await box(pane)
        const mode = await pane.getAttribute('data-pane-mode')
        if (mode === 'docked') expect(clientBox.x + clientBox.width, `${app} ${label}: the pane covers the app`).toBeLessThanOrEqual(paneBox.x + 1)
        else expect(paneBox.width, `${app} ${label}: the floating pane leaves none of the app`).toBeLessThan(clientBox.width)
        expect(inside(paneBox, await box(win)), `${app} ${label}: the pane runs out of the window`).toBe(true)
      }
    })
  }

  const apps: AppId[] = ['explorer', 'code', 'terminal', 'browser', 'notepad', 'wordpad', 'paint', 'diagrams', 'snipping-tool', 'sticky-notes', 'kanban', 'event-viewer', 'control-centre', 'task-scheduler', 'help']

  for (const app of apps) {
    it(`${app}: lays out whole at its smallest size, at a medium size and maximized, with and without the chat pane`, { timeout: 120_000 }, async () => {
      const win = app === 'help' ? await ctx.desktop.openHelp() : await ctx.desktop.openApp(app)
      await see.visible(win.getByTestId('window-client'))
      for (const pane of [false, true]) {
        await setPane(win, pane)
        for (const [label, width, height] of [['smallest', 100, 100], ['medium', 900, 620]] as const) {
          await dragTo(win, width, height)
          await expectWholeLayout(app, win, `${label}${pane ? ' with the pane' : ''}`)
        }
        await win.getByTestId('window-maximize').click()
        await see.attribute(win, 'data-window-state', 'maximized')
        await expectWholeLayout(app, win, `maximized${pane ? ' with the pane' : ''}`)
        await win.getByTestId('window-maximize').click()
        await see.attribute(win, 'data-window-state', 'normal')
      }
      await setPane(win, false)
      await win.getByTestId('window-close').click()
      await see.count(ctx.desktop.windows(app), 0)
    })
  }

  it('a window cannot be dragged smaller than its app needs (Task Scheduler keeps 760 x 520)', async () => {
    const win = await ctx.desktop.openApp('task-scheduler')
    await dragTo(win, 100, 100)
    await see.eventually(async () => {
      const b = await box(win)
      expect(Math.round(b.width)).toBeGreaterThanOrEqual(760)
      expect(Math.round(b.height)).toBeGreaterThanOrEqual(520)
    })
    await win.getByTestId('window-close').click()
  })

  it('opening the chat pane in a small window widens the window so the app keeps its layout, and hiding the pane gives the width back', async () => {
    const win = await ctx.desktop.openApp('task-scheduler')
    await dragTo(win, 100, 100)
    const before = await box(win)
    await setPane(win, true)
    await see.attribute(win.getByTestId('chat-pane'), 'data-pane-mode', 'docked')
    await see.eventually(async () => expect((await box(win)).width).toBeGreaterThan(before.width + 20))
    const client = await box(win.getByTestId('window-client'))
    expect(client.width).toBeGreaterThanOrEqual(370)
    // The task list and its heading are whole beside the pane (the screenshot of the bug had them cut off under it).
    expect(inside(await box(win.getByTestId('task-scheduler-count')), client)).toBe(true)
    await expectWholeLayout('task-scheduler', win, 'widened for the pane')
    await setPane(win, false)
    await see.eventually(async () => expect(Math.round((await box(win)).width)).toBe(Math.round(before.width)))
    await win.getByTestId('window-close').click()
  })

  it('a window too narrow to dock the pane shows it floating over the app, not crushing it', async () => {
    const win = await ctx.desktop.openApp('notepad')
    await setPane(win, true)
    // Shrinking the window with the pane open leaves no room to dock it beside the app.
    await dragTo(win, 100, 100)
    const pane = win.getByTestId('chat-pane')
    await see.attribute(pane, 'data-pane-mode', 'overlay')
    await expectWholeLayout('notepad', win, 'pane floating')
    // Wide again: it docks beside the app.
    await dragTo(win, 900, 600)
    await see.attribute(pane, 'data-pane-mode', 'docked')
    await setPane(win, false)
    await win.getByTestId('window-close').click()
  })
})

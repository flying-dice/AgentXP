import type { Locator } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { see, setWindowSize as resize, shot as save, startConnectedDesktop, type ConnectedDesktop } from './fixtures'

/**
 * Drop-downs, menus and popups open where Windows XP opens them: a menu bar menu or drop-down hangs below its
 * button and only goes above when there is no room below; context menus open at the pointer; submenus open beside
 * their item; nothing runs off the window or under the taskbar. Checked with the app window maximized and small.
 */
describe('popup placement', () => {
  let ctx: ConnectedDesktop

  beforeAll(async () => {
    ctx = await startConnectedDesktop({ title: 'Popup desktop' })
  })
  afterAll(async () => {
    await ctx?.app.close()
  })

  const box = async (locator: Locator) => {
    const b = await locator.boundingBox()
    if (!b) throw new Error('no box')
    return b
  }
  /** The area popups may use: from the top of the page to the top of the taskbar. */
  const workBottom = async () => (await box(ctx.desktop.taskbar)).y
  const workRight = async () => (await box(ctx.desktop.taskbar)).width
  const expectOnScreen = async (locator: Locator) => {
    const b = await box(locator)
    expect(b.y).toBeGreaterThanOrEqual(0)
    expect(b.x).toBeGreaterThanOrEqual(0)
    expect(b.y + b.height).toBeLessThanOrEqual(await workBottom())
    expect(b.x + b.width).toBeLessThanOrEqual(await workRight())
  }
  const expectBelow = async (item: Locator, button: Locator) => {
    const b = await box(button)
    const i = await box(item)
    expect(i.y).toBeGreaterThanOrEqual(b.y + b.height - 2)
    expect(i.y).toBeLessThan(b.y + b.height + 40)
  }
  /** Set A7_SHOTS=<dir> to keep a screenshot of each popup for eyeballing (see .claude/skills/verify-change). */
  const shot = (name: string) => save(ctx.desktopPage, name)
  const setWindowSize = (width: number, height: number) => resize(ctx.app, ctx.desktopPage, width, height)

  it('a menu bar menu in a maximized window opens below its label (regression: it flipped up off the window)', async () => {
    const win = await ctx.desktop.openApp('kanban')
    await win.getByTestId('window-maximize').click()
    const file = win.getByTestId('menubar-file')
    await file.click()
    const first = ctx.desktopPage.getByTestId('kanban-menu-new-board')
    await see.visible(first)
    await expectBelow(first, file)
    await expectOnScreen(first)
    await expectOnScreen(ctx.desktopPage.getByTestId('kanban-menu-delete-board'))
    await shot('menubar-maximized')
    await ctx.desktopPage.keyboard.press('Escape')
  })

  it('a menu that opens under the expanded top bar is drawn over it and takes clicks (menus sit above every window and bar)', async () => {
    const win = ctx.desktop.window('kanban')
    const help = win.getByTestId('menubar-help')
    await help.click()
    const first = ctx.desktopPage.getByTestId('kanban-menu-help')
    await see.visible(first)
    // The Help menu of a maximized window opens where the top bar hangs down; a click must reach the item, not the bar.
    const bar = await box(ctx.desktop.topBar)
    const item = await box(first)
    expect(item.y).toBeLessThan(bar.y + bar.height)
    expect(item.x + item.width).toBeGreaterThan(bar.x)
    await shot('menu-over-top-bar')
    await first.click()
    await see.visible(ctx.desktop.window('help'))
    await ctx.desktop.closeWindow('help')
  })

  it('the combo box list and the column menu open below their controls', async () => {
    const win = ctx.desktop.window('kanban')
    await win.getByTestId('kanban-new-board').click()
    await win.getByTestId('kanban-board-name-input').fill('Placement')
    await win.getByTestId('kanban-board-name-ok').click()
    await see.count(win.getByTestId('kanban-column'), 3)

    const picker = win.getByTestId('kanban-board-picker')
    await picker.click()
    const option = ctx.desktopPage.getByTestId('kanban-board-picker-option-1') // lists open in the popup layer, outside the window
    await see.visible(option)
    await expectBelow(option, picker)
    await shot('combo')
    await ctx.desktopPage.keyboard.press('Escape')

    const columnMenu = win.getByTestId('kanban-column-menu').first()
    await columnMenu.click()
    const rename = ctx.desktopPage.getByTestId('kanban-ctx-rename-list')
    await see.visible(rename)
    await expectOnScreen(rename)
    const b = await box(columnMenu)
    const r = await box(rename)
    expect(Math.abs(r.y - (b.y + b.height))).toBeLessThan(60)
    await shot('column-menu')
    await ctx.desktopPage.keyboard.press('Escape')
  })

  it('a context menu opens at the pointer and its submenu opens beside its item', async () => {
    const win = ctx.desktop.window('kanban')
    const todo = win.getByTestId('kanban-column').first()
    await todo.getByTestId('kanban-add-card').click()
    await win.getByTestId('kanban-card-dialog-title').fill('A card')
    await win.getByTestId('kanban-card-dialog-ok').click()
    const card = todo.getByTestId('kanban-card').first()
    await see.visible(card)

    const c = await box(card)
    await card.click({ button: 'right', position: { x: 20, y: 10 } })
    const edit = ctx.desktopPage.getByTestId('kanban-ctx-edit')
    await see.visible(edit)
    const e = await box(edit)
    expect(Math.abs(e.x - (c.x + 20))).toBeLessThan(12)
    expect(Math.abs(e.y - (c.y + 10))).toBeLessThan(12)

    const move = ctx.desktopPage.getByTestId('kanban-ctx-move')
    await move.hover()
    const m = await box(move)
    const target = ctx.desktopPage.getByTestId(/^kanban-ctx-move-to-/).nth(1)
    await see.visible(target)
    const t = await box(target)
    expect(t.x).toBeGreaterThanOrEqual(m.x + m.width - 8)
    await expectOnScreen(target)
    await shot('context-submenu')
    await ctx.desktopPage.keyboard.press('Escape')
    await ctx.desktopPage.keyboard.press('Escape')
  })

  it('a tool strip drop-down opens below its button', async () => {
    const win = await ctx.desktop.openApp('sticky-notes')
    const color = win.getByTestId('sticky-color')
    await color.click()
    const yellow = ctx.desktopPage.getByTestId('sticky-color-yellow')
    await see.visible(yellow)
    await expectBelow(yellow, color)
    await expectOnScreen(ctx.desktopPage.getByTestId('sticky-color-white'))
    await shot('toolstrip-dropdown')
    await ctx.desktopPage.keyboard.press('Escape')
    await ctx.desktop.closeWindow('sticky-notes')
  })

  it('in a small window, the menu bar menu still opens below and the Start menu stays on screen', async () => {
    await setWindowSize(900, 600)
    const win = ctx.desktop.window('kanban')
    const file = win.getByTestId('menubar-file')
    await file.click()
    const first = ctx.desktopPage.getByTestId('kanban-menu-new-board')
    await see.visible(first)
    await expectBelow(first, file)
    await expectOnScreen(ctx.desktopPage.getByTestId('kanban-menu-delete-board'))
    await shot('menubar-small')
    await ctx.desktopPage.keyboard.press('Escape')

    await ctx.desktop.openStart()
    await expectOnScreen(ctx.desktopPage.getByTestId('start-menu'))
    await shot('start-menu-small')
    await ctx.desktopPage.getByTestId('taskbar-start').click()
  })

  it('the chat Mode drop-down just above the taskbar flips up, inside the window', async () => {
    const win = await ctx.desktop.openApp('chat')
    await win.getByTestId('window-maximize').click()
    // Wait for the agent: the "Starting the agent..." line above the composer moves the Mode button when it goes.
    await see.visible(win.getByTestId('chat-welcome'))
    await see.count(win.getByTestId('chat-starting'), 0)
    const mode = win.getByTestId('chat-mode')
    await see.visible(mode)
    await mode.click()
    const askFirst = ctx.desktopPage.getByTestId('chat-mode-ask-first')
    await see.visible(askFirst)
    const b = await box(mode)
    const a = await box(askFirst)
    expect(a.y + a.height).toBeLessThanOrEqual(b.y + 2)
    await expectOnScreen(askFirst)
    await shot('mode-dropdown')
    await ctx.desktopPage.keyboard.press('Escape')
  })
})

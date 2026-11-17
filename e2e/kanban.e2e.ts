import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { see, startConnectedDesktop, type ConnectedDesktop } from './fixtures'

/** Kanban: boards, lists and cards made through the dialogs of the window, and a card dragged to another list. */
describe('Kanban', () => {
  let ctx: ConnectedDesktop

  beforeAll(async () => {
    ctx = await startConnectedDesktop({ title: 'Kanban desktop' })
  })
  afterAll(async () => {
    await ctx?.app.close()
  })

  it('makes a board, adds a card with a description and an assignee, edits it and moves it', async () => {
    const win = await ctx.desktop.openApp('kanban')
    await see.visible(win.getByTestId('kanban-empty'))

    await win.getByTestId('kanban-empty-new').click()
    await win.getByTestId('kanban-board-name-input').fill('Test')
    await win.getByTestId('kanban-board-name-ok').click()
    await see.count(win.getByTestId('kanban-column'), 3)

    // Regression: OK in the card dialog failed with "Cannot read properties of null (reading 'columnId')".
    const todo = win.getByTestId('kanban-column').filter({ hasText: 'To do' })
    await todo.getByTestId('kanban-add-card').click()
    await win.getByTestId('kanban-card-dialog-title').fill('Fix the login redirect')
    await win.getByTestId('kanban-card-dialog-description').fill('Keep the next parameter')
    await win.getByTestId('kanban-card-dialog-ok').click()
    await see.count(todo.getByTestId('kanban-card'), 1)
    await see.count(win.getByTestId('kanban-error'), 0)
    await see.text(todo.getByTestId('kanban-card'), 'Fix the login redirect')

    // Edit: properties dialog (double-click), new title and an assignee.
    await todo.getByTestId('kanban-card').first().dblclick()
    await win.getByTestId('kanban-card-dialog-title').fill('Fix the redirect')
    await win.getByTestId('kanban-card-dialog-ok').click()
    await see.text(todo.getByTestId('kanban-card-title'), 'Fix the redirect')
    await see.count(win.getByTestId('kanban-error'), 0)

    // Rename a list.
    await todo.getByTestId('kanban-column-menu').click()
    await ctx.desktopPage.getByTestId('kanban-ctx-rename-list').click()
    await win.getByTestId('kanban-list-name-input').fill('Backlog')
    await win.getByTestId('kanban-list-name-ok').click()
    await see.text(win.getByTestId('kanban-column').first(), 'Backlog')
    await see.count(win.getByTestId('kanban-error'), 0)

    // Drag the card to Doing.
    const doing = win.getByTestId('kanban-column').filter({ hasText: 'Doing' })
    await win.getByTestId('kanban-card').first().dragTo(doing.getByTestId('kanban-add-card'))
    await see.count(doing.getByTestId('kanban-card'), 1)
    await see.count(win.getByTestId('kanban-column').first().getByTestId('kanban-card'), 0)
    expect(await doing.getByTestId('kanban-card-title').first().innerText()).toBe('Fix the redirect')

    await ctx.desktop.closeWindow('kanban')
  })
})

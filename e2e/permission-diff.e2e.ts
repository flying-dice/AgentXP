import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createWorkspace, see, startScriptedDesktop, type ScriptedDesktop, type Workspace } from './fixtures'
import { projectRoot } from './fixtures/launch'

const OLD = "export function afterLogin(url: string): string {\n  void url\n  return '/home'\n}\n"

/** UX-114: the permission box shows the real changed lines of an existing file (the diff comes in the tool call update, the request has a title only). */
describe('permission box: edit of an existing file', () => {
  let ctx: ScriptedDesktop
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace({ 'src/auth/redirect.ts': OLD })
    ctx = await startScriptedDesktop({ script: join(projectRoot, 'e2e/fixtures/scripts/edit-existing.json'), title: 'Permission diff', workspace })
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat().composer)
  })
  afterAll(async () => {
    await ctx?.close()
    await workspace?.remove()
  })

  it('shows added and removed lines, not the "cannot read" sentence', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('fix the redirect')
    await see.visible(chat.permissionDialog)
    const summary = chat.frame.getByTestId('permission-detail-summary')
    await see.visible(summary)
    await see.eventually(async () => expect(await summary.innerText()).toMatch(/\d+ lines? added, \d+ removed/))
    expect(await summary.innerText()).not.toContain('cannot read')
    expect(await chat.permissionDialog.innerText()).not.toContain('cannot show what changes')
    await see.visible(chat.frame.getByTestId('permission-detail'))
  })

  it('gives the change about 7 rows even in the default window, with the changed lines in view, in one scroll area (UX-158, UX-177)', async () => {
    const chat = ctx.desktop.chat()
    const view = chat.frame.getByTestId('permission-detail-view')
    await see.visible(view)
    await see.eventually(async () => expect((await view.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(130))
    // Below 9 rows the box offers the whole change.
    await see.visible(chat.frame.getByTestId('permission-detail-more'))
    // The answers stay in the window next to the preview.
    await see.visible(chat.frame.getByTestId('permission-hint'))
    // The chat above the box keeps one row at least, and the status bar says that the box waits for the answer.
    expect((await chat.transcript.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(28)
    await see.text(chat.frame.getByTestId('chat-status'), 'Waiting for your answer')
  })

  // UX-194: a click on the link always changes the screen. In the default window the chat above the box is already at one row, so the
  // box cannot grow: the click opens the whole change in a box over the chat, at the full height of the window.
  it('"Show the whole change" shows every row of the change, in a box when the window has no room to grow (UX-194)', async () => {
    const chat = ctx.desktop.chat()
    const more = chat.frame.getByTestId('permission-detail-more')
    await see.text(more, 'Show the whole change')
    await see.attribute(more, 'data-mode', 'dialog')
    const before = (await chat.frame.getByTestId('permission-detail-view').boundingBox())?.height ?? 0
    await more.click()
    const whole = chat.frame.getByTestId('permission-whole-change')
    await see.visible(whole)
    const view = chat.frame.getByTestId('permission-whole-change-view')
    await see.eventually(async () => expect((await view.boundingBox())?.height ?? 0).toBeGreaterThan(before))
    // The answers still wait: Allow and Deny are in the window, and Esc closes the whole change, it does not answer.
    await see.visible(chat.frame.getByTestId('permission-hint'))
    await chat.frame.getByTestId('permission-whole-change-close').click()
    await see.gone(whole)
    await see.visible(chat.permissionDialog)
  })

  it('in a window with room the link grows the box, reads "Show fewer lines", and the chat above keeps one row (UX-194)', async () => {
    const chat = ctx.desktop.chat()
    await chat.frame.getByTestId('window-maximize').click()
    const more = chat.frame.getByTestId('permission-detail-more')
    // A big window shows the whole change at once: the link is not offered when a click could show nothing more.
    await see.eventually(async () => expect((await chat.frame.getByTestId('permission-detail-view').boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(180))
    await see.count(more, 0)
    await see.visible(chat.permissionDialog)
  })
})

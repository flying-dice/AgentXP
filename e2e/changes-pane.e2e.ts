import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { allowFileWrites, createWorkspace, see, startScriptedDesktop, type ScriptedDesktop, type Workspace } from './fixtures'
import { projectRoot } from './fixtures/launch'

/**
 * The Changes pane on screen (UX-111, UX-116, UX-117): what the panel saw is measured here, not only the markup.
 * long-edits.json writes five files, one with a 36-character name in a folder, and a 16-line file.
 * UX-184: the list takes the height of its rows (35% of the pane at most), the diff gets the rest, 12 lines at the default size.
 */
describe('Changes pane', () => {
  let ctx: ScriptedDesktop
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace({ 'notes.txt': 'old\n', 'README.md': '# Project\n' })
    ctx = await startScriptedDesktop({ script: join(projectRoot, 'e2e/fixtures/scripts/long-edits.json'), title: 'Changes desktop', workspace })
    await allowFileWrites(ctx.desktopPage)
    await ctx.desktop.openApp('chat')
    await ctx.desktop.openApp('code')
    const chat = ctx.desktop.chat()
    await see.visible(chat.composer)
    await chat.send('make the changes')
    await chat.showChanges()
    await see.count(chat.changes, 5)
  })
  afterAll(async () => ctx?.close())

  /** `inner` lies inside `outer` (1 px of rounding allowed). */
  const inside = (inner: { x: number; y: number; width: number; height: number }, outer: { x: number; y: number; width: number; height: number }): boolean =>
    inner.x >= outer.x - 1 && inner.y >= outer.y - 1 && inner.x + inner.width <= outer.x + outer.width + 1 && inner.y + inner.height <= outer.y + outer.height + 1

  it('shows whole file names and the line counts of every row at the default window size, in the chat and in Code', async () => {
    const chat = ctx.desktop.chat()
    const code = ctx.desktop.code()
    await code.showChanges()
    for (const frame of [chat.frame, code.frame]) {
      const rows = frame.getByTestId('changes-item')
      const count = await rows.count()
      expect(count).toBe(5)
      for (let i = 0; i < count; i++) {
        const row = rows.nth(i)
        // A short list scrolls (UX-184): bring the row into view first.
        await row.scrollIntoViewIfNeeded()
        const list = (await frame.getByTestId('changes-list').boundingBox())!
        // The end of the name (its last characters and the extension) and the counts are both inside the list: nothing is cut off at the front or pushed out of sight.
        const tail = (await row.getByTestId('changes-name-tail').boundingBox())!
        const lines = (await row.getByTestId('changes-lines').boundingBox())!
        // Across and down: every row lies inside the list, in the chat and in the Code window (UX-151).
        const across = (b: { x: number; width: number }): boolean => b.x >= list.x - 1 && b.x + b.width <= list.x + list.width + 1
        expect(across(tail), `row ${i} name end`).toBe(true)
        expect(across(lines), `row ${i} counts`).toBe(true)
        expect(inside(tail, list), `row ${i} name end in the list`).toBe(true)
        expect(inside(lines, list), `row ${i} counts in the list`).toBe(true)
        // The name is readable: its box is at least 80 px wide (a short list scrolls, and its scroll bar takes 17 px, UX-184).
        expect((await row.getByTestId('changes-file').boundingBox())!.width, `row ${i} name width`).toBeGreaterThanOrEqual(80)
        // The Status word is whole ("Modified", never "Modi...") (UX-207).
        // A list too narrow for the column (the dock of a small Code window) shows the status as the picture of the row, and has no word to cut.
        const status = row.getByTestId('changes-status')
        if ((await status.count()) > 0) expect(await status.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `row ${i} status`).toBe(true)
        // The tail is whole: its text is not clipped by its own box.
        expect(await row.getByTestId('changes-name-tail').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
      }
      // A short name is shown in full, with no ellipsis; the full path is in the tooltip.
      const direct = rows.filter({ hasText: 'direct.test.ts' })
      await see.eventually(async () => expect((await direct.getByTestId('changes-file').innerText()).replace(/\n/g, '')).toContain('direct.test.ts'))
      expect(await direct.getByTestId('changes-name-head').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
      await see.attribute(direct.getByTestId('changes-file'), 'title', /direct\.test\.ts/)
      await see.text(rows.filter({ hasText: 'redirect-handler' }).getByTestId('changes-lines'), '+16 / -0')
    }
  })

  it('gives the list the height of its rows (at most 35% of the room) and the diff the rest, in the chat and in Code (UX-184)', async () => {
    const chat = ctx.desktop.chat()
    const code = ctx.desktop.code()
    await code.showChanges()
    for (const frame of [chat.frame, code.frame]) {
      const list = (await frame.getByTestId('changes-list').boundingBox())!
      const diff = (await frame.getByTestId('changes-diff').boundingBox())!
      // The list shows at least its header and two rows; the diff is not smaller than the list.
      expect(list.height).toBeGreaterThanOrEqual(26 + 2 * 20)
      expect(diff.height).toBeGreaterThanOrEqual(list.height)
      // A diff line is 17 px: 12 of them need 204 px.
      expect(diff.height).toBeGreaterThanOrEqual(12 * 17)
      // The first rows are whole, none is cut at the bottom.
      const rows = frame.getByTestId('changes-item')
      for (let i = 0; i < 2; i++) expect(inside((await rows.nth(i).boundingBox())!, list), `row ${i} in the list`).toBe(true)
    }
  })

  it('says why Revert is grey', async () => {
    const chat = ctx.desktop.chat()
    // Nothing is selected yet.
    await see.text(chat.frame.getByTestId('changes-reason'), 'Select a changed file first.')
    await chat.changes.filter({ hasText: 'session.ts' }).click()
    await see.gone(chat.frame.getByTestId('changes-reason'))
  })

  it('gives the diff at least 12 lines at the default size, and the diff scrolls alone (UX-184)', async () => {
    const chat = ctx.desktop.chat()
    await chat.changes.filter({ hasText: 'redirect-handler' }).click()
    const pane = (await chat.frame.getByTestId('changes-pane').boundingBox())!
    const diff = (await chat.frame.getByTestId('changes-diff').boundingBox())!
    expect(diff.height).toBeGreaterThanOrEqual(12 * 17)
    expect(diff.height).toBeGreaterThanOrEqual(pane.height * 0.4)
    // The status words and the buttons are on screen: the pane itself does not scroll.
    const revert = (await chat.frame.getByTestId('changes-revert').boundingBox())!
    expect(inside(revert, pane)).toBe(true)
  })

  it('keeps a reverted file in the list when the pane or the window is closed and opened again (UX-117)', async () => {
    const chat = ctx.desktop.chat()
    const listBefore = (await chat.frame.getByTestId('changes-list').boundingBox())!
    await chat.changes.filter({ hasText: 'notes.txt' }).click()
    await chat.frame.getByTestId('changes-revert').click()
    await ctx.desktopPage.getByTestId('message-box').getByTestId('dialog-button-yes').click()
    await see.visible(chat.frame.getByTestId('changes-reverted'))
    await see.visible(chat.frame.getByTestId('changes-open-recycle-bin'))
    // Selecting the reverted row says where the change is and offers Restore (UX-185, UX-209). The hint under the list no longer asks for a selection.
    await chat.frame.getByTestId('changes-reverted').click()
    await see.text(chat.frame.getByTestId('changes-undone-text'), 'This change was undone. Restore it to put the file back.')
    await see.text(chat.frame.getByTestId('changes-restore'), 'Restore')
    await see.gone(chat.frame.getByTestId('changes-reason'))
    // The right-click menu opens the Recycle Bin on the item.
    await chat.frame.getByTestId('changes-reverted').click({ button: 'right' })
    await ctx.desktopPage.getByTestId('changes-ctx-restore').click()
    await see.visible(ctx.desktop.window('recycle-bin').getByTestId('recycle-bin-list'))
    await see.attribute(ctx.desktop.window('recycle-bin').getByTestId('recycle-bin-item').first(), 'aria-selected', 'true')
    await ctx.desktop.closeWindow('recycle-bin')
    // The notice is one line above the list and the list keeps its height: nothing is squeezed or clipped (UX-151).
    const note = (await chat.frame.getByTestId('changes-reverted-note').boundingBox())!
    const listAfter = (await chat.frame.getByTestId('changes-list').boundingBox())!
    expect(note.y + note.height).toBeLessThanOrEqual(listAfter.y + 1)
    expect(note.height).toBeLessThanOrEqual(30)
    expect(Math.abs(listAfter.height - listBefore.height)).toBeLessThanOrEqual(1)
    expect(listAfter.height).toBeGreaterThanOrEqual(26 + 2 * 20)
    const rowsAfter = chat.frame.getByTestId('changes-item')
    for (let i = 0; i < (await rowsAfter.count()); i++) expect(inside((await rowsAfter.nth(i).boundingBox())!, listAfter), `row ${i} after revert`).toBe(true)
    expect(inside((await chat.frame.getByTestId('changes-reverted').boundingBox())!, listAfter)).toBe(true)
    // Closing the pane and opening it again.
    await chat.frame.getByTestId('chat-panel-toggle').click()
    await see.gone(chat.frame.getByTestId('changes-pane'))
    await chat.showChanges()
    await see.visible(chat.frame.getByTestId('changes-reverted'))
    await see.visible(chat.frame.getByTestId('changes-open-recycle-bin'))
    // Closing the Code window and opening it again.
    await ctx.desktop.closeWindow('code')
    await see.count(ctx.desktop.windows('code'), 0)
    await ctx.desktop.openApp('code')
    const code = ctx.desktop.code()
    await code.showChanges()
    await see.visible(code.frame.getByTestId('changes-reverted'))
    await see.visible(code.frame.getByTestId('changes-open-recycle-bin'))
    // The same in the Code window: the reverted row is in the list.
    const codeList = (await code.frame.getByTestId('changes-list').boundingBox())!
    expect(codeList.height).toBeGreaterThanOrEqual(26 + 2 * 20)
    // The Code list can be shorter than its rows (35% of a short pane): it scrolls, and the reverted row is reached by scrolling.
    await code.frame.getByTestId('changes-reverted').scrollIntoViewIfNeeded()
    expect(inside((await code.frame.getByTestId('changes-reverted').boundingBox())!, codeList)).toBe(true)
  })

  it('Restore puts the file back in one click and the pane says so (UX-209)', async () => {
    const chat = ctx.desktop.chat()
    await chat.showChanges()
    await chat.frame.getByTestId('changes-reverted').click()
    await chat.frame.getByTestId('changes-restore').click()
    await see.text(chat.frame.getByTestId('changes-restored'), /^Restored .+\.$/)
    await see.gone(chat.frame.getByTestId('changes-reverted'))
    // No Recycle Bin window was opened for it.
    await see.count(ctx.desktop.windows('recycle-bin'), 0)
  })
})

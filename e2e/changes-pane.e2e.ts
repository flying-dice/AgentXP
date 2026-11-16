import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { allowFileWrites, createWorkspace, see, startScriptedDesktop, type ScriptedDesktop, type Workspace } from './fixtures'
import { projectRoot } from './fixtures/launch'

/**
 * The Changes pane on screen (UX-111, UX-116, UX-117): what the panel saw is measured here, not only the markup.
 * long-edits.json writes four files, one with a 36-character name in a folder, and a 16-line file.
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
    await see.count(chat.changes, 4)
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
      const list = (await frame.getByTestId('changes-list').boundingBox())!
      const rows = frame.getByTestId('changes-item')
      const count = await rows.count()
      expect(count).toBe(4)
      for (let i = 0; i < count; i++) {
        const row = rows.nth(i)
        // The end of the name (its last characters and the extension) and the counts are both inside the list: nothing is cut off at the front or pushed out of sight.
        const tail = (await row.getByTestId('changes-name-tail').boundingBox())!
        const lines = (await row.getByTestId('changes-lines').boundingBox())!
        // Across: always. Down: the chat shows all four rows; the short list of the Code window scrolls.
        const across = (b: { x: number; width: number }): boolean => b.x >= list.x - 1 && b.x + b.width <= list.x + list.width + 1
        expect(across(tail), `row ${i} name end`).toBe(true)
        expect(across(lines), `row ${i} counts`).toBe(true)
        if (frame === chat.frame) {
          expect(inside(tail, list), `row ${i} name end in the list`).toBe(true)
          expect(inside(lines, list), `row ${i} counts in the list`).toBe(true)
        }
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

  it('says why Revert is grey', async () => {
    const chat = ctx.desktop.chat()
    // Nothing is selected yet.
    await see.text(chat.frame.getByTestId('changes-reason'), 'Select a changed file first.')
    await chat.changes.filter({ hasText: 'session.ts' }).click()
    await see.gone(chat.frame.getByTestId('changes-reason'))
  })

  it('gives the diff most of the pane: at least 40% of its height and 12 lines at the default size', async () => {
    const chat = ctx.desktop.chat()
    await chat.changes.filter({ hasText: 'redirect-handler' }).click()
    const pane = (await chat.frame.getByTestId('changes-pane').boundingBox())!
    const diff = (await chat.frame.getByTestId('changes-diff').boundingBox())!
    expect(diff.height).toBeGreaterThanOrEqual(pane.height * 0.4)
    // A diff line is 17 px: 12 of them need 204 px.
    expect(diff.height).toBeGreaterThanOrEqual(12 * 17)
    // The diff and the buttons are both on screen without scrolling the pane.
    const revert = (await chat.frame.getByTestId('changes-revert').boundingBox())!
    expect(inside(revert, pane)).toBe(true)
  })

  it('keeps a reverted file in the list when the pane or the window is closed and opened again (UX-117)', async () => {
    const chat = ctx.desktop.chat()
    await chat.changes.filter({ hasText: 'notes.txt' }).click()
    await chat.frame.getByTestId('changes-revert').click()
    await ctx.desktopPage.getByTestId('message-box').getByTestId('dialog-button-yes').click()
    await see.visible(chat.frame.getByTestId('changes-reverted'))
    await see.visible(chat.frame.getByTestId('changes-open-recycle-bin'))
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
  })
})

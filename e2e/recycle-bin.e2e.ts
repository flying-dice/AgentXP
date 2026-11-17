import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { allowFileWrites, createWorkspace, see, startScriptedDesktop, type ScriptedDesktop, type Workspace } from './fixtures'
import { projectRoot } from './fixtures/launch'

/** Recycle Bin: a reverted agent change lands in the bin, Restore puts the file back, Empty deletes the rest for good. */
describe('Recycle Bin', () => {
  let ctx: ScriptedDesktop
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace({ 'notes.txt': 'old\n', 'README.md': '# Project\n' })
    ctx = await startScriptedDesktop({ script: join(projectRoot, 'e2e/fixtures/scripts/long-edits.json'), title: 'Recycle desktop', workspace })
    await allowFileWrites(ctx.desktopPage)
    // Writing files needs an app that gives the agent that tool (Code).
    await ctx.desktop.openApp('code')
    await ctx.desktop.openApp('chat')
    const chat = ctx.desktop.chat()
    await see.visible(chat.composer)
    await chat.send('make the changes')
    await chat.showChanges()
    await see.count(chat.changes, 5)
  })
  afterAll(async () => {
    await ctx?.close()
    await workspace?.remove()
  })

  const bin = () => ctx.desktop.window('recycle-bin')
  const revert = async (name: string) => {
    const chat = ctx.desktop.chat()
    await chat.changes.filter({ hasText: name }).click()
    await chat.frame.getByTestId('changes-revert').click()
    await ctx.desktopPage.getByTestId('message-box').getByTestId('dialog-button-yes').click()
  }

  it('starts empty, and a reverted change shows up in it', async () => {
    // The Recycle Bin is a desktop icon, not a Start menu item.
    await ctx.desktop.icon('recycle').dblclick()
    await see.text(bin().getByTestId('recycle-bin-list'), 'The Recycle Bin is empty.')
    await revert('notes.txt')
    await see.eventually(async () => expect(await readFile(join(workspace.path, 'notes.txt'), 'utf8')).toBe('old\n'))
    await see.count(bin().getByTestId('recycle-bin-item'), 1)
    await see.text(bin().getByTestId('recycle-bin-item').first(), 'notes.txt')
  })

  it('Restore this item puts the agent change back in the file and takes it out of the bin', async () => {
    await bin().getByTestId('recycle-bin-item').first().click()
    await bin().getByTestId('recycle-bin-restore').click()
    await see.count(bin().getByTestId('recycle-bin-item'), 0)
    await see.text(bin().getByTestId('recycle-bin-status-notice'), 'notes.txt')
    await see.eventually(async () => expect(await readFile(join(workspace.path, 'notes.txt'), 'utf8')).toBe('x\ny\n'))
  })

  it('Empty the Recycle Bin asks, then deletes every item for good; the files stay as they were reverted', async () => {
    await revert('session.ts')
    await revert('overview.md')
    await see.count(bin().getByTestId('recycle-bin-item'), 2)
    await bin().getByTestId('recycle-bin-empty').click()
    await ctx.desktopPage.getByTestId('message-box').getByTestId('dialog-button-yes').click()
    await see.count(bin().getByTestId('recycle-bin-item'), 0)
    await see.text(bin().getByTestId('recycle-bin-list'), 'The Recycle Bin is empty.')
    await ctx.desktop.closeWindow('recycle-bin')
    await ctx.desktop.icon('recycle').dblclick()
    await see.text(bin().getByTestId('recycle-bin-list'), 'The Recycle Bin is empty.')
  })
})

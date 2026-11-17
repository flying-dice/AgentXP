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
    const summary = ctx.desktopPage.getByTestId('uac-detail-summary')
    await see.visible(summary)
    await see.eventually(async () => expect(await summary.innerText()).toMatch(/\d+ lines? added, \d+ removed/))
    expect(await summary.innerText()).not.toContain('cannot read')
    expect(await chat.permissionDialog.innerText()).not.toContain('cannot show what changes')
    await see.visible(ctx.desktopPage.getByTestId('uac-detail'))
  })

  it('shows the change in the popup with the answers next to it, and the chat window stays usable underneath', async () => {
    const chat = ctx.desktop.chat()
    const view = ctx.desktopPage.getByTestId('uac-detail-view')
    await see.visible(view)
    await see.eventually(async () => expect((await view.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(130))
    await see.visible(ctx.desktopPage.getByTestId('uac-hint'))
    await see.visible(ctx.desktopPage.getByTestId('uac-allow'))
    await see.visible(chat.frame.getByTestId('chat-status'))
  })

  it('a short change has room in the popup, so no "Show all lines" link is offered', async () => {
    await see.count(ctx.desktopPage.getByTestId('uac-detail-more'), 0)
    await see.visible(ctx.desktop.chat().permissionDialog)
  })
})

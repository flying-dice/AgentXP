import { afterAll, beforeAll, describe, it } from 'vitest'
import { see, startConnectedDesktop, type AppId, type ConnectedDesktop } from './fixtures'

/** Every app opens from Start, shows its window frame and its app root, and closes again. */
describe('apps open from the Start menu', () => {
  let ctx: ConnectedDesktop

  beforeAll(async () => {
    ctx = await startConnectedDesktop({ title: 'Apps desktop' })
  })
  afterAll(async () => {
    await ctx?.app.close()
  })

  const apps: [AppId, string][] = [
    ['explorer', 'explorer-app'],
    ['code', 'code-app'],
    ['terminal', 'terminal-app'],
    ['browser', 'browser-app'],
    ['notepad', 'notepad-app'],
    ['wordpad', 'wordpad-app'],
    ['paint', 'paint-app'],
    ['snipping-tool', 'snipping-tool-app'],
    ['sticky-notes', 'sticky-notes-app'],
    ['event-viewer', 'event-viewer-app'],
    ['agent-manager', 'agent-manager-app'],
    ['control-centre', 'control-centre-app']
  ]
  for (const [app, root] of apps) {
    it(`${app}: opens, shows ${root}, closes`, async () => {
      await ctx.desktop.openApp(app)
      await see.visible(ctx.desktop.window(app).getByTestId(root))
      await see.visible(ctx.desktop.taskbarItem(app))
      await ctx.desktop.closeWindow(app)
      await see.count(ctx.desktop.windows(app), 0)
      await see.count(ctx.desktop.taskbarItem(app), 0)
    })
  }

  it('Notepad takes typed text', async () => {
    const notepad = await ctx.desktop.openApp('notepad')
    await notepad.getByTestId('notepad-text').fill('hello e2e')
    await see.text(notepad.getByTestId('notepad-status'), 'Modified')
  })
})

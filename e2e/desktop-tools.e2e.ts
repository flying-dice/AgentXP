import { afterAll, beforeAll, describe, it } from 'vitest'
import { see, startConnectedDesktop, type ConnectedDesktop } from './fixtures'

describe('desktop: tools follow apps', () => {
  let ctx: ConnectedDesktop

  beforeAll(async () => {
    ctx = await startConnectedDesktop({ title: 'Tools desktop' })
  })
  afterAll(async () => {
    await ctx?.app.close()
  })

  it('starts with no app windows and the "open an app" hint in the top bar', async () => {
    await see.visible(ctx.desktop.topBar)
    await see.visible(ctx.desktopPage.getByTestId('topbar-tool-chips-none'))
    await see.count(ctx.desktop.windows('terminal'), 0)
  })

  it('opening Terminal from Start adds its window, taskbar button and tool chip', async () => {
    await ctx.desktop.openApp('terminal')
    await see.visible(ctx.desktop.window('terminal'))
    await see.visible(ctx.desktop.taskbarItem('terminal'))
    await see.visible(ctx.desktop.toolChip('terminal'))
    await see.gone(ctx.desktopPage.getByTestId('topbar-tool-chips-none'))
  })

  it('opening Code adds the code and file chips; Notepad adds its own (nested Start group)', async () => {
    await ctx.desktop.openApp('code')
    await see.visible(ctx.desktop.toolChip('code'))
    await see.visible(ctx.desktop.toolChip('fs.read'))
    await ctx.desktop.openApp('notepad')
    await see.visible(ctx.desktop.toolChip('notepad'))
    await see.visible(ctx.desktop.toolChip('fs.write'))
  })

  it('closing Notepad removes its chip but keeps the others', async () => {
    await ctx.desktop.closeWindow('notepad')
    await see.count(ctx.desktop.windows('notepad'), 0)
    await see.gone(ctx.desktop.toolChip('notepad'))
    await see.visible(ctx.desktop.toolChip('terminal'))
    await see.visible(ctx.desktop.toolChip('code'))
  })

  it('closing Code and Terminal (topmost first: new windows cascade over each other) empties the chips again', async () => {
    await ctx.desktop.closeWindow('code')
    await ctx.desktop.closeWindow('terminal')
    await see.gone(ctx.desktop.toolChip('terminal'))
    await see.gone(ctx.desktop.toolChip('code'))
    await see.visible(ctx.desktopPage.getByTestId('topbar-tool-chips-none'))
  })

  it('Pause toggles the top bar between Idle and Paused', async () => {
    await see.text(ctx.desktop.pauseButton, 'Pause')
    await ctx.desktop.pauseButton.click()
    await see.text(ctx.desktop.status, 'Paused')
    await see.text(ctx.desktop.pauseButton, 'Resume')
    await ctx.desktop.pauseButton.click()
    await see.text(ctx.desktop.status, 'Idle')
  })
})

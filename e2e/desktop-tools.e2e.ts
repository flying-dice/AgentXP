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

  it('starts with no app windows, the three headline chips off and the "open an app" hint in the top bar', async () => {
    await see.visible(ctx.desktop.topBar)
    await see.visible(ctx.desktopPage.getByTestId('topbar-tool-chips-none'))
    await see.text(ctx.desktop.toolChip('terminal'), 'Run commands (off)')
    await see.text(ctx.desktop.toolChip('fs.read'), 'Read files (off)')
    await see.text(ctx.desktop.toolChip('browser'), 'Browser (off)')
    await see.count(ctx.desktop.windows('terminal'), 0)
  })

  it('opening Terminal from Start adds its window and taskbar button and turns its chip on', async () => {
    await ctx.desktop.openApp('terminal')
    await see.visible(ctx.desktop.window('terminal'))
    await see.visible(ctx.desktop.taskbarItem('terminal'))
    await see.attribute(ctx.desktop.toolChip('terminal'), 'data-state', 'asks')
    await see.text(ctx.desktop.toolChip('terminal'), 'Run commands (asks)')
    await see.gone(ctx.desktopPage.getByTestId('topbar-tool-chips-none'))
  })

  it('opening Code adds the code and file chips; Notepad adds its own (nested Start group)', async () => {
    await ctx.desktop.openApp('code')
    await see.visible(ctx.desktop.toolChip('code'))
    await see.attribute(ctx.desktop.toolChip('fs.read'), 'data-state', 'on')
    await ctx.desktop.openApp('notepad')
    await see.visible(ctx.desktop.toolChip('notepad'))
    await see.visible(ctx.desktop.toolChip('fs.write'))
  })

  it('closing Notepad removes its chip but keeps the others', async () => {
    await ctx.desktop.closeWindow('notepad')
    await see.count(ctx.desktop.windows('notepad'), 0)
    await see.gone(ctx.desktop.toolChip('notepad'))
    await see.attribute(ctx.desktop.toolChip('terminal'), 'data-state', 'asks')
    await see.visible(ctx.desktop.toolChip('code'))
  })

  it('closing Code and Terminal (topmost first: new windows cascade over each other) turns the headline chips off and brings the hint back', async () => {
    await ctx.desktop.closeWindow('code')
    await ctx.desktop.closeWindow('terminal')
    await see.attribute(ctx.desktop.toolChip('terminal'), 'data-state', 'off')
    await see.text(ctx.desktop.toolChip('terminal'), 'Run commands (off)')
    await see.gone(ctx.desktop.toolChip('code'))
    await see.visible(ctx.desktopPage.getByTestId('topbar-tool-chips-none'))
  })

  it('a chip opens Control Centre at Permissions', async () => {
    await ctx.desktop.toolChip('terminal').click()
    await see.visible(ctx.desktop.window('control-centre'))
    await see.text(ctx.desktopPage.getByTestId('control-centre-heading'), 'Permissions')
    await ctx.desktop.closeWindow('control-centre')
  })

  it('Pause all agents toggles the top bar between Idle and Paused, and says what it does', async () => {
    await see.text(ctx.desktop.pauseButton, 'Pause all agents')
    await ctx.desktop.pauseButton.click()
    await see.text(ctx.desktop.status, 'Paused: no agent will act until you resume.')
    await see.text(ctx.desktop.pauseButton, 'Resume agents')
    await ctx.desktop.pauseButton.click()
    await see.text(ctx.desktop.status, 'Idle')
  })

  it('Ask before every action is a check box that shows an amber chip and turns every chip to (asks)', async () => {
    const box = ctx.desktopPage.getByTestId('topbar-take-control')
    await see.gone(ctx.desktopPage.getByTestId('topbar-ask-first-chip'))
    await box.click()
    await see.text(ctx.desktopPage.getByTestId('topbar-ask-first-chip'), 'Asking before every action')
    await box.click()
    await see.gone(ctx.desktopPage.getByTestId('topbar-ask-first-chip'))
  })
})

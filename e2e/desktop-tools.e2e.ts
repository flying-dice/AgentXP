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

  it('starts with no app windows, the three headline chips closed and the "open an app" hint in the top bar', async () => {
    await see.visible(ctx.desktop.topBar)
    await see.visible(ctx.desktopPage.getByTestId('topbar-tool-chips-none'))
    await see.text(ctx.desktop.toolChip('terminal'), 'Run commands: Ask (no Terminal open)')
    await see.text(ctx.desktop.toolChip('fs.read'), 'Read files: Allow (no app open)')
    await see.text(ctx.desktop.toolChip('browser'), 'Browser: Allow (no Browser open)')
    await see.count(ctx.desktop.windows('terminal'), 0)
  })

  it('every chip has a tooltip: the setting and why the agent cannot use it yet', async () => {
    await see.attribute(ctx.desktop.toolChip('terminal'), 'title', 'Run commands is set to Ask. The agent cannot use it yet because no Terminal is open. Click to change it in Control Center.')
    await see.attribute(ctx.desktop.toolChip('browser'), 'title', 'Browser is set to Allow. The agent cannot use it yet because no Browser is open. Click to change it in Control Center.')
  })

  it('opening Terminal from Start adds its window and taskbar button and turns its chip on', async () => {
    await ctx.desktop.openApp('terminal')
    await see.visible(ctx.desktop.window('terminal'))
    await see.visible(ctx.desktop.taskbarItem('terminal'))
    await see.attribute(ctx.desktop.toolChip('terminal'), 'data-state', 'asks')
    await see.text(ctx.desktop.toolChip('terminal'), 'Run commands: Ask')
    await see.attribute(ctx.desktop.toolChip('terminal'), 'title', 'Run commands is set to Ask. Click to change it in Control Center.')
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
    await see.text(ctx.desktop.toolChip('terminal'), 'Run commands: Ask (no Terminal open)')
    await see.gone(ctx.desktop.toolChip('code'))
    await see.visible(ctx.desktopPage.getByTestId('topbar-tool-chips-none'))
  })

  it('a chip opens Control Center at Permissions', async () => {
    await ctx.desktop.toolChip('terminal').click()
    await see.visible(ctx.desktop.window('control-centre'))
    await see.text(ctx.desktopPage.getByTestId('control-centre-heading'), 'Permissions')
    await ctx.desktop.closeWindow('control-centre')
  })

  it('Pause all agents toggles the top bar between Idle and Paused, and says what it does', async () => {
    await see.text(ctx.desktop.pauseButton, 'Pause all agents')
    await ctx.desktop.pauseButton.click()
    await see.text(ctx.desktop.status, 'Paused: no agent will act until you resume.')
    await see.text(ctx.desktop.pauseButton, 'Resume agents and continue')
    await ctx.desktop.pauseButton.click()
    // Nothing was working, so nothing was stopped: the bar says so for a moment (and no balloon).
    await see.text(ctx.desktop.status, 'Resumed. Nothing was stopped.')
    await see.text(ctx.desktop.pauseButton, 'Pause all agents')
  })

  it('Ask before every action puts "You are in control" on the bar, with a way back, and turns the chips to Ask', async () => {
    const box = ctx.desktopPage.getByTestId('topbar-take-control')
    await see.gone(ctx.desktopPage.getByTestId('topbar-give-back'))
    await ctx.desktop.openApp('terminal')
    await box.click()
    await see.text(ctx.desktop.status, 'You are in control. Tools that need an app ask first. Browser is not open.')
    await see.attribute(ctx.desktop.topBar, 'data-state', 'control')
    await see.visible(ctx.desktopPage.getByTestId('topbar-give-back'))
    await see.text(ctx.desktopPage.getByTestId('gadget-activity-control'), 'You are in control. The agent waits until you resume.')
    await see.text(ctx.desktop.toolChip('terminal'), 'Run commands: Ask')
    await ctx.desktopPage.getByTestId('topbar-give-back').click()
    await see.gone(ctx.desktopPage.getByTestId('topbar-give-back'))
    await see.gone(ctx.desktopPage.getByTestId('gadget-activity-control'))
    await see.attribute(ctx.desktopPage.getByTestId('topbar-take-control'), 'aria-checked', 'false')
    await ctx.desktop.closeWindow('terminal')
  })
})

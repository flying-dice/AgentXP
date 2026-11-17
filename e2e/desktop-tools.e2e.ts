import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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
    // UX-200: the chip says Ask first; that its app is closed is in the tooltip and the dashed border.
    await see.text(ctx.desktop.toolChip('terminal'), 'Run commands: Ask first')
    await see.text(ctx.desktop.toolChip('fs.read'), 'Read files: Allow')
    await see.text(ctx.desktop.toolChip('browser'), 'Browser: Allow')
    await see.text(ctx.desktopPage.getByTestId('topbar-tool-chips-none'), 'Open an app (Terminal, Browser, Code) to give the agent a tool.')
    await see.count(ctx.desktop.windows('terminal'), 0)
  })

  it('every chip is a button that says it opens Control Center, then the setting and why the agent cannot use it yet (UX-142)', async () => {
    // UX-200: the chips use the app's own tooltip (it shows after a short delay, so a screenshot can show it).
    await ctx.desktop.toolChip('terminal').hover()
    await see.text(ctx.desktopPage.getByTestId('tooltip'), 'Open Control Center to change this. Run commands is set to Ask. The agent cannot use it yet because no Terminal is open.')
    await ctx.desktop.toolChip('browser').hover()
    await see.text(ctx.desktopPage.getByTestId('tooltip'), 'Open Control Center to change this. Browser is set to Allow. The agent cannot use it yet because no Browser is open.')
    await see.attribute(ctx.desktop.toolChip('terminal'), 'aria-label', 'Run commands: Ask first. Asks you first. Open Control Center to change.')
  })

  it('a chip opens Control Center at Permissions with the row of its tool selected, and only a chip without an app has a dashed border (UX-159)', async () => {
    await see.attribute(ctx.desktop.toolChip('terminal'), 'data-closed', 'true')
    await ctx.desktop.toolChip('terminal').click()
    await see.visible(ctx.desktop.window('control-centre'))
    const row = ctx.desktop.window('control-centre').getByTestId('permissions-row').filter({ hasText: 'Run commands' })
    await see.attribute(row, 'data-selected', 'true')
    await ctx.desktop.closeWindow('control-centre')
  })

  it('opening Terminal from Start adds its window and taskbar button and turns its chip on', async () => {
    await ctx.desktop.openApp('terminal')
    await see.visible(ctx.desktop.window('terminal'))
    await see.visible(ctx.desktop.taskbarItem('terminal'))
    await see.attribute(ctx.desktop.toolChip('terminal'), 'data-state', 'asks')
    await see.text(ctx.desktop.toolChip('terminal'), 'Run commands: Ask')
    await ctx.desktop.toolChip('terminal').hover()
    await see.text(ctx.desktopPage.getByTestId('tooltip'), 'Open Control Center to change this. Run commands is set to Ask.')
    await see.text(ctx.desktopPage.getByTestId('tooltip'), 'Asks you first.')
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
    await see.text(ctx.desktop.toolChip('terminal'), 'Run commands: Ask first')
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
    expect(await ctx.desktop.pauseButton.getAttribute('title')).toMatch(/^Pause all agents on this desktop\. Stop in a chat stops that chat only\./)
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
    await see.text(ctx.desktop.status, 'You are in control. All tools ask first until you click Resume. Browser is not open. This is not saved.')
    await see.attribute(ctx.desktop.topBar, 'data-state', 'control')
    await see.text(ctx.desktopPage.getByTestId('topbar-give-back'), 'Resume')
    await see.text(ctx.desktopPage.getByTestId('infopanel-activity-control'), 'You are in control. All tools ask first until you click Resume. This is not saved.')
    // UX-173: the box says how long it lasts, a chip that differs from the saved setting says (now), and both places link to Permissions.
    await see.text(ctx.desktopPage.getByTestId('topbar-ask-slot'), 'Ask before every action (this session only)')
    await see.text(ctx.desktopPage.getByTestId('topbar-control-note'), 'To keep a tool on Ask, change it in Control Center.')
    await see.text(ctx.desktopPage.getByTestId('infopanel-activity-not-saved'), 'To keep a tool on Ask, change it in Control Center.')
    await see.text(ctx.desktop.toolChip('fs.read'), 'Read files: Ask first (now')
    await see.text(ctx.desktop.toolChip('terminal'), 'Run commands: Ask first')
    await ctx.desktopPage.getByTestId('topbar-control-note-link').click()
    await see.text(ctx.desktopPage.getByTestId('control-centre-heading'), 'Permissions')
    await ctx.desktop.closeWindow('control-centre')
    await ctx.desktopPage.getByTestId('infopanel-activity-open-permissions').click()
    await see.text(ctx.desktopPage.getByTestId('control-centre-heading'), 'Permissions')
    await ctx.desktop.closeWindow('control-centre')
    await ctx.desktopPage.getByTestId('topbar-give-back').click()
    await see.gone(ctx.desktopPage.getByTestId('topbar-give-back'))
    await see.gone(ctx.desktopPage.getByTestId('infopanel-activity-control'))
    await see.attribute(ctx.desktopPage.getByTestId('topbar-take-control'), 'aria-checked', 'false')
    await ctx.desktop.closeWindow('terminal')
  })
})

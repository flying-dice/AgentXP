import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { see, setToolPolicy, shot, startConnectedDesktop, type ConnectedDesktop } from './fixtures'

/**
 * The top bar's "Agent can use" chips show the Control Center permissions, not the open apps: tools no longer follow apps
 * (docs/AGENT_PRESENCE.md). Opening or closing an app does not change a chip; changing a permission does.
 */
describe('desktop: the chips show the permissions', () => {
  let ctx: ConnectedDesktop

  beforeAll(async () => {
    ctx = await startConnectedDesktop({ title: 'Tools desktop' })
  })
  afterAll(async () => {
    await ctx?.app.close()
  })

  it('starts with no app windows and the four headline chips reading the saved permissions', async () => {
    await see.visible(ctx.desktop.topBar)
    await see.count(ctx.desktop.windows('terminal'), 0)
    await see.text(ctx.desktop.toolChip('fs.read'), 'Read files: Allow')
    await see.text(ctx.desktop.toolChip('fs.write'), 'Write files: Ask first')
    await see.text(ctx.desktop.toolChip('terminal'), 'Run commands: Ask first')
    await see.text(ctx.desktop.toolChip('browser'), 'Browser: Allow')
    await see.attribute(ctx.desktop.toolChip('fs.read'), 'data-state', 'on')
    await see.attribute(ctx.desktop.toolChip('terminal'), 'data-state', 'asks') // no Terminal needed: the setting decides
    await see.count(ctx.desktopPage.getByTestId('topbar-tool-chips-none'), 0)
    await shot(ctx.desktopPage, 'desktop-tools-01-chips-policy')
  })

  it('every chip is a button that says it opens Control Center and names the setting, never an app to open (UX-142)', async () => {
    await ctx.desktop.toolChip('terminal').hover()
    await see.text(ctx.desktopPage.getByTestId('tooltip'), 'Open Control Center to change this. Run commands is set to Ask.')
    await see.text(ctx.desktopPage.getByTestId('tooltip'), 'Asks you first.')
    await ctx.desktop.toolChip('browser').hover()
    await see.text(ctx.desktopPage.getByTestId('tooltip'), 'Open Control Center to change this. Browser is set to Allow.')
    expect(await ctx.desktopPage.getByTestId('tooltip').textContent()).not.toContain('cannot use it yet')
    await see.attribute(ctx.desktop.toolChip('terminal'), 'aria-label', 'Run commands: Ask first. Asks you first. Open Control Center to change.')
  })

  it('a chip opens Control Center at Permissions with the row of its tool selected', async () => {
    await ctx.desktop.toolChip('terminal').click()
    await see.visible(ctx.desktop.window('control-centre'))
    await see.text(ctx.desktopPage.getByTestId('control-centre-heading'), 'Permissions')
    const row = ctx.desktop.window('control-centre').getByTestId('permissions-row').filter({ hasText: 'Run commands' })
    await see.attribute(row, 'data-selected', 'true')
    await ctx.desktop.closeWindow('control-centre')
  })

  it('opening and closing apps does not change the chips', async () => {
    await ctx.desktop.openApp('terminal')
    await ctx.desktop.openApp('code')
    await see.text(ctx.desktop.toolChip('terminal'), 'Run commands: Ask first')
    await see.count(ctx.desktop.toolChip('code'), 0)
    await ctx.desktop.closeWindow('code')
    await ctx.desktop.closeWindow('terminal')
    await see.text(ctx.desktop.toolChip('terminal'), 'Run commands: Ask first')
    await see.attribute(ctx.desktop.toolChip('terminal'), 'data-state', 'asks')
  })

  it('a changed permission changes its chip at once, and a denied tool gets a chip of its own', async () => {
    await setToolPolicy(ctx.desktopPage, { terminal: 'allow', browser: 'deny', paint: 'deny' })
    await see.text(ctx.desktop.toolChip('terminal'), 'Run commands: Allow')
    await see.text(ctx.desktop.toolChip('browser'), 'Browser: Deny')
    await see.attribute(ctx.desktop.toolChip('browser'), 'data-state', 'off')
    await see.text(ctx.desktop.toolChip('paint'), 'Agent Paint: Deny')
    await shot(ctx.desktopPage, 'desktop-tools-02-chips-deny')
    await setToolPolicy(ctx.desktopPage, { terminal: 'ask', browser: 'allow', paint: 'allow' })
    await see.count(ctx.desktop.toolChip('paint'), 0)
    await see.text(ctx.desktop.toolChip('browser'), 'Browser: Allow')
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
    await box.click()
    await see.text(ctx.desktop.status, 'You are in control. All tools ask first until you click Resume. This is not saved.')
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
  })
})

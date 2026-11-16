import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { allowTerminal, createWorkspace, plugWorkspaceIn, see, startConnectedDesktop, type ConnectedDesktop, type Workspace } from './fixtures'

/** A full chat turn with the fixture ACP agent: it asks to edit a file, then writes it and runs a command. */
describe('chat turn with the fake agent', () => {
  let ctx: ConnectedDesktop
  let workspace: Workspace

  beforeAll(async () => {
    workspace = await createWorkspace({ 'README.md': '# Chat project\n' })
    ctx = await startConnectedDesktop({ title: 'Chat desktop' })
  })
  afterAll(async () => {
    await ctx?.app.close()
    await workspace?.remove()
  })

  it('opens Code and Terminal (tools follow apps) and lets the shell run without asking', async () => {
    await allowTerminal(ctx.desktopPage)
    await ctx.desktop.openApp('terminal')
    await ctx.desktop.openApp('code')
    await see.visible(ctx.desktop.toolChip('fs.write'))
  })

  it('plugs the project in and starts a chat on it from AutoPlay', async () => {
    await plugWorkspaceIn(ctx.desktopPage, ctx.desktopId, workspace)
    await see.visible(ctx.desktop.autoPlay)
    await ctx.desktopPage.getByTestId('autoplay-start-chat').click()
    await see.visible(ctx.desktop.window('chat'))
    await see.visible(ctx.desktop.chat().composer)
  })

  it('sends a prompt and the agent asks for permission, in the chat and in the Action Center', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('Write the output file')
    await see.text(chat.userMessages, 'Write the output file')
    await see.visible(chat.permissionDialog)
    await see.text(ctx.desktop.actionCenterFlag, '1')
    await ctx.desktop.openActionCenter()
    await see.count(ctx.desktop.approvals, 1)
    await see.text(ctx.desktop.approvals, 'Write output')
    // Two lines per request: what it wants to do, and which chat asked. The flag and the taskbar button say it waits.
    await see.text(ctx.desktopPage.getByTestId('action-center-approval-chat'), "In chat '")
    await see.attribute(ctx.desktop.actionCenterFlag, 'title', '1 request is waiting for you.')
    // The taskbar buttons are icon-only (Aero): the caption is the tooltip.
    await see.attribute(ctx.desktop.taskbarItem('chat'), 'title', /^Waiting: /)
  })

  it('allowing the request completes the tool call (status done)', async () => {
    const chat = ctx.desktop.chat()
    await chat.answerPermission('allow')
    await see.gone(chat.permissionDialog)
    await see.attribute(chat.toolCalls, 'data-status', 'done')
    await see.visible(chat.agentMessage('Working on it'))
    await see.text(ctx.desktop.terminal().output, 'terminal-says-hi')
  })

  it('lists the edited file under Changes in the chat and in Code', async () => {
    const chat = ctx.desktop.chat()
    await chat.showChanges()
    await see.attribute(chat.changes.getByTestId('changes-file'), 'title', /fake-agent-output\.txt/)
    expect(await chat.changes.count()).toBe(1)
    const code = ctx.desktop.code()
    await code.showChanges()
    await see.attribute(code.changes.getByTestId('changes-file'), 'title', /fake-agent-output\.txt/)
  })

  it('a second request can be approved from the Action Center through the UAC dialog', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('Write it again')
    await see.visible(chat.permissionDialog)
    await ctx.desktop.openActionCenter()
    await see.count(ctx.desktop.approvals, 1)
    await ctx.desktopPage.getByTestId('action-center-review').click()
    await see.visible(ctx.desktop.uac)
    // Plain words, the reason on its own line, no sideways scroll, and the first focus on the refusal.
    await see.text(ctx.desktopPage.getByTestId('uac-question'), 'Allow the agent to')
    await see.text(ctx.desktopPage.getByTestId('uac-reason'), 'Reason: ')
    expect(await ctx.desktop.uac.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    await see.eventually(async () => expect(await ctx.desktopPage.getByTestId('uac-option-reject').evaluate((el) => el === document.activeElement)).toBe(true))
    await see.text(ctx.desktopPage.getByTestId('uac-hint'), 'Press Alt+A to allow or Alt+D to deny.')
    await ctx.desktop.uacAllow.click()
    await see.gone(ctx.desktop.uac)
    await see.gone(chat.permissionDialog)
    await see.count(ctx.desktop.approvals, 0)
    // The chat says what was answered, whichever dialog took the answer.
    await see.text(chat.permissionResult, 'You allowed: ')
  })

  it('the permission dialog of the chat answers by key: Alt+D denies, Alt+A allows, and the chat says so', async () => {
    const chat = ctx.desktop.chat()
    await chat.send('Write it a third time')
    await see.visible(chat.permissionDialog)
    await see.text(chat.permissionHint, 'Press Alt+A to allow or Alt+D to deny.')
    // Deny keeps the first focus (the safe answer); Left and Right move to Allow and back.
    await see.eventually(async () => expect(await chat.permissionDialog.getByTestId('permission-option-reject').evaluate((el) => el === document.activeElement)).toBe(true))
    await ctx.desktopPage.keyboard.press('ArrowLeft')
    await see.eventually(async () => expect(await chat.permissionDialog.getByTestId('permission-option-allow').evaluate((el) => el === document.activeElement)).toBe(true))
    await ctx.desktopPage.keyboard.press('Alt+d')
    await see.gone(chat.permissionDialog)
    await see.text(chat.permissionResult, 'You denied: ')
    await chat.send('Write it a fourth time')
    await see.visible(chat.permissionDialog)
    await ctx.desktopPage.keyboard.press('Alt+a')
    await see.gone(chat.permissionDialog)
    await see.text(chat.permissionResult, 'You allowed: ')
  })

  it('the Event Viewer logged the traffic of the turn', async () => {
    const viewer = await ctx.desktop.openApp('event-viewer')
    // The list shows warnings and errors at first; Show all brings the traffic of the turn (UX-121).
    await viewer.getByTestId('event-viewer-show-all').click()
    await see.visible(viewer.getByTestId('event-viewer-row').first())
    await see.visible(viewer.getByTestId('event-viewer-count'))
    // It opens over the chat now that it keeps its full width; the next steps work in the chat.
    await ctx.desktop.closeWindow('event-viewer')
  })

  it('a revert shows "Reverted" in the chat and in Code, and the change stays out of the list of changes (UX-79)', async () => {
    const chat = ctx.desktop.chat()
    await chat.showChanges()
    await chat.changes.first().click()
    await chat.frame.getByTestId('changes-revert').click()
    await ctx.desktopPage.getByTestId('message-box').getByTestId('dialog-button-yes').click()
    await see.visible(chat.frame.getByTestId('changes-reverted'))
    await see.text(chat.frame.getByTestId('changes-reverted-text'), 'Reverted. Restore from the Recycle Bin')
    await see.visible(chat.frame.getByTestId('changes-open-recycle-bin'))
    // The Code window shows the same list: its own Changes pane updates without any action there.
    const code = ctx.desktop.code()
    await code.showChanges()
    await see.visible(code.frame.getByTestId('changes-reverted'))
  })

  it('typing in the Terminal says it is read-only and what to do instead', async () => {
    await ctx.desktop.closeWindow('chat') // it is tiled over part of the other windows
    await ctx.desktop.closeWindow('code')
    const terminal = ctx.desktop.terminal()
    // Closing Code can leave the Terminal active already; a taskbar click would then minimise it.
    if (!(await terminal.output.isVisible())) await ctx.desktop.taskbarItem('terminal').click()
    await terminal.output.click()
    await ctx.desktopPage.keyboard.type('dir')
    await see.text(terminal.readOnlyNotice, 'Read-only: the agent runs the commands here. You can watch but not type.')
    await see.text(terminal.readOnlyNotice, 'Ask the agent in Chat to run a command.')
    await see.visible(terminal.frame.getByTestId('console-cursor-locked'))
    await see.gone(terminal.readOnlyNotice) // it goes after a few seconds
  })
})

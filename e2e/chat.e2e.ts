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
    await see.text(chat.changes, 'fake-agent-output.txt')
    expect(await chat.changes.count()).toBe(1)
    const code = ctx.desktop.code()
    await code.showChanges()
    await see.text(code.changes, 'fake-agent-output.txt')
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
    await ctx.desktop.uacAllow.click()
    await see.gone(ctx.desktop.uac)
    await see.gone(chat.permissionDialog)
    await see.count(ctx.desktop.approvals, 0)
  })

  it('the Event Viewer logged the traffic of the turn', async () => {
    const viewer = await ctx.desktop.openApp('event-viewer')
    await see.visible(viewer.getByTestId('event-viewer-row'))
    await see.visible(viewer.getByTestId('event-viewer-count'))
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
})

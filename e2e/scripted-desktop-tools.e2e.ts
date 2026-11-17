import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { allowTerminal, payloadOf, protocolEvents, see, setToolPolicy, shot, startScriptedDesktop, type ScriptedDesktop } from './fixtures'

/**
 * desktop.json: the agent calls the agentxp MCP tools. They no longer follow the apps that are open
 * (docs/AGENT_PRESENCE.md): terminal_run works with the Terminal closed and opens nothing; a window the agent opens
 * (desktop_open_app) goes behind the operator's window, without the focus, with its taskbar button flashing.
 */
describe('scripted agent: Work opens nothing, agent windows open behind (desktop.json)', () => {
  let ctx: ScriptedDesktop
  let sessionId: number

  beforeAll(async () => {
    ctx = await startScriptedDesktop({ script: 'desktop', title: 'Headless work' })
    await allowTerminal(ctx.desktopPage)
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat().composer)
  })
  afterAll(async () => ctx?.close())

  it('with the Terminal closed terminal_run works, and no window opens or takes the focus', async () => {
    const chat = ctx.desktop.chat()
    sessionId = await chat.sessionId()
    await chat.send('Run it while the terminal is closed')
    await see.visible(chat.agentMessage('Ran with the Terminal closed'))
    await see.text(chat.agentMessage('Ran with the Terminal closed'), 'works without a window')
    await see.attribute(chat.transcript, 'data-running', 'false')
    await see.count(chat.toolCalls, 1)
    await see.text(chat.toolCalls, 'Run a command') // the plain title, not the tool name
    await see.attribute(chat.toolCalls, 'data-status', 'done')
    await see.count(ctx.desktop.windows('terminal'), 0)
    await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')

    await see.eventually(async () => {
      const mcp = await protocolEvents(ctx.desktopPage, { source: 'mcp', sessionId })
      expect(mcp.map((e) => `${e.direction} ${e.name}`)).toEqual(['in terminal_run', 'out terminal_run'])
      expect(mcp[1].level).toBe('info')
      expect(payloadOf<{ isError: boolean }>(mcp[1]).isError).toBe(false)
    })
    await shot(ctx.desktopPage, 'desktop-tools-03-terminal-run-closed')
  })

  it('Show in Terminal on the step opens the Terminal on that run, with the focus (the operator asked)', async () => {
    const chat = ctx.desktop.chat()
    await chat.toolCalls.getByTestId('tool-call-show-terminal').click()
    await see.attribute(ctx.desktop.window('terminal'), 'data-focused', 'true')
    await see.text(ctx.desktop.terminal().output, 'works without a window')
    await shot(ctx.desktopPage, 'desktop-tools-04-show-in-terminal')
  })

  it('with the Terminal open the run is mirrored there live, and the Terminal does not come forward', async () => {
    await ctx.desktop.taskbarItem('chat').click()
    await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')
    const chat = ctx.desktop.chat()
    await chat.composer.fill('Terminal is already open, run the command')
    await chat.composer.press('Enter')
    await see.visible(chat.agentMessage('The terminal printed'))
    await see.text(chat.agentMessage('The terminal printed'), 'nope')
    const terminal = ctx.desktop.terminal()
    await see.text(terminal.output, 'echo nope')
    await see.text(terminal.status, 'Exit code 0')
    await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')
    await see.attribute(ctx.desktop.window('terminal'), 'data-focused', 'false')
  })

  it('desktop_open_app opens the window behind the chat: no focus change, the taskbar button flashes until it is focused', async () => {
    await ctx.desktop.closeWindow('terminal')
    await see.count(ctx.desktop.windows('terminal'), 0)
    await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')
    const chat = ctx.desktop.chat()
    await chat.composer.fill('Open the terminal and run something')
    await chat.composer.press('Enter')
    await see.visible(chat.agentMessage('hello from the scripted agent'))
    await see.visible(ctx.desktop.window('terminal'))
    await see.attribute(ctx.desktop.window('terminal'), 'data-focused', 'false')
    await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')
    await see.attribute(ctx.desktop.taskbarItem('terminal'), 'data-flashing', 'true')
    await shot(ctx.desktopPage, 'desktop-tools-05-open-app-behind')
    // Focusing the window ends the flash; its own tab has the streamed output.
    await ctx.desktop.taskbarItem('terminal').click()
    await see.attribute(ctx.desktop.window('terminal'), 'data-focused', 'true')
    await see.attribute(ctx.desktop.taskbarItem('terminal'), 'data-flashing', 'false')
    await see.text(ctx.desktop.terminal().output, 'hello from the scripted agent')
  })

  it('"Agent may open apps" set to Never refuses the open; the run still works without the window', async () => {
    await ctx.desktop.closeWindow('terminal')
    await setToolPolicy(ctx.desktopPage, {}, 'deny')
    const chat = ctx.desktop.chat()
    await chat.composer.fill('Open the terminal and run something')
    await chat.composer.press('Enter')
    await see.attribute(chat.transcript, 'data-running', 'false')
    await see.eventually(async () => {
      const mcp = (await protocolEvents(ctx.desktopPage, { source: 'mcp', sessionId })).filter((e) => e.name === 'desktop_open_app' && e.direction === 'out')
      expect(payloadOf<{ isError: boolean; content: { text: string }[] }>(mcp.at(-1)!).content[0].text).toContain('blocked by the permission policy')
    })
    await see.count(ctx.desktop.windows('terminal'), 0)
    await setToolPolicy(ctx.desktopPage, {}, 'allow')
  })

  it('the "Working: ..." link of the top bar goes to the chat doing the work', async () => {
    const chat = ctx.desktop.chat()
    const control = await ctx.scripted.control()
    await control.setMode('manual') // the turn waits before each step, so the bar says Working long enough to click
    await chat.composer.fill('Run it while the terminal is closed')
    await chat.composer.press('Enter')
    await control.waitForPause()
    await ctx.desktop.openApp('notepad')
    await see.attribute(ctx.desktop.window('notepad'), 'data-focused', 'true')
    await see.visible(ctx.desktopPage.getByTestId('topbar-working-link'))
    await shot(ctx.desktopPage, 'desktop-tools-06-working-link')
    await ctx.desktopPage.getByTestId('topbar-working-link').click()
    await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')
    await control.setMode('auto')
    await see.attribute(chat.transcript, 'data-running', 'false')
    control.close()
  })
})

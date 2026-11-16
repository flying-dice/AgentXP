import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Locator } from 'playwright'
import { allowTerminal, payloadOf, protocolEvents, see, startScriptedDesktop, type ScriptedDesktop } from './fixtures'

/** Do two windows' frames overlap on screen? */
async function overlap(a: Locator, b: Locator): Promise<boolean> {
  const [x, y] = [await a.boundingBox(), await b.boundingBox()]
  if (!x || !y) throw new Error('window has no box')
  return x.x < y.x + y.width && y.x < x.x + x.width && x.y < y.y + y.height && y.y < x.y + x.height
}

/** desktop.json: the agent calls the agent7 MCP tools, which follow the apps that are open on the desktop. */
describe('scripted agent: tools follow apps (desktop.json)', () => {
  let ctx: ScriptedDesktop
  let sessionId: number

  beforeAll(async () => {
    ctx = await startScriptedDesktop({ script: 'desktop', title: 'Tools follow apps' })
    await allowTerminal(ctx.desktopPage)
    await ctx.desktop.openApp('chat')
    await see.visible(ctx.desktop.chat().composer)
  })
  afterAll(async () => ctx?.close())

  it('with Terminal closed the scripted terminal_run is refused ("is closed")', async () => {
    const chat = ctx.desktop.chat()
    sessionId = await chat.sessionId()
    await chat.send('Run it while the terminal is closed')
    await see.visible(chat.agentMessage('Refused as expected'))
    await see.text(chat.agentMessage('Refused as expected'), 'is closed')
    await see.attribute(chat.transcript, 'data-running', 'false')
    await see.count(chat.toolCalls, 1)
    await see.text(chat.toolCalls, 'Run a command') // the plain title, not the tool name
    await see.attribute(chat.toolCalls, 'data-status', 'failed')

    await see.eventually(async () => {
      const mcp = await protocolEvents(ctx.desktopPage, { source: 'mcp', sessionId })
      expect(mcp.map((e) => `${e.direction} ${e.name}`)).toEqual(['in terminal_run', 'out terminal_run'])
      const result = payloadOf<{ isError: boolean; content: { text: string }[] }>(mcp[1])
      expect(mcp[1].level).toBe('warning')
      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('is closed')
    })
  })

  it('after opening Terminal the same call succeeds and the command output comes back to the agent', async () => {
    await ctx.desktop.openApp('terminal')
    await see.visible(ctx.desktop.toolChip('terminal'))
    // The new window is tiled beside the chat, so the composer stays reachable without refocusing the chat.
    expect(await overlap(ctx.desktop.window('terminal'), ctx.desktop.window('chat'))).toBe(false)
    const chat = ctx.desktop.chat()
    await chat.send('Terminal is already open, run the command')
    await see.visible(chat.agentMessage('The terminal printed'))
    await see.text(chat.agentMessage('The terminal printed'), 'nope')
    await see.attribute(chat.transcript, 'data-running', 'false')
    // terminal_run shows up in the Terminal window: command, output and exit code.
    const terminal = ctx.desktop.terminal()
    await see.text(terminal.output, 'echo nope')
    await see.text(terminal.output, 'nope')
    await see.text(terminal.status, 'Exit code 0')

    await see.eventually(async () => {
      const mcp = (await protocolEvents(ctx.desktopPage, { source: 'mcp', sessionId })).slice(2)
      expect(mcp.map((e) => `${e.direction} ${e.name}`)).toEqual(['in terminal_run', 'out terminal_run'])
      expect(mcp[1].level).toBe('info')
      expect(payloadOf<{ isError: boolean }>(mcp[1]).isError).toBe(false)
    })
  })

  it('desktop_open_app opens the window by itself, then terminal_run works (the fallback rule)', async () => {
    await ctx.desktop.closeWindow('terminal')
    await see.attribute(ctx.desktop.toolChip('terminal'), 'data-state', 'off')
    const chat = ctx.desktop.chat()
    await chat.send('Open the terminal and run something')
    await see.visible(ctx.desktop.window('terminal'))
    await see.visible(chat.agentMessage('hello from the scripted agent'))
    await see.visible(ctx.desktop.toolChip('terminal'))
    await see.attribute(chat.toolCalls.last(), 'data-status', 'done')
    // The agent opened the window behind the chat the user types in: no focus change, a flashing taskbar button, no overlap.
    await see.attribute(ctx.desktop.window('chat'), 'data-focused', 'true')
    await see.attribute(ctx.desktop.window('terminal'), 'data-focused', 'false')
    await see.attribute(ctx.desktop.taskbarItem('terminal'), 'data-flashing', 'true')
    expect(await overlap(ctx.desktop.window('terminal'), ctx.desktop.window('chat'))).toBe(false)
    // Its own tab with the streamed output; the earlier run is still listed.
    await see.text(ctx.desktop.terminal().output, 'hello from the scripted agent')
    await see.visible(ctx.desktop.terminal().picker)
    // Focusing the window ends the flash.
    await ctx.desktop.focusWindow('terminal')
    await see.attribute(ctx.desktop.taskbarItem('terminal'), 'data-flashing', 'false')
  })
})

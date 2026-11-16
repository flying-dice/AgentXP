import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { allowTerminal, payloadOf, protocolEvents, see, startScriptedDesktop, type ScriptedDesktop } from './fixtures'

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
    await see.text(chat.toolCalls, 'terminal_run')
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
    await ctx.desktop.focusWindow('chat')
    const chat = ctx.desktop.chat()
    await chat.send('Terminal is already open, run the command')
    await see.visible(chat.agentMessage('The terminal printed'))
    await see.text(chat.agentMessage('The terminal printed'), 'nope')
    await see.attribute(chat.transcript, 'data-running', 'false')

    await see.eventually(async () => {
      const mcp = (await protocolEvents(ctx.desktopPage, { source: 'mcp', sessionId })).slice(2)
      expect(mcp.map((e) => `${e.direction} ${e.name}`)).toEqual(['in terminal_run', 'out terminal_run'])
      expect(mcp[1].level).toBe('info')
      expect(payloadOf<{ isError: boolean }>(mcp[1]).isError).toBe(false)
    })
  })

  it('desktop_open_app opens the window by itself, then terminal_run works (the fallback rule)', async () => {
    await ctx.desktop.closeWindow('terminal')
    await see.gone(ctx.desktop.toolChip('terminal'))
    await ctx.desktop.focusWindow('chat')
    const chat = ctx.desktop.chat()
    await chat.send('Open the terminal and run something')
    await see.visible(ctx.desktop.window('terminal'))
    await see.visible(chat.agentMessage('hello from the scripted agent'))
    await see.visible(ctx.desktop.toolChip('terminal'))
    await see.attribute(chat.toolCalls.last(), 'data-status', 'done')
  })
})

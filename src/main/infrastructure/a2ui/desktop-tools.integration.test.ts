import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { ToolListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js'
import { AGENT_OPENABLE_APPS, type ToolGroup } from '@shared/desktop'
import { DesktopToolService } from '../../application/tools/DesktopToolService'
import type { DesktopToolHost, ToolContext, ToolResult } from '../../application/tools/types'
import { A2uiBridgeServer, defaultSocketPath } from './bridge-server'
import { SocketBridgeClient } from './bridge-client'
import { createAgent7McpServer } from './mcp-tools'

class FakeHost implements DesktopToolHost {
  groups: ToolGroup[] = ['shell']
  calls: { context: ToolContext; tool: string; args: unknown }[] = []
  enabledGroups(): ToolGroup[] {
    return this.groups
  }
  async call(context: ToolContext, tool: string, args: unknown): Promise<ToolResult> {
    this.calls.push({ context, tool, args })
    return tool === 'browser_screenshot'
      ? { content: [{ type: 'image', data: 'UE5H', mimeType: 'image/png' }] }
      : { content: [{ type: 'text', text: `ran ${tool}` }], ...(tool === 'terminal_run' ? { isError: true } : {}) }
  }
}

const sink = { apply: async () => ({ ok: true as const }) }
const names = async (client: Client): Promise<string[]> => (await client.listTools()).tools.map((t) => t.name)

describe('agent7 MCP server <-> bridge: desktop tools', () => {
  let host: FakeHost
  let bridge: A2uiBridgeServer
  let client: Client
  let notified: number

  async function connect(desktopId: string): Promise<void> {
    const server = createAgent7McpServer(new SocketBridgeClient(bridge.socketPath, '5', desktopId))
    const [a, b] = InMemoryTransport.createLinkedPair()
    client = new Client({ name: 't', version: '0' })
    client.setNotificationHandler(ToolListChangedNotificationSchema, () => void notified++)
    await Promise.all([server.connect(a), client.connect(b)])
  }

  beforeEach(async () => {
    host = new FakeHost()
    notified = 0
    bridge = new A2uiBridgeServer(sink, defaultSocketPath(process.pid + 1000 + Math.floor(Math.random() * 1e6)), undefined, host)
    await bridge.start()
  })

  afterEach(async () => {
    await client.close()
    await bridge.stop()
  })

  const waitFor = async (what: string, ok: () => boolean): Promise<void> => {
    for (let i = 0; i < 200 && !ok(); i++) await new Promise((r) => setTimeout(r, 10))
    expect(ok(), what).toBe(true)
  }

  it('declares listChanged and lists the tools of the groups the bridge reports, on every tools/list', async () => {
    await connect('3')
    expect(client.getServerCapabilities()?.tools?.listChanged).toBe(true)
    expect(client.getServerVersion()?.name).toBe('agent7')
    expect(await names(client)).toEqual(['a2ui_catalog', 'a2ui_render', 'a2ui_delete_surface', 'desktop_state', 'drives_list', 'desktop_open_app', 'review_open', 'desktop_close_app', 'desktop_focus_app'])
    host.groups = ['shell', 'terminal']
    expect(await names(client)).toContain('terminal_run')
    expect(await names(client)).not.toContain('browser_navigate')
    const open = (await client.listTools()).tools.find((t) => t.name === 'desktop_open_app')!
    expect(open.inputSchema).toMatchObject({ type: 'object', properties: { app: { enum: [...AGENT_OPENABLE_APPS] } }, required: ['app'] })
  })

  it('lists the tools of the new app groups only while those apps are open', async () => {
    await connect('3')
    const base = await names(client)
    for (const tool of ['paint_draw', 'wordpad_read', 'notes_add', 'events_query', 'screen_capture', 'recycle_restore']) expect(base).not.toContain(tool)
    host.groups = ['shell', 'paint', 'wordpad', 'notes', 'events', 'snip', 'recycle']
    const open = await names(client)
    for (const tool of ['paint_draw', 'paint_read', 'paint_clear', 'paint_resize', 'wordpad_open', 'wordpad_read', 'wordpad_write', 'notes_list', 'notes_add', 'notes_update', 'notes_remove', 'events_query', 'screen_capture', 'recycle_list', 'recycle_restore']) {
      expect(open).toContain(tool)
    }
    host.groups = ['shell', 'notes']
    const some = await names(client)
    expect(some).toContain('notes_add')
    expect(some).not.toContain('paint_draw')
    const draw = (await client.listTools()).tools
    host.groups = ['shell', 'paint']
    const schema = (await client.listTools()).tools.find((t) => t.name === 'paint_draw')!.inputSchema
    expect(schema).toMatchObject({ type: 'object', required: ['ops'] })
    expect(draw.length).toBeGreaterThan(0)
  })

  it('sends notifications/tools/list_changed when the bridge publishes new groups for its desktop', async () => {
    await connect('3')
    await names(client) // the baseline the child works from
    await waitFor('subscription', () => bridge.subscriberCount(3) === 1)

    bridge.publishTools(3, ['shell']) // unchanged: nothing to tell
    bridge.publishTools(4, ['shell', 'browser']) // another desktop
    host.groups = ['shell', 'browser']
    bridge.publishTools(3, ['shell', 'browser'])
    await waitFor('list_changed', () => notified === 1)
    expect(await names(client)).toContain('browser_navigate')

    bridge.publishTools(3, ['shell', 'browser']) // same again
    host.groups = ['shell']
    bridge.publishTools(3, ['shell'])
    await waitFor('second list_changed', () => notified === 2)
    expect(await names(client)).not.toContain('browser_navigate')
  })

  it('runs desktop tools in the app with the chat and desktop of this child, passing results and images through', async () => {
    host.groups = ['shell', 'terminal', 'browser']
    await connect('3')
    const ok = await client.callTool({ name: 'desktop_state', arguments: {} })
    expect(ok).toMatchObject({ content: [{ type: 'text', text: 'ran desktop_state' }] })
    expect(host.calls[0]).toEqual({ context: { sessionId: 5, desktopId: 3 }, tool: 'desktop_state', args: {} })
    const failed = await client.callTool({ name: 'terminal_run', arguments: { command: 'ls' } })
    expect(failed.isError).toBe(true)
    expect(host.calls[1]?.args).toEqual({ command: 'ls' })
    const shot = await client.callTool({ name: 'browser_screenshot', arguments: {} })
    expect(shot.content).toEqual([{ type: 'image', data: 'UE5H', mimeType: 'image/png' }])
  })

  it('a chat without a desktop gets only the A2UI tools and a clear error for desktop tools', async () => {
    await connect('')
    expect(await names(client)).toEqual(['a2ui_catalog', 'a2ui_render', 'a2ui_delete_surface'])
    const res = await client.callTool({ name: 'desktop_state', arguments: {} })
    expect(res.isError).toBe(true)
    expect(JSON.stringify(res.content)).toContain('not on a desktop')
  })

  it('a call to a tool whose app closed meanwhile comes back as an MCP error result with the open-the-app hint', async () => {
    const service = new DesktopToolService({
      states: { state: () => ({ tools: ['shell'], paused: false }) as never, stateOfSession: () => null },
      gate: { authorize: async () => { throw new Error('The Terminal app is closed on this desktop. Call desktop_open_app with app "terminal" to open it.') } },
      handlers: new Proxy({}, { get: () => async () => ({ content: [{ type: 'text', text: 'should not run' }] }) }) as never
    })
    await bridge.stop()
    bridge = new A2uiBridgeServer(sink, defaultSocketPath(process.pid + 2000 + Math.floor(Math.random() * 1e6)), undefined, service)
    await bridge.start()
    await connect('3')
    const res = await client.callTool({ name: 'terminal_run', arguments: { command: 'ls' } })
    expect(res.isError).toBe(true)
    expect(JSON.stringify(res.content)).toContain('Call desktop_open_app with app \\"terminal\\"')
  })
})

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { A2UI_CATALOG_ID, type A2uiServerMessage } from '@shared/a2ui'
import type { A2uiMessageSink, A2uiSinkResult } from '../../domain/a2ui/ports'
import { A2uiBridgeServer, buildA2uiMcpServerConfig, defaultSocketPath } from './bridge-server'
import { SocketBridgeClient } from './bridge-client'
import { createAgentXPMcpServer } from './mcp-tools'

class FakeSink implements A2uiMessageSink {
  calls: { sessionKey: string; messages: A2uiServerMessage[] }[] = []
  targets: Array<string | undefined> = []
  result: A2uiSinkResult = { ok: true }
  async apply(sessionKey: string, messages: A2uiServerMessage[], options?: { target?: string }): Promise<A2uiSinkResult> {
    this.calls.push({ sessionKey, messages })
    this.targets.push(options?.target)
    return this.result
  }
}

const textOf = (r: unknown): string => ((r as { content: { text: string }[] }).content[0]?.text ?? '')

describe('A2UI MCP <-> bridge', () => {
  let sink: FakeSink
  let bridge: A2uiBridgeServer
  let client: Client

  beforeEach(async () => {
    sink = new FakeSink()
    bridge = new A2uiBridgeServer(sink, defaultSocketPath(process.pid + Math.floor(Math.random() * 1e6)))
    await bridge.start()
    const server = createAgentXPMcpServer(new SocketBridgeClient(bridge.socketPath, 'sess-1'))
    const [a, b] = InMemoryTransport.createLinkedPair()
    client = new Client({ name: 't', version: '0' })
    await Promise.all([server.connect(a), client.connect(b)])
  })

  afterEach(async () => {
    await client.close()
    await bridge.stop()
  })

  it('lists tools and serves the catalog', async () => {
    const tools = (await client.listTools()).tools.map((t) => t.name).sort()
    expect(tools).toEqual(['a2ui_catalog', 'a2ui_delete_surface', 'a2ui_render'])
    const catalog = textOf(await client.callTool({ name: 'a2ui_catalog', arguments: {} }))
    expect(catalog).toContain('Draw interactive Windows XP WinForms style UI')
    expect(catalog).toContain('"DataGridView"')
    expect(catalog).toContain('"formatString"')
    expect(catalog).toContain('Example messages')
    // The catalog document web_core generates is embedded as JSON between the instructions and the example.
    const document = JSON.parse(catalog.split('\n\n')[2]!) as { catalogId: string; components: Record<string, unknown> }
    expect(document.catalogId).toBe(A2UI_CATALOG_ID)
    expect(Object.keys(document.components)).toHaveLength(30)
  })

  it('forwards valid messages to the sink', async () => {
    const messages = [
      { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: A2UI_CATALOG_ID } },
      { version: 'v0.9', updateComponents: { surfaceId: 's', components: [{ id: 'root', component: 'Label', text: 'hi' }] } }
    ]
    const res = await client.callTool({ name: 'a2ui_render', arguments: { messages } })
    expect(textOf(res)).toBe('ok')
    expect(sink.calls).toEqual([{ sessionKey: 'sess-1', messages }])
  })

  it('passes the target (chat is an alias of inline) and returns the sink notes to the agent', async () => {
    const messages = [{ version: 'v0.9', createSurface: { surfaceId: 's', catalogId: A2UI_CATALOG_ID } }]
    sink.result = { ok: true, notes: ['Shown in its own window "S".'] }
    expect(textOf(await client.callTool({ name: 'a2ui_render', arguments: { messages, target: 'window' } }))).toBe('ok\nShown in its own window "S".')
    await client.callTool({ name: 'a2ui_render', arguments: { messages, target: 'chat' } })
    await client.callTool({ name: 'a2ui_render', arguments: { messages } })
    expect(sink.targets).toEqual(['window', 'inline', undefined])
    const bad = await client.callTool({ name: 'a2ui_render', arguments: { messages, target: 'moon' } })
    expect(bad.isError).toBe(true)
    expect(sink.targets).toHaveLength(3)
  })

  it('describes the three targets in the tool', async () => {
    const render = (await client.listTools()).tools.find((t) => t.name === 'a2ui_render')!
    expect(render.description).toMatch(/sidebar/)
    expect(JSON.stringify(render.inputSchema)).toMatch(/inline.*sidebar.*window/s)
  })

  it('adds the default protocol version', async () => {
    await client.callTool({ name: 'a2ui_render', arguments: { messages: [{ createSurface: { surfaceId: 's', catalogId: A2UI_CATALOG_ID } }] } })
    expect(sink.calls[0]!.messages).toEqual([{ version: 'v0.9', createSurface: { surfaceId: 's', catalogId: A2UI_CATALOG_ID } }])
  })

  it('returns validation errors and does not call the sink', async () => {
    const res = await client.callTool({
      name: 'a2ui_render',
      arguments: { messages: [{ updateComponents: { surfaceId: 's', components: [{ id: 'x', component: 'Button', text: 'a' }, { id: 'y', component: 'Nope' }] } }] }
    })
    expect((res as { isError?: boolean }).isError).toBe(true)
    const text = textOf(res)
    expect(text).toContain('Rejected. Fix and resend')
    expect(text).toContain('messages[0].components[0] (x)')
    expect(text).toContain("Unknown component type 'Nope'")
    expect(sink.calls).toHaveLength(0)
  })

  it('rejects unknown catalogs, bad bindings and bad messages before the app is contacted', async () => {
    const call = async (messages: unknown[]) => textOf(await client.callTool({ name: 'a2ui_render', arguments: { messages } }))
    expect(await call([{ createSurface: { surfaceId: 's', catalogId: 'https://example.com/other' } }])).toContain('Catalog not found')
    expect(await call([{ updateComponents: { surfaceId: 's', components: [{ id: 'a', component: 'TextBox', value: { path: 5 } }] } }])).toContain('components[0] (a)')
    expect(await call([{ nonsense: true }])).toContain('messages[0]')
    expect(sink.calls).toHaveLength(0)
  })

  it('also validates on the app side of the bridge', async () => {
    // A client that skips the MCP-side validation (e.g. an older MCP server build) is still checked by the bridge.
    const lenient = { validate: (m: unknown) => ({ ok: true as const, messages: m as A2uiServerMessage[] }) }
    const server = createAgentXPMcpServer(new SocketBridgeClient(bridge.socketPath, 'sess-1'), lenient as never)
    const [a, b] = InMemoryTransport.createLinkedPair()
    const other = new Client({ name: 't2', version: '0' })
    await Promise.all([server.connect(a), other.connect(b)])
    const res = await other.callTool({ name: 'a2ui_render', arguments: { messages: [{ updateComponents: { surfaceId: 's', components: [{ id: 'y', component: 'Nope' }] } }] } })
    await other.close()
    expect((res as { isError?: boolean }).isError).toBe(true)
    expect(textOf(res)).toContain("Unknown component type 'Nope'")
    expect(sink.calls).toHaveLength(0)
  })

  it('surfaces sink errors and handles delete', async () => {
    sink.result = { ok: false, errors: ['no such session'] }
    const res = await client.callTool({ name: 'a2ui_delete_surface', arguments: { surfaceId: 's' } })
    expect(textOf(res)).toContain('no such session')
    expect(sink.calls[0].messages).toEqual([{ version: 'v0.9', deleteSurface: { surfaceId: 's' } }])
  })
})

describe('buildA2uiMcpServerConfig', () => {
  it('builds the ACP stdio shape', () => {
    expect(buildA2uiMcpServerConfig({ electronPath: '/e', scriptPath: '/s.js', socketPath: '/sock', sessionKey: 'k', desktopId: '3' })).toEqual({
      name: 'agentxp',
      command: '/e',
      args: ['/s.js'],
      env: [
        { name: 'ELECTRON_RUN_AS_NODE', value: '1' },
        { name: 'AGENTXP_A2UI_SOCKET', value: '/sock' },
        { name: 'AGENTXP_SESSION_KEY', value: 'k' },
        { name: 'AGENTXP_DESKTOP_ID', value: '3' }
      ]
    })
  })
})

describe('A2UI tool calls in the protocol log', () => {
  it('records a2ui_* calls and their results through the bridge, also rejected ones', async () => {
    const calls: string[] = []
    const sink = new FakeSink()
    const bridge = new A2uiBridgeServer(sink, defaultSocketPath(process.pid + Math.floor(Math.random() * 1e6)), undefined, undefined, {
      called: (sessionId, tool, args) => calls.push(`in ${sessionId} ${tool} ${JSON.stringify(args)}`),
      finished: (sessionId, tool, result) => calls.push(`out ${sessionId} ${tool} ${result.isError ? 'error' : 'ok'} ${textOf(result)}`)
    })
    await bridge.start()
    const server = createAgentXPMcpServer(new SocketBridgeClient(bridge.socketPath, '5'))
    const [a, b] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 't', version: '0' })
    await Promise.all([server.connect(a), client.connect(b)])
    try {
      await client.callTool({ name: 'a2ui_render', arguments: { messages: [{ createSurface: { surfaceId: 's', catalogId: A2UI_CATALOG_ID } }] } })
      await client.callTool({ name: 'a2ui_render', arguments: { messages: [{ nonsense: true }] } })
      await client.callTool({ name: 'a2ui_delete_surface', arguments: { surfaceId: 's' } })
    } finally {
      await client.close()
      await bridge.stop()
    }
    expect(calls).toHaveLength(6)
    expect(calls[0]).toMatch(/^in 5 a2ui_render .*createSurface/)
    expect(calls[1]).toBe('out 5 a2ui_render ok ok')
    expect(calls[2]).toMatch(/^in 5 a2ui_render .*nonsense/)
    expect(calls[3]).toMatch(/^out 5 a2ui_render error Rejected/)
    expect(calls[4]).toBe('in 5 a2ui_delete_surface {"surfaceId":"s"}')
    expect(calls[5]).toBe('out 5 a2ui_delete_surface ok ok')
  })
})

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { A2uiServerMessage } from '@shared/a2ui'
import type { A2uiMessageSink, A2uiSinkResult } from '../../domain/a2ui/ports'
import { A2uiBridgeServer, buildA2uiMcpServerConfig, defaultSocketPath } from './bridge-server'
import { SocketForwarder } from './bridge-client'
import { createA2uiMcpServer } from './mcp-tools'

class FakeSink implements A2uiMessageSink {
  calls: { sessionKey: string; messages: A2uiServerMessage[] }[] = []
  result: A2uiSinkResult = { ok: true }
  async apply(sessionKey: string, messages: A2uiServerMessage[]): Promise<A2uiSinkResult> {
    this.calls.push({ sessionKey, messages })
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
    const server = createA2uiMcpServer(new SocketForwarder(bridge.socketPath, 'sess-1'))
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
    expect(textOf(await client.callTool({ name: 'a2ui_catalog', arguments: {} }))).toContain('DataGridView')
  })

  it('forwards valid messages to the sink', async () => {
    const messages = [
      { createSurface: { surfaceId: 's', catalogId: 'c' } },
      { updateComponents: { surfaceId: 's', components: [{ id: 'root', component: 'Label', text: 'hi' }] } }
    ]
    const res = await client.callTool({ name: 'a2ui_render', arguments: { messages } })
    expect(textOf(res)).toBe('ok')
    expect(sink.calls).toEqual([{ sessionKey: 'sess-1', messages }])
  })

  it('returns validation errors and does not call the sink', async () => {
    const res = await client.callTool({ name: 'a2ui_render', arguments: { messages: [{ updateComponents: { surfaceId: 's', components: [{ id: 'x', component: 'Button', text: 'a' }] } }] } })
    expect((res as { isError?: boolean }).isError).toBe(true)
    expect(textOf(res)).toContain('action')
    expect(sink.calls).toHaveLength(0)
  })

  it('surfaces sink errors and handles delete', async () => {
    sink.result = { ok: false, errors: ['no such session'] }
    const res = await client.callTool({ name: 'a2ui_delete_surface', arguments: { surfaceId: 's' } })
    expect(textOf(res)).toContain('no such session')
    expect(sink.calls[0].messages).toEqual([{ deleteSurface: { surfaceId: 's' } }])
  })
})

describe('buildA2uiMcpServerConfig', () => {
  it('builds the ACP stdio shape', () => {
    expect(buildA2uiMcpServerConfig({ electronPath: '/e', scriptPath: '/s.js', socketPath: '/sock', sessionKey: 'k' })).toEqual({
      name: 'agentxp-a2ui',
      command: '/e',
      args: ['/s.js'],
      env: [
        { name: 'ELECTRON_RUN_AS_NODE', value: '1' },
        { name: 'AGENTXP_A2UI_SOCKET', value: '/sock' },
        { name: 'AGENTXP_SESSION_KEY', value: 'k' }
      ]
    })
  })
})

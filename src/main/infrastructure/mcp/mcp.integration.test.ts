import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterEach, describe, expect, it } from 'vitest'
import type { McpServerConfig } from '../../domain/agent/McpServerConfig'
import { SdkMcpProber } from './SdkMcpProber'
import { createFilteringProxy } from './proxy-server'

const echoServer = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../agents/scripted-agent/__fixtures__/echo-mcp.ts')
const echo: McpServerConfig = { kind: 'stdio', name: 'echo', command: process.execPath, args: ['--experimental-strip-types', '--no-warnings', echoServer], env: { ELECTRON_RUN_AS_NODE: '1' } }

describe('SdkMcpProber', () => {
  it('lists the tools of a real stdio server', async () => {
    const tools = await new SdkMcpProber().listTools(echo)
    expect(tools.map((t) => t.name)).toEqual(['echo', 'refuse'])
  })

  it('rejects with a reason for a program that does not exist', async () => {
    await expect(new SdkMcpProber(5000).listTools({ kind: 'stdio', name: 'x', command: join('/no', 'such', 'program'), args: [], env: {} })).rejects.toThrow()
  })

  it('gives up on a server that never answers', async () => {
    const silent: McpServerConfig = { kind: 'stdio', name: 's', command: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)'], env: { ELECTRON_RUN_AS_NODE: '1' } }
    await expect(new SdkMcpProber(300).listTools(silent)).rejects.toThrow(/no answer/)
  })
})

describe('filtering proxy', () => {
  const closers: (() => Promise<void>)[] = []
  afterEach(async () => {
    await Promise.all(closers.splice(0).map((close) => close()))
  })

  async function connect(hidden: string[]): Promise<Client> {
    const { server, client: upstream } = await createFilteringProxy(echo, hidden)
    const [a, b] = InMemoryTransport.createLinkedPair()
    await server.connect(a)
    const client = new Client({ name: 'test', version: '1' })
    await client.connect(b)
    closers.push(async () => {
      await client.close()
      await upstream.close()
    })
    return client
  }

  it('leaves out the tools that are switched off and passes the others through', async () => {
    const client = await connect(['refuse'])
    expect((await client.listTools()).tools.map((t) => t.name)).toEqual(['echo'])
    const result = await client.callTool({ name: 'echo', arguments: { text: 'hi' } })
    expect(result.content).toEqual([{ type: 'text', text: 'echo: hi' }])
  })

  it('refuses a call to a switched-off tool even when the agent knows its name', async () => {
    const client = await connect(['refuse'])
    const result = await client.callTool({ name: 'refuse', arguments: {} })
    expect(result.isError).toBe(true)
    expect(JSON.stringify(result.content)).toContain('switched off')
  })
})

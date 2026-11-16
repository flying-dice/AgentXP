/** Connects to the MCP servers ACP hands over in `session/new` and calls their tools (the `mcpCall` step). */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { McpServer } from '@agentclientprotocol/sdk'

export interface McpResult {
  text: string
  isError: boolean
}

type NameValue = Array<{ name: string; value: string }>

function transportFor(server: McpServer): Transport {
  if ('type' in server && (server.type === 'http' || server.type === 'sse')) {
    const headers = Object.fromEntries((server.headers as NameValue).map((h) => [h.name, h.value]))
    const url = new URL(server.url)
    return server.type === 'http'
      ? new StreamableHTTPClientTransport(url, { requestInit: { headers } })
      : new SSEClientTransport(url, { requestInit: { headers } })
  }
  const stdio = server as Extract<McpServer, { command: string }>
  const env = { ...getDefaultEnvironment(), ...Object.fromEntries((stdio.env as NameValue).map((e) => [e.name, e.value])) }
  return new StdioClientTransport({ command: stdio.command, args: stdio.args, env, stderr: 'ignore' })
}

const textOf = (content: unknown): string =>
  (Array.isArray(content) ? content : [])
    .map((block: { type?: string; text?: string }) => (block.type === 'text' ? (block.text ?? '') : `[${block.type ?? 'unknown'} content]`))
    .join('\n')

/** One hub per ACP session. Servers connect lazily on their first call and are closed with the hub. */
export class McpHub {
  private readonly servers = new Map<string, McpServer>()
  private readonly clients = new Map<string, Promise<Client>>()

  constructor(servers: McpServer[]) {
    for (const server of servers) this.servers.set(server.name, server)
  }

  names(): string[] {
    return [...this.servers.keys()]
  }

  /** Never throws for tool failures: a refused or failing call is a result with `isError`. */
  async call(server: string, tool: string, args: Record<string, unknown>, signal: AbortSignal): Promise<McpResult> {
    let client: Client
    try {
      client = await this.client(server)
    } catch (error) {
      return { text: `Cannot connect to MCP server "${server}": ${message(error)}`, isError: true }
    }
    try {
      const result = await client.callTool({ name: tool, arguments: args }, undefined, { signal })
      return { text: textOf(result.content), isError: result.isError === true }
    } catch (error) {
      if (signal.aborted) throw error
      return { text: message(error), isError: true }
    }
  }

  async close(): Promise<void> {
    const clients = [...this.clients.values()]
    this.clients.clear()
    await Promise.all(clients.map((c) => c.then((client) => client.close()).catch(() => undefined)))
  }

  private client(name: string): Promise<Client> {
    const existing = this.clients.get(name)
    if (existing) return existing
    const config = this.servers.get(name)
    if (!config) return Promise.reject(new Error(`no MCP server named "${name}" in session/new (have: ${this.names().join(', ') || 'none'})`))
    const connecting = (async () => {
      const client = new Client({ name: 'scripted-agent', version: '1.0.0' })
      await client.connect(transportFor(config))
      return client
    })()
    this.clients.set(name, connecting)
    connecting.catch(() => this.clients.delete(name))
    return connecting
  }
}

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error))

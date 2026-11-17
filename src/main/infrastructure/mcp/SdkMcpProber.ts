import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { McpServerConfig } from '../../domain/agent/McpServerConfig'
import type { McpProber } from '../../application/teams/ports'

/** The transport of a server config (the program is started, or the address is called). */
export function transportFor(config: McpServerConfig): Transport {
  if (config.kind === 'stdio') {
    return new StdioClientTransport({ command: config.command, args: config.args, env: { ...getDefaultEnvironment(), ...config.env }, stderr: 'ignore' })
  }
  return new StreamableHTTPClientTransport(new URL(config.url), { requestInit: { headers: config.headers } })
}

/** Connects with the official MCP client and lists the tools; gives up after `timeoutMs`. */
export class SdkMcpProber implements McpProber {
  constructor(private readonly timeoutMs = 20_000) {}

  async listTools(config: McpServerConfig): Promise<{ name: string; description: string }[]> {
    const client = new Client({ name: 'agent7', version: '1.0.0' })
    const work = (async () => {
      await client.connect(transportFor(config))
      const tools: { name: string; description: string }[] = []
      let cursor: string | undefined
      do {
        const page = await client.listTools(cursor ? { cursor } : undefined)
        tools.push(...page.tools.map((t) => ({ name: t.name, description: t.description ?? '' })))
        cursor = page.nextCursor
      } while (cursor)
      return tools
    })()
    let timer: NodeJS.Timeout | undefined
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`no answer within ${Math.round(this.timeoutMs / 1000)} seconds`)), this.timeoutMs)
    })
    try {
      return await Promise.race([work, timeout])
    } finally {
      clearTimeout(timer)
      work.catch(() => {}) // a late failure after the timeout is not reported
      await client.close().catch(() => {})
    }
  }
}

// Entry of the filtering proxy run by the agent as a child process (built as out/main/mcp-proxy.js). Must not import electron.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { McpServerConfig } from '../../domain/agent/McpServerConfig'
import { ENV_PROXY_HIDE, ENV_PROXY_TARGET } from '../../application/teams/AgentCapabilities'
import { createFilteringProxy } from './proxy-server'

async function main(): Promise<void> {
  const target = JSON.parse(process.env[ENV_PROXY_TARGET] ?? 'null') as McpServerConfig | null
  const hidden = JSON.parse(process.env[ENV_PROXY_HIDE] ?? '[]') as string[]
  if (!target) {
    process.stderr.write(`${ENV_PROXY_TARGET} must be set\n`)
    process.exit(1)
  }
  const { server, client } = await createFilteringProxy(target, hidden)
  client.onclose = () => process.exit(0)
  await server.connect(new StdioServerTransport())
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`)
  process.exit(1)
})

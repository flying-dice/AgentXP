import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import type { McpServerConfig } from '../../domain/agent/McpServerConfig'
import { transportFor } from './SdkMcpProber'

/**
 * An MCP server that stands in front of another one and leaves out the tools the user switched off (Control Center >
 * Skills and MCP Servers). Agents get it instead of the real server when at least one of its tools is off.
 */
export async function createFilteringProxy(target: McpServerConfig, hidden: readonly string[]): Promise<{ server: Server; client: Client }> {
  const client = new Client({ name: 'agent7-proxy', version: '1.0.0' })
  await client.connect(transportFor(target))
  const off = new Set(hidden)
  const server = new Server({ name: target.name, version: '1.0.0' }, { capabilities: { tools: {} } })
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const result = await client.listTools(request.params)
    return { ...result, tools: result.tools.filter((t) => !off.has(t.name)) }
  })
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (off.has(request.params.name)) return { isError: true, content: [{ type: 'text', text: `The tool ${request.params.name} is switched off.` }] }
    return client.callTool(request.params)
  })
  return { server, client }
}

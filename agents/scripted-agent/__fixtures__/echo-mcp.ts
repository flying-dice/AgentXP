/**
 * A tiny stdio MCP server standing in for Agent7's `agent7` server in tests.
 * Tools: `echo` (returns its text), `refuse` (an error result saying the Terminal app is closed).
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

const server = new Server({ name: 'echo', version: '1.0.0' }, { capabilities: { tools: {} } })
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: 'echo', description: 'Echo', inputSchema: { type: 'object', properties: { text: { type: 'string' } } } },
    { name: 'refuse', description: 'Always refuses', inputSchema: { type: 'object', properties: {} } }
  ]
}))
server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
  if (params.name === 'echo') return { content: [{ type: 'text', text: `echo: ${String(params.arguments?.text ?? '')}` }] }
  if (params.name === 'refuse') return { isError: true, content: [{ type: 'text', text: 'The Terminal app is closed on this desktop.' }] }
  return { isError: true, content: [{ type: 'text', text: `unknown tool ${params.name}` }] }
})
await server.connect(new StdioServerTransport())

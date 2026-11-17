// A small MCP server over stdio with three tools, for the screenshots of Task Scheduler (the tools list of "Choose skills and tools").
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

const tools = [
  { name: 'read_issue', description: 'Read an issue.' },
  { name: 'comment_on_pull_request', description: 'Write a comment on a pull request.' },
  { name: 'delete_branch', description: 'Delete a branch.' }
].map((t) => ({ ...t, inputSchema: { type: 'object', properties: {} } }))

const server = new Server({ name: 'GitHub', version: '1.0.0' }, { capabilities: { tools: {} } })
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))
server.setRequestHandler(CallToolRequestSchema, async (request) => ({ content: [{ type: 'text', text: `${request.params.name}: done` }] }))
await server.connect(new StdioServerTransport())

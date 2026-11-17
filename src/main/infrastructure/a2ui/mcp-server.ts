// Entry of the stdio MCP server run by the agent as a child process (built as out/main/a2ui-mcp.js).
// Must not import electron.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SocketBridgeClient } from './bridge-client'
import { createAgentXPMcpServer } from './mcp-tools'
import { ENV_DESKTOP_ID, ENV_SESSION_KEY, ENV_SOCKET } from './protocol'

async function main(): Promise<void> {
  const socketPath = process.env[ENV_SOCKET]
  const sessionKey = process.env[ENV_SESSION_KEY]
  if (!socketPath || !sessionKey) {
    process.stderr.write(`${ENV_SOCKET} and ${ENV_SESSION_KEY} must be set\n`)
    process.exit(1)
  }
  const client = new SocketBridgeClient(socketPath, sessionKey, process.env[ENV_DESKTOP_ID] ?? '')
  await createAgentXPMcpServer(client).connect(new StdioServerTransport())
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`)
  process.exit(1)
})

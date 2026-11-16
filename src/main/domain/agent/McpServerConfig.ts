/** An MCP server handed to an agent when a session is opened. */
export type McpServerConfig =
  | { kind: 'stdio'; name: string; command: string; args: string[]; env: Record<string, string> }
  | { kind: 'http'; name: string; url: string; headers: Record<string, string> }

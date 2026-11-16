import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { A2uiForwarder } from './bridge-client'
import { buildCatalogReply } from './mcp-instructions'
import { MCP_SERVER_NAME } from './protocol'

const text = (t: string, isError = false): CallToolResult => ({ content: [{ type: 'text', text: t }], ...(isError ? { isError } : {}) })

/** Builds the MCP server (transport-agnostic) exposing the A2UI tools. */
export function createA2uiMcpServer(forwarder: A2uiForwarder): McpServer {
  const server = new McpServer({ name: MCP_SERVER_NAME, version: '0.1.0' })

  server.registerTool(
    'a2ui_catalog',
    { description: 'Describe the AgentXP WinForms component catalog and how to draw UI surfaces. Call this before a2ui_render.' },
    () => text(buildCatalogReply())
  )

  const send = async (messages: unknown[]): Promise<CallToolResult> => {
    const res = await forwarder.forward(messages)
    return res.ok ? text('ok') : text(`Rejected. Fix and resend:\n${(res.errors ?? ['unknown error']).join('\n')}`, true)
  }

  server.registerTool(
    'a2ui_render',
    {
      description: 'Create/update UI surfaces shown inline in the chat. Takes A2UI server messages (see a2ui_catalog).',
      inputSchema: {
        messages: z.array(z.record(z.string(), z.unknown())).min(1).describe('A2UI server messages: createSurface | updateComponents | updateDataModel | deleteSurface')
      }
    },
    ({ messages }) => send(messages)
  )

  server.registerTool(
    'a2ui_delete_surface',
    { description: 'Remove a UI surface from the chat.', inputSchema: { surfaceId: z.string().min(1).describe('Id of the surface to delete') } },
    ({ surfaceId }) => send([{ deleteSurface: { surfaceId } }])
  )

  return server
}

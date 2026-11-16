import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { A2UI_VERSION } from '@shared/a2ui/messages'
import { A2uiMessageValidator } from '@shared/a2ui/validation'
import type { A2uiForwarder } from './bridge-client'
import { buildCatalogReply } from './mcp-instructions'
import { MCP_SERVER_NAME } from './protocol'

const text = (t: string, isError = false): CallToolResult => ({ content: [{ type: 'text', text: t }], ...(isError ? { isError } : {}) })

/** Builds the MCP server (transport-agnostic) exposing the A2UI tools. */
export function createA2uiMcpServer(forwarder: A2uiForwarder, validator: A2uiMessageValidator = new A2uiMessageValidator()): McpServer {
  const server = new McpServer({ name: MCP_SERVER_NAME, version: '0.1.0' })

  server.registerTool(
    'a2ui_catalog',
    { description: 'Describe the Agent7 WinForms component catalog and how to draw UI surfaces. Call this before a2ui_render.' },
    () => text(buildCatalogReply())
  )

  const rejected = (errors: string[]): CallToolResult => text(`Rejected. Fix and resend:\n${errors.join('\n')}`, true)

  /** Validates with web_core first so the agent gets errors without a round trip to the app. */
  const send = async (messages: unknown[]): Promise<CallToolResult> => {
    const validated = validator.validate(messages)
    if (!validated.ok) return rejected(validated.errors)
    const res = await forwarder.forward(validated.messages)
    return res.ok ? text('ok') : rejected(res.errors ?? ['unknown error'])
  }

  server.registerTool(
    'a2ui_render',
    {
      description: 'Create/update UI surfaces shown inline in the chat. Takes A2UI v0.9 server messages (see a2ui_catalog).',
      inputSchema: {
        messages: z.array(z.record(z.string(), z.unknown())).min(1).describe('A2UI server messages: createSurface | updateComponents | updateDataModel | deleteSurface')
      }
    },
    ({ messages }) => send(messages)
  )

  server.registerTool(
    'a2ui_delete_surface',
    { description: 'Remove a UI surface from the chat.', inputSchema: { surfaceId: z.string().min(1).describe('Id of the surface to delete') } },
    ({ surfaceId }) => send([{ version: A2UI_VERSION, deleteSurface: { surfaceId } }])
  )

  return server
}

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema, type CallToolResult, type Tool } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { A2UI_VERSION } from '@shared/a2ui/messages'
import { A2uiMessageValidator } from '@shared/a2ui/validation'
import { DESKTOP_INSTRUCTIONS, specsForGroups } from '../../application/tools/catalog'
import type { ToolResult } from '../../application/tools/types'
import type { BridgeClient } from './bridge-client'
import { buildCatalogReply } from './mcp-instructions'
import { MCP_SERVER_NAME } from './protocol'

const text = (t: string, isError = false): CallToolResult => ({ content: [{ type: 'text', text: t }], ...(isError ? { isError } : {}) })

const jsonSchemaOf = (input: z.ZodType): Tool['inputSchema'] => {
  const { $schema: _schema, ...schema } = z.toJSONSchema(input, { target: 'draft-7', io: 'input' })
  return schema as Tool['inputSchema']
}

const A2UI_TOOLS: Tool[] = [
  {
    name: 'a2ui_catalog',
    description: 'Describe the Agent7 WinForms component catalog and how to draw UI surfaces. Call this before a2ui_render.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'a2ui_render',
    description: 'Create/update UI surfaces shown inline in the chat. Takes A2UI v0.9 server messages (see a2ui_catalog).',
    inputSchema: jsonSchemaOf(
      z.object({
        messages: z
          .array(z.record(z.string(), z.unknown()))
          .min(1)
          .describe('A2UI server messages: createSurface | updateComponents | updateDataModel | deleteSurface')
      })
    )
  },
  {
    name: 'a2ui_delete_surface',
    description: 'Remove a UI surface from the chat.',
    inputSchema: jsonSchemaOf(z.object({ surfaceId: z.string().min(1).describe('Id of the surface to delete') }))
  }
]

const renderArgs = z.object({ messages: z.array(z.record(z.string(), z.unknown())).min(1) })
const deleteArgs = z.object({ surfaceId: z.string().min(1) })

/**
 * The MCP server of one chat (transport-agnostic). Besides the A2UI tools it serves the desktop tools:
 * `tools/list` asks the app which groups the open apps enable, calls are run by the app, and the app's
 * `toolsChanged` push becomes `notifications/tools/list_changed`.
 */
export function createAgent7McpServer(client: BridgeClient, validator: A2uiMessageValidator = new A2uiMessageValidator()): Server {
  const server = new Server({ name: MCP_SERVER_NAME, version: '0.2.0' }, { capabilities: { tools: { listChanged: true } }, instructions: DESKTOP_INSTRUCTIONS })

  const rejected = (errors: string[]): CallToolResult => text(`Rejected. Fix and resend:\n${errors.join('\n')}`, true)
  /** Validates with web_core first so the agent gets errors without a round trip to the app. */
  const send = async (messages: unknown[]): Promise<CallToolResult> => {
    const validated = validator.validate(messages)
    if (!validated.ok) return rejected(validated.errors)
    const res = await client.forward(validated.messages)
    return res.ok ? text('ok') : rejected(res.errors ?? ['unknown error'])
  }

  const desktopTools = async (): Promise<Tool[]> =>
    specsForGroups(await client.tools()).map((spec) => ({ name: spec.name, description: spec.description, inputSchema: jsonSchemaOf(spec.input) }))

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...A2UI_TOOLS, ...(await desktopTools())] }))

  /** Runs an A2UI tool and records the call and its result in the app's protocol event log (like the desktop tools). */
  const logged = async (tool: string, args: unknown, run: () => Promise<CallToolResult>): Promise<CallToolResult> => {
    await client.logCalled(tool, args ?? {}).catch(() => {})
    const result = await run()
    await client.logFinished(tool, { content: result.content as ToolResult['content'], ...(result.isError ? { isError: true } : {}) }).catch(() => {})
    return result
  }

  server.setRequestHandler(CallToolRequestSchema, async ({ params }): Promise<CallToolResult> => {
    switch (params.name) {
      case 'a2ui_catalog':
        return logged(params.name, params.arguments, async () => text(buildCatalogReply()))
      case 'a2ui_render':
        return logged(params.name, params.arguments, async () => {
          const args = renderArgs.safeParse(params.arguments)
          return args.success ? send(args.data.messages) : text(`Invalid arguments: ${args.error.message}`, true)
        })
      case 'a2ui_delete_surface':
        return logged(params.name, params.arguments, async () => {
          const args = deleteArgs.safeParse(params.arguments)
          return args.success ? send([{ version: A2UI_VERSION, deleteSurface: { surfaceId: args.data.surfaceId } }]) : text(`Invalid arguments: ${args.error.message}`, true)
        })
      default:
{
        const result = await client.call(params.name, params.arguments ?? {})
        return { content: result.content, ...(result.isError ? { isError: true } : {}) }
      }
    }
  })

  client.onToolsChanged(() => void server.sendToolListChanged().catch(() => {}))
  server.onclose = () => client.close()
  return server
}

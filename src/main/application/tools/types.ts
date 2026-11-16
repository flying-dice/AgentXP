import type { ToolGroup } from '@shared/desktop'
import type { Id } from '@shared/models'

export type ToolContent = { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }

/** What a desktop tool returns; maps 1:1 onto an MCP `CallToolResult`. */
export interface ToolResult {
  content: ToolContent[]
  isError?: boolean
}

export const textResult = (text: string): ToolResult => ({ content: [{ type: 'text', text }] })
export const errorResult = (text: string): ToolResult => ({ content: [{ type: 'text', text }], isError: true })
export const imageResult = (data: string, mimeType: string, caption: string): ToolResult => ({
  content: [
    { type: 'text', text: caption },
    { type: 'image', data, mimeType }
  ]
})

/** Who is calling: the chat (session) and the desktop it lives on. */
export interface ToolContext {
  sessionId: Id
  desktopId: Id
}

/** The tools the agent of a desktop can use, served to the MCP child over the bridge. */
export interface DesktopToolHost {
  /** The tool groups enabled on the desktop (what `tools/list` shows). */
  enabledGroups(desktopId: Id): ToolGroup[]
  call(context: ToolContext, tool: string, args: unknown): Promise<ToolResult>
}

/** Runs a tool body; a thrown error becomes an MCP error result the agent can read. */
export async function attempt(run: () => ToolResult | Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await run()
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : String(error))
  }
}

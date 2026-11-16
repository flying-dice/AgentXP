import type { ActivityMessage, ContentPart, Message, ToolCall } from '@ag-ui/core'
import type { A2uiSurfaceDto } from '@shared/a2ui'
import { A2UI_ACTIVITY_TYPE, a2uiActivityMessageId, type AguiSessionState } from '@shared/agui-state'
import type { ContentBlockDto, TranscriptEntryDto } from '@shared/models'
import { isDesktopBlock } from '../desktop/desktopBlock'
import { a2uiSurfaceContent } from './a2uiActivity'
import { blocksToText } from './contentText'
import { summariseToolResult } from './toolCallSummary'

type ToolCallEntry = Extract<TranscriptEntryDto, { kind: 'tool_call' }>

const isTerminalStatus = (status: ToolCallEntry['status']): boolean =>
  status === 'completed' || status === 'failed' || status === 'cancelled'

const dataPart = (block: Extract<ContentBlockDto, { kind: 'image' }>): ContentPart =>
  block.uri
    ? { type: 'image', source: { type: 'url', value: block.uri, mimeType: block.mimeType } }
    : { type: 'image', source: { type: 'data', value: block.data, mimeType: block.mimeType } }

/** A user message is a plain string, or content parts when it carries images or attachments. */
function userContent(allBlocks: ContentBlockDto[]): string | ContentPart[] {
  // The desktop state travels with every prompt; the user typed none of it.
  const blocks = allBlocks.filter((b) => !isDesktopBlock(b))
  if (blocks.every((b) => b.kind === 'text')) return blocksToText(blocks)
  return blocks.map((block): ContentPart => {
    switch (block.kind) {
      case 'text':
        return { type: 'text', text: block.text }
      case 'image':
        return dataPart(block)
      case 'resource_link':
        return { type: 'document', source: { type: 'url', value: block.uri, ...(block.mimeType ? { mimeType: block.mimeType } : {}) } }
      case 'resource':
        return { type: 'text', text: block.text ?? block.uri }
    }
  })
}

function toToolCall(entry: ToolCallEntry): ToolCall {
  return {
    id: entry.toolCallId,
    type: 'function',
    function: { name: entry.title || entry.toolKind, arguments: entry.rawInput || '{}' }
  }
}

/** Builds the transcript as AG-UI messages, in the same shape the live stream produces. */
export class TranscriptMessageBuilder {
  private readonly messages: Message[] = []
  /** The assistant message the following tool calls attach to. */
  private segment: Extract<Message, { role: 'assistant' }> | null = null

  constructor(
    private readonly state: Pick<AguiSessionState, 'terminals'>,
    private readonly surfaces: Map<string, A2uiSurfaceDto>
  ) {}

  build(entries: TranscriptEntryDto[]): { messages: Message[]; placedSurfaces: Set<string> } {
    const placed = new Set<string>()
    for (const entry of entries) {
      if (entry.kind === 'message') this.addMessage(entry)
      else if (entry.kind === 'tool_call') this.addToolCall(entry)
      else {
        const surface = this.surfaces.get(entry.surfaceId)
        if (surface) {
          this.segment = null
          placed.add(surface.surfaceId)
          this.messages.push(this.activity(surface))
        }
      }
    }
    return { messages: this.messages, placedSurfaces: placed }
  }

  private activity(surface: A2uiSurfaceDto): ActivityMessage {
    return {
      id: a2uiActivityMessageId(surface.surfaceId),
      role: 'activity',
      activityType: A2UI_ACTIVITY_TYPE,
      content: { ...a2uiSurfaceContent(surface) }
    }
  }

  private addMessage(entry: Extract<TranscriptEntryDto, { kind: 'message' }>): void {
    const id = `message:${entry.id}`
    if (entry.role === 'user') {
      this.segment = null
      this.messages.push({ id, role: 'user', content: userContent(entry.blocks) })
    } else if (entry.role === 'thought') {
      this.segment = null
      this.messages.push({ id, role: 'reasoning', content: blocksToText(entry.blocks) })
    } else {
      this.segment = { id, role: 'assistant', content: blocksToText(entry.blocks) }
      this.messages.push(this.segment)
    }
  }

  private addToolCall(entry: ToolCallEntry): void {
    if (!this.segment) {
      this.segment = { id: `toolcalls:${entry.id}`, role: 'assistant', toolCalls: [] }
      this.messages.push(this.segment)
    }
    this.segment.toolCalls = [...(this.segment.toolCalls ?? []), toToolCall(entry)]
    if (!isTerminalStatus(entry.status)) return
    this.messages.push({
      id: `toolresult:${entry.id}`,
      role: 'tool',
      toolCallId: entry.toolCallId,
      content: summariseToolResult({
        status: entry.status,
        contents: entry.contents,
        rawOutput: entry.rawOutput,
        terminal: (id) => this.state.terminals[id]
      })
    })
  }
}

import { EventType, type Event } from '@ag-ui/core'
import type { AguiTerminalState, AguiToolCallState } from '@shared/agui-state'
import type { ToolCallStatus } from '@shared/models'
import type { AgentSessionEvent, MessageChunkEvent, ToolCallCreatedEvent, ToolCallPatch } from '../../domain/agent/AgentSessionEvent'
import { blockToText } from './contentText'
import { summariseToolResult } from './toolCallSummary'

export type AguiEvent = Event

/** What the translator reads from the shared state (already updated with the event being translated). */
export interface TranslatorContext {
  newId(): string
  toolCall(toolCallId: string): AguiToolCallState | undefined
  terminal(terminalId: string): AguiTerminalState | undefined
}

interface CallTrack {
  /** TOOL_CALL_START sent and TOOL_CALL_END not yet. */
  open: boolean
  rawInput: string | null
  rawOutput: string | null
  resulted: boolean
}

type OpenMessage = { kind: 'text' | 'reasoning'; id: string }

const isTerminal = (status: ToolCallStatus | undefined): boolean =>
  status === 'completed' || status === 'failed' || status === 'cancelled'

/**
 * Translates live agent events into AG-UI message and tool call events. Stateful but pure (no I/O):
 *
 * - agent text chunks become one TEXT_MESSAGE_* sequence, thoughts one REASONING_* sequence; either
 *   is ended as soon as another kind of event comes along or the turn ends (`flush`);
 * - a tool call is started when created (attached to the assistant message of the text before it),
 *   its args are sent once with the latest raw input, right before TOOL_CALL_END, which happens when
 *   the call reaches a final status or at `flush`; TOOL_CALL_RESULT follows on completed/failed/cancelled;
 * - user chunks echoed by the agent are ignored (the user message comes from the run input).
 */
export class AgentEventTranslator {
  private openMessage: OpenMessage | null = null
  /** The assistant message that tool calls attach to; set by text, cleared by reasoning. */
  private segmentId: string | null = null
  private readonly calls = new Map<string, CallTrack>()

  constructor(private readonly context: TranslatorContext) {}

  translate(event: AgentSessionEvent): AguiEvent[] {
    switch (event.type) {
      case 'message_chunk':
        return this.chunk(event)
      case 'tool_call_created':
        return this.toolCallCreated(event)
      case 'tool_call_updated':
        return this.toolCallUpdated(event.toolCallId, event.patch)
      default:
        return []
    }
  }

  /** Ends the open message and every open tool call (before RUN_FINISHED, whether the turn ended or is suspended). */
  flush(): AguiEvent[] {
    const events = this.closeMessage()
    for (const [toolCallId, track] of this.calls) events.push(...this.endCall(toolCallId, track))
    return events
  }

  /** Ends the open text or reasoning message only (tool calls stay open). */
  closeOpenMessage(): AguiEvent[] {
    return this.closeMessage()
  }

  /** Forgets all open elements without events (the client that saw them is gone). */
  reset(): void {
    this.openMessage = null
    this.segmentId = null
    for (const track of this.calls.values()) track.open = false
  }

  private chunk(event: MessageChunkEvent): AguiEvent[] {
    if (event.role === 'user') return []
    const delta = blockToText(event.block)
    if (delta === '') return []
    const kind = event.role === 'agent' ? 'text' : 'reasoning'
    const events = this.openMessage?.kind === kind ? [] : [...this.closeMessage(), ...this.openNew(kind)]
    const messageId = this.openMessage?.id ?? ''
    events.push(
      kind === 'text'
        ? { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta }
        : { type: EventType.REASONING_MESSAGE_CONTENT, messageId, delta }
    )
    return events
  }

  private openNew(kind: OpenMessage['kind']): AguiEvent[] {
    const id = this.context.newId()
    this.openMessage = { kind, id }
    if (kind === 'text') {
      this.segmentId = id
      return [{ type: EventType.TEXT_MESSAGE_START, messageId: id, role: 'assistant' }]
    }
    this.segmentId = null
    return [
      { type: EventType.REASONING_START, messageId: id },
      { type: EventType.REASONING_MESSAGE_START, messageId: id, role: 'reasoning' }
    ]
  }

  private closeMessage(): AguiEvent[] {
    const open = this.openMessage
    this.openMessage = null
    if (!open) return []
    if (open.kind === 'text') return [{ type: EventType.TEXT_MESSAGE_END, messageId: open.id }]
    return [
      { type: EventType.REASONING_MESSAGE_END, messageId: open.id },
      { type: EventType.REASONING_END, messageId: open.id }
    ]
  }

  private toolCallCreated(event: ToolCallCreatedEvent): AguiEvent[] {
    if (this.calls.has(event.toolCallId)) {
      const { type: _type, toolCallId, ...patch } = event
      return this.toolCallUpdated(toolCallId, { ...patch, rawInput: patch.rawInput ?? undefined, rawOutput: patch.rawOutput ?? undefined })
    }
    const events = this.closeMessage()
    this.segmentId ??= this.context.newId()
    this.calls.set(event.toolCallId, { open: true, rawInput: event.rawInput, rawOutput: event.rawOutput, resulted: false })
    events.push({
      type: EventType.TOOL_CALL_START,
      toolCallId: event.toolCallId,
      toolCallName: event.title || event.toolKind,
      parentMessageId: this.segmentId
    })
    if (isTerminal(event.status)) events.push(...this.finishCall(event.toolCallId))
    return events
  }

  private toolCallUpdated(toolCallId: string, patch: ToolCallPatch): AguiEvent[] {
    const track = this.calls.get(toolCallId) ?? { open: false, rawInput: null, rawOutput: null, resulted: false }
    this.calls.set(toolCallId, track)
    if (patch.rawInput !== undefined && track.open) track.rawInput = patch.rawInput
    if (patch.rawOutput !== undefined) track.rawOutput = patch.rawOutput
    if (!isTerminal(patch.status) && !isTerminal(this.context.toolCall(toolCallId)?.status)) return []
    return this.finishCall(toolCallId)
  }

  /** Ends the call (if open) and sends its result (once). */
  private finishCall(toolCallId: string): AguiEvent[] {
    const track = this.calls.get(toolCallId)
    if (!track) return []
    const events = this.endCall(toolCallId, track)
    if (!track.resulted) {
      track.resulted = true
      events.push({
        type: EventType.TOOL_CALL_RESULT,
        messageId: this.context.newId(),
        toolCallId,
        role: 'tool',
        content: this.resultText(toolCallId, track)
      })
    }
    return events.length > 0 ? [...this.closeMessage(), ...events] : events
  }

  private endCall(toolCallId: string, track: CallTrack): AguiEvent[] {
    if (!track.open) return []
    track.open = false
    return [
      { type: EventType.TOOL_CALL_ARGS, toolCallId, delta: track.rawInput || '{}' },
      { type: EventType.TOOL_CALL_END, toolCallId }
    ]
  }

  private resultText(toolCallId: string, track: CallTrack): string {
    const state = this.context.toolCall(toolCallId)
    return summariseToolResult({
      status: state?.status ?? 'completed',
      contents: state?.contents ?? [],
      rawOutput: track.rawOutput,
      terminal: (id) => this.context.terminal(id)
    })
  }
}

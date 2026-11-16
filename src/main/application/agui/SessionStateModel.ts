import type { JsonPatchOperation } from '@ag-ui/core'
import type { AguiSessionInfo, AguiSessionState, AguiTerminalState, AguiToolCallState } from '@shared/agui-state'
import type { DesktopState } from '@shared/desktop'
import type { FileChangeDto, SessionDto, TaskDto, TerminalDto } from '@shared/models'
import type { ToolCallCreatedEvent, ToolCallPatch } from '../../domain/agent/AgentSessionEvent'
import { diffJson } from './jsonDiff'

export const sessionInfoOf = (dto: SessionDto): AguiSessionInfo => ({
  title: dto.title,
  status: dto.status,
  currentModeId: dto.currentModeId,
  currentModelId: dto.currentModelId,
  modes: dto.modes,
  models: dto.models,
  commands: dto.commands,
  contextUsed: dto.contextUsed,
  contextSize: dto.contextSize
})

export const terminalStateOf = (dto: TerminalDto): AguiTerminalState => ({
  command: [dto.command, ...dto.args].join(' '),
  output: dto.output,
  exitCode: dto.exitCode
})

const toolCallStateOf = (event: ToolCallCreatedEvent): AguiToolCallState => ({
  title: event.title,
  kind: event.toolKind,
  status: event.status,
  rawInput: event.rawInput,
  locations: event.locations,
  contents: event.contents
})

/** What an update for a tool call we never saw created starts from (same defaults as the transcript). */
const BLANK_TOOL_CALL: AguiToolCallState = { title: '', kind: 'other', status: 'pending', rawInput: null, locations: [], contents: [] }

function mergeToolCall(current: AguiToolCallState, patch: ToolCallPatch): AguiToolCallState {
  return {
    title: patch.title ?? current.title,
    kind: patch.toolKind ?? current.kind,
    status: patch.status ?? current.status,
    rawInput: patch.rawInput ?? current.rawInput,
    locations: patch.locations ?? current.locations,
    contents: patch.contents ?? current.contents
  }
}

/**
 * The AG-UI shared state of one thread, updated immutably so `flush()` can diff cheaply:
 * it returns the JSON Patch since the last flush/snapshot (the STATE_DELTA payload).
 */
export class SessionStateModel {
  private state: AguiSessionState
  private committed: AguiSessionState

  constructor(initial: AguiSessionState) {
    this.state = initial
    this.committed = initial
  }

  /** Replaces the whole state (e.g. rebuilt from the database) and commits it. */
  reset(state: AguiSessionState): AguiSessionState {
    this.state = state
    this.committed = state
    return state
  }

  /** The current state; marks it as sent, so later deltas are relative to it. */
  snapshot(): AguiSessionState {
    this.committed = this.state
    return this.state
  }

  current(): AguiSessionState {
    return this.state
  }

  /** Patch from the last committed state to now (empty when nothing changed); commits. */
  flush(): JsonPatchOperation[] {
    const ops = diffJson(this.committed, this.state)
    this.committed = this.state
    return ops
  }

  setSession(dto: SessionDto): void {
    this.state = { ...this.state, session: sessionInfoOf(dto) }
  }

  setDesktop(desktop: DesktopState): void {
    this.state = { ...this.state, desktop }
  }

  setTasks(tasks: TaskDto[]): void {
    this.state = { ...this.state, tasks }
  }

  setChanges(changes: FileChangeDto[]): void {
    this.state = { ...this.state, changes }
  }

  setTerminal(dto: TerminalDto): void {
    this.state = { ...this.state, terminals: { ...this.state.terminals, [dto.terminalId]: terminalStateOf(dto) } }
  }

  toolCallCreated(event: ToolCallCreatedEvent): void {
    this.putToolCall(event.toolCallId, toolCallStateOf(event))
  }

  toolCallUpdated(toolCallId: string, patch: ToolCallPatch): void {
    const current = this.state.toolCalls[toolCallId] ?? BLANK_TOOL_CALL
    this.putToolCall(toolCallId, mergeToolCall(current, patch))
  }

  private putToolCall(toolCallId: string, value: AguiToolCallState): void {
    this.state = { ...this.state, toolCalls: { ...this.state.toolCalls, [toolCallId]: value } }
  }
}

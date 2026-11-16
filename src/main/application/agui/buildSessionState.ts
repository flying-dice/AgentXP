import type { AguiSessionState, AguiToolCallState } from '@shared/agui-state'
import type { Id, TaskDto, TerminalDto, TranscriptEntryDto, FileChangeDto, SessionDto } from '@shared/models'
import type { A2uiSurfaceDto } from '@shared/a2ui'
import { sessionInfoOf, terminalStateOf } from './SessionStateModel'

/** The read side the AG-UI backend needs (satisfied by SessionQueryService). */
export interface AguiQueries {
  get(id: Id): SessionDto
  transcript(id: Id): TranscriptEntryDto[]
  tasksOf(id: Id): TaskDto[]
  changesOf(id: Id): FileChangeDto[]
  terminalsOf(id: Id): TerminalDto[]
  surfacesOf(id: Id): A2uiSurfaceDto[]
}

/** The full shared state of a session, read from the persisted data. */
export function buildSessionState(
  queries: AguiQueries,
  sessionId: Id,
  transcript: TranscriptEntryDto[] = queries.transcript(sessionId)
): AguiSessionState {
  const toolCalls: Record<string, AguiToolCallState> = {}
  for (const entry of transcript) {
    if (entry.kind !== 'tool_call') continue
    toolCalls[entry.toolCallId] = {
      title: entry.title,
      kind: entry.toolKind,
      status: entry.status,
      rawInput: entry.rawInput,
      locations: entry.locations,
      contents: entry.contents
    }
  }
  return {
    session: sessionInfoOf(queries.get(sessionId)),
    tasks: queries.tasksOf(sessionId),
    changes: queries.changesOf(sessionId),
    toolCalls,
    terminals: Object.fromEntries(queries.terminalsOf(sessionId).map((t) => [t.terminalId, terminalStateOf(t)])),
    // TODO(desktop backend): fill from DesktopService.
    desktop: null
  }
}

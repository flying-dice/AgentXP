/**
 * The AG-UI contract between the main process (the agent backend) and the
 * renderer (the AG-UI client): the shared state shape, the activity type used
 * for A2UI surfaces and the human-in-the-loop interrupt payloads. Pure types
 * and constants, no runtime dependencies.
 *
 * AG-UI tool calls are minimal (name, JSON args, text result). Everything the
 * UI needs beyond that (kind, status, locations, diffs, terminals) travels in
 * the shared state below.
 */
import type { A2uiServerMessage } from './a2ui'
import type {
  AvailableCommandDto,
  FileChangeDto,
  PermissionOptionDto,
  SessionModeDto,
  SessionModelDto,
  SessionStatus,
  TaskDto,
  ToolCallContentDto,
  ToolCallLocationDto,
  ToolCallStatus,
  ToolKind
} from './models'
import type { DesktopState } from './desktop'

/** The slice of the session row the UI keeps live (title, status, modes, usage...). */
export interface AguiSessionInfo {
  title: string
  status: SessionStatus
  currentModeId: string | null
  currentModelId: string | null
  modes: SessionModeDto[]
  models: SessionModelDto[]
  commands: AvailableCommandDto[]
  contextUsed: number
  contextSize: number
}

/** Everything about a tool call that AG-UI's own tool call messages cannot carry. */
export interface AguiToolCallState {
  title: string
  kind: ToolKind
  status: ToolCallStatus
  /** The agent's raw input as JSON text (the AG-UI tool call carries it too, once the call is complete). */
  rawInput: string | null
  locations: ToolCallLocationDto[]
  contents: ToolCallContentDto[]
}

export interface AguiTerminalState {
  command: string
  output: string
  exitCode: number | null
}

/**
 * The AG-UI shared state of one thread (= one session). Sent as STATE_SNAPSHOT
 * at the start of every run and kept current with STATE_DELTA (JSON Patch).
 */
export interface AguiSessionState {
  session: AguiSessionInfo
  tasks: TaskDto[]
  changes: FileChangeDto[]
  /** Keyed by the ACP tool call id (the same id as the AG-UI tool call). */
  toolCalls: Record<string, AguiToolCallState>
  /** Keyed by the ACP terminal id (referenced by `toolCalls[*].contents`). */
  terminals: Record<string, AguiTerminalState>
  /** The desktop this chat runs on (null before the desktop is known). */
  desktop: DesktopState | null
}

/** `ActivityMessage.activityType` of an A2UI surface. */
export const A2UI_ACTIVITY_TYPE = 'a2ui-surface'

/** Message id of the activity message that carries a surface. */
export const a2uiActivityMessageId = (surfaceId: string): string => `a2ui:${surfaceId}`

/**
 * `ActivityMessage.content` of an A2UI surface: the replayable A2UI server
 * messages (createSurface, updateComponents, updateDataModel). A deleted
 * surface is announced by an ACTIVITY_SNAPSHOT with `{ surfaceId, deleted: true, messages: [] }`
 * that replaces the earlier content in place.
 */
export interface A2uiSurfaceActivity {
  surfaceId: string
  messages: A2uiServerMessage[]
  deleted?: boolean
}

/** `Interrupt.reason` of a tool permission request. */
export const PERMISSION_INTERRUPT_REASON = 'tool_permission'

/** `Interrupt.metadata` of a tool permission request. */
export interface PermissionInterruptMetadata {
  /** The PermissionRequestDto id (also the interrupt id, as a string). */
  requestId: number
  title: string
  toolKind: ToolKind | null
  options: PermissionOptionDto[]
}

export const emptyAguiState = (): AguiSessionState => ({
  session: {
    title: '',
    status: 'closed',
    currentModeId: null,
    currentModelId: null,
    modes: [],
    models: [],
    commands: [],
    contextUsed: 0,
    contextSize: 0
  },
  tasks: [],
  changes: [],
  toolCalls: {},
  terminals: {},
  desktop: null
})

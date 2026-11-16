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
import type { A2uiServerMessage, A2uiSurfaceTarget } from './a2ui'
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
  /** Where the surface is shown; absent means `inline`. */
  target?: A2uiSurfaceTarget
  /** Sidebar surfaces: the user closed its tab. */
  hidden?: boolean
  messages: A2uiServerMessage[]
  deleted?: boolean
}

/** `ActivityMessage.activityType` of the notice that a turn ended for another reason than `end_turn`. */
export const STOP_NOTICE_ACTIVITY_TYPE = 'stop-notice'

/** `ActivityMessage.content` of a stop notice (`reason` is the ACP stop reason: `refusal`, `max_tokens`, ...). */
export interface StopNoticeActivity {
  reason: string
}

/** The notice text for an ACP stop reason. `cancelled` is the user's own Stop (the chat shows it, main sends no notice). */
export function stopNoticeText(reason: string): string {
  switch (reason) {
    case 'cancelled':
      return 'You stopped this reply. The agent is waiting for your next message. To stop all agents until you say so, click Pause all agents in the bar.'
    case 'max_tokens':
      return 'The agent stopped: it reached its output limit.'
    case 'max_turn_requests':
      return 'The agent stopped: it reached the limit of model requests for one turn.'
    case 'refusal':
      return 'The agent declined to continue.'
    default:
      return `The agent stopped (${reason}).`
  }
}

/** True for stop reasons the user should be told about. */
export const isNoticeableStopReason = (reason: string | void): reason is string =>
  typeof reason === 'string' && reason !== 'end_turn' && reason !== 'cancelled'

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

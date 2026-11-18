import type { VPath } from './vfs'

/**
 * Data transfer objects shared by the main process and the renderer.
 * These are plain, serialisable shapes. The main process owns the truth
 * (SQLite); the renderer only ever sees these DTOs.
 */

export type Id = number
export type IsoDate = string

export interface AgentDto {
  id: Id
  name: string
  command: string
  args: string[]
  env: Record<string, string>
  isDefault: boolean
  /** The ACP session mode id new sessions start in (Default, Accept Edits, ...); null keeps the agent's own choice. */
  defaultModeId: string | null
  /** The ACP model id new chats start on (`sonnet`, `opus`, ...); null keeps the agent's own choice. */
  defaultModelId: string | null
}

export interface FolderDto {
  id: Id
  name: string
  path: string
  lastOpenedAt: IsoDate | null
}

export type SessionStatus = 'idle' | 'connecting' | 'working' | 'awaiting_permission' | 'error' | 'closed'

export interface SessionModeDto {
  id: string
  name: string
  description: string | null
}

export interface SessionModelDto {
  id: string
  name: string
  description: string | null
}

export interface AvailableCommandDto {
  name: string
  description: string
  hint: string | null
}

/**
 * What a session is for: `chat` (a Chat window), `review` (the reviewer of a Code Review window) or `aside`
 * (the short-lived embedded chat panel of another app). Review and aside sessions are owned by their window.
 */
export type SessionRole = 'chat' | 'review' | 'aside'

/**
 * What is wrong with a chat's agent program right now. It is not stored: it describes the live process and is
 * cleared by the next successful start. `message` is plain words for the user; `detail` is the technical text
 * ("Details...").
 */
export interface SessionProblemDto {
  kind: 'start-failed' | 'agent-stopped' | 'agent-ended'
  message: string
  detail: string
  /** The plain cause alone ("The program 'x' was not found."), for the line "It stopped again: ..." (no protocol names). */
  cause?: string
  /** How many times in a row this chat's agent failed since it last worked (1 on the first failure); set by main. */
  failures?: number
  /** `start-failed`: the name of the agent that could not start. */
  agentName?: string
  /** `start-failed`: an agent other than the one of the failure before could not start either (the default agent was changed in between). */
  agentChanged?: boolean
}

export interface SessionDto {
  id: Id
  agentId: Id
  /** What the session is for (see `SessionRole`). */
  role: SessionRole
  /** The desktop this chat lives on. */
  desktopId?: Id | null
  /** The chat's working directory (the agent's `cwd`): a VPath on C: or a plugged-in drive. */
  cwd: VPath
  title: string
  status: SessionStatus
  acpSessionId: string | null
  currentModeId: string | null
  currentModelId: string | null
  modes: SessionModeDto[]
  models: SessionModelDto[]
  commands: AvailableCommandDto[]
  contextUsed: number
  contextSize: number
  /** The agent program could not start or stopped (not stored; absent when all is well). */
  problem?: SessionProblemDto | null
  createdAt: IsoDate
  updatedAt: IsoDate
}

/** A block of content inside a message (mirrors ACP ContentBlock, flattened). */
export type ContentBlockDto =
  | { kind: 'text'; text: string }
  | { kind: 'image'; mimeType: string; data: string; uri: string | null }
  | { kind: 'resource_link'; uri: string; name: string; mimeType: string | null }
  | { kind: 'resource'; uri: string; mimeType: string | null; text: string | null }

export type MessageRole = 'user' | 'agent' | 'thought'

export type ToolCallStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
export type ToolKind =
  | 'read'
  | 'edit'
  | 'delete'
  | 'move'
  | 'search'
  | 'execute'
  | 'think'
  | 'fetch'
  | 'switch_mode'
  | 'other'

/** Why the current text of a file could not be read for a change request (`in_use`: another program holds it; `unreadable`: it is not a file, or reading failed). */
export type ReadErrorKind = 'unreadable' | 'in_use'

export type ToolCallContentDto =
  | { kind: 'content'; block: ContentBlockDto }
  | { kind: 'diff'; path: string; oldText: string | null; newText: string; oldTextError?: ReadErrorKind }
  | { kind: 'terminal'; terminalId: string }

export interface ToolCallLocationDto {
  path: string
  line: number | null
}

export interface PermissionOptionDto {
  optionId: string
  name: string
  kind: 'allow_once' | 'allow_always' | 'reject_once' | 'reject_always'
}

export interface PermissionRequestDto {
  id: Id
  sessionId: Id
  toolCallId: string
  options: PermissionOptionDto[]
  outcome: 'pending' | 'selected' | 'cancelled'
  selectedOptionId: string | null
}

/** One row in a session transcript. Ordered by `seq`. */
export type TranscriptEntryDto =
  | {
      kind: 'message'
      id: Id
      seq: number
      role: MessageRole
      blocks: ContentBlockDto[]
      createdAt: IsoDate
    }
  | {
      kind: 'tool_call'
      id: Id
      seq: number
      toolCallId: string
      title: string
      toolKind: ToolKind
      status: ToolCallStatus
      rawInput: string | null
      rawOutput: string | null
      locations: ToolCallLocationDto[]
      contents: ToolCallContentDto[]
      permission: PermissionRequestDto | null
      createdAt: IsoDate
    }
  | {
      kind: 'a2ui'
      id: Id
      seq: number
      surfaceId: string
      createdAt: IsoDate
    }

export type TaskStatus = 'pending' | 'in_progress' | 'completed'
export type TaskPriority = 'high' | 'medium' | 'low'

/** An agent plan entry (ACP `plan` session update), shown in the Tasks pane. */
export interface TaskDto {
  id: Id
  sessionId: Id
  position: number
  content: string
  priority: TaskPriority
  status: TaskStatus
}

export type FileChangeKind = 'added' | 'modified' | 'deleted'

export interface FileChangeDto {
  id: Id
  sessionId: Id
  /** Where the file is on the desktop; `?:\...` when its drive has been ejected. */
  path: VPath
  kind: FileChangeKind
  additions: number
  deletions: number
  originalText: string | null
  currentText: string | null
}

export interface TerminalDto {
  id: Id
  sessionId: Id
  terminalId: string
  command: string
  args: string[]
  cwd: string | null
  output: string
  exitCode: number | null
  signal: string | null
}

export interface FileNodeDto {
  name: string
  path: string
  isDirectory: boolean
}

/** One folder in the "Browse For Folder" tree. `hasChildren` says whether it has sub-folders (shows the expand arrow). */
export interface BrowseEntryDto {
  name: string
  /** Absolute path on the user's disk. */
  path: string
  hasChildren: boolean
}

/** A shortcut at the top of the "Browse For Folder" tree (Home, Documents, Desktop). */
export interface BrowsePlaceDto {
  name: string
  path: string
}

/** The sub-folders of one folder; `path` '' lists the drives (or `/`) and also returns the shortcuts. */
export interface BrowseListingDto {
  path: string
  entries: BrowseEntryDto[]
  places: BrowsePlaceDto[]
  /** Folders used before that still exist, newest first (only when `path` is ''). */
  recent?: BrowsePlaceDto[]
  /** Folders a bare name (no separator) matched, best match first. One entry means the name is resolved. */
  matches?: BrowsePlaceDto[]
}

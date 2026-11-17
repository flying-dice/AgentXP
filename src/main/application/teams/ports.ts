import type { Id, SessionDto } from '@shared/models'
import type { McpServerConfig } from '../../domain/agent/McpServerConfig'

/** Reads and keeps skill folders on disk. */
export interface SkillStore {
  /** The text of `<folder>/SKILL.md`, or null when the folder has none. */
  readSkillFile(folder: string): Promise<string | null>
  /** Copies the whole skill folder to `destination` (replacing what is there). */
  copy(folder: string, destination: string): Promise<void>
  /** Deletes an installed skill folder. */
  remove(folder: string): Promise<void>
}

/** Connects to an MCP server and lists its tools. Rejects with the reason a connection failed. */
export interface McpProber {
  listTools(config: McpServerConfig): Promise<{ name: string; description: string }[]>
}

/** How the filtering proxy is launched (an stdio MCP server run on the app's own Electron in node mode). */
export interface McpProxyLaunch {
  electronPath: string
  scriptPath: string
}

/** What a team room needs from the chat machinery: one `aside` session per member (see `SessionServiceRoomSessions`). */
export interface RoomSessions {
  /** Starts a session for a member; `onCreated` runs as soon as its row exists (before its agent starts). */
  create(desktopId: Id, agentId: Id | undefined, cwd: string, title: string, onCreated: (session: SessionDto) => void): Promise<SessionDto>
  get(sessionId: Id): SessionDto | null
  /** Sends one prompt and resolves with the final message the agent wrote (empty when it wrote none). */
  ask(sessionId: Id, text: string): Promise<string>
  cancel(sessionId: Id): Promise<void>
  setModel(sessionId: Id, modelId: string): Promise<void>
  remove(sessionId: Id): Promise<void>
}

import type { Database } from '../infrastructure/db/sql'
import type { AgentXpEventName, AgentXpEvents } from '@shared/ipc'
import type { ContentBlockDto } from '@shared/models'
import type { McpServerConfig } from '../domain/agent/McpServerConfig'
import { createFixture, type Fixture } from '../infrastructure/db/test-helpers'
import { SqliteA2uiSurfaceRepository } from '../infrastructure/db/sqlite-a2ui-surface-repository'
import { SqliteAgentRepository } from '../infrastructure/db/sqlite-agent-repository'
import { SqliteFileChangeRepository } from '../infrastructure/db/sqlite-file-change-repository'
import { SqliteFolderRepository } from '../infrastructure/db/sqlite-folder-repository'
import { SqlitePermissionRepository } from '../infrastructure/db/sqlite-permission-repository'
import { SqliteSessionRepository } from '../infrastructure/db/sqlite-session-repository'
import { SqliteTaskRepository } from '../infrastructure/db/sqlite-task-repository'
import { SqliteTerminalRepository } from '../infrastructure/db/sqlite-terminal-repository'
import { SqliteTranscriptRepository } from '../infrastructure/db/sqlite-transcript-repository'
import type {
  AcpSessionState,
  AgentConnector,
  AgentLaunch,
  EventPublisher,
  LiveAgentConnection,
  OpenedAcpSession,
  StopReason
} from './ports'

export interface PublishedEvent {
  event: AgentXpEventName
  payload: unknown
}

export class RecordingPublisher implements EventPublisher {
  readonly published: PublishedEvent[] = []

  publish<K extends AgentXpEventName>(event: K, payload: AgentXpEvents[K]): void {
    this.published.push({ event, payload })
  }

  payloads<K extends AgentXpEventName>(event: K): AgentXpEvents[K][] {
    return this.published.filter((p) => p.event === event).map((p) => p.payload as AgentXpEvents[K])
  }

  names(): AgentXpEventName[] {
    return this.published.map((p) => p.event)
  }
}

export function createRepos(db: Database) {
  return {
    agents: new SqliteAgentRepository(db),
    folders: new SqliteFolderRepository(db),
    sessions: new SqliteSessionRepository(db),
    transcripts: new SqliteTranscriptRepository(db),
    tasks: new SqliteTaskRepository(db),
    changes: new SqliteFileChangeRepository(db),
    terminals: new SqliteTerminalRepository(db),
    permissions: new SqlitePermissionRepository(db),
    surfaces: new SqliteA2uiSurfaceRepository(db)
  }
}

export type Repos = ReturnType<typeof createRepos>

/** In-memory database with the seeded agent, one folder, one session and repositories over it. */
export function createAppFixture(): Fixture & { repos: Repos; publisher: RecordingPublisher } {
  const fixture = createFixture()
  return { ...fixture, repos: createRepos(fixture.db), publisher: new RecordingPublisher() }
}

export class FakeLiveConnection implements LiveAgentConnection {
  canLoadSession = false
  readonly calls: string[] = []
  readonly prompts: ContentBlockDto[][] = []
  mcpServers: McpServerConfig[] = []
  stopReason: StopReason = 'end_turn'
  promptError: Error | null = null
  onPrompt: () => Promise<void> = async () => {}
  disposed = false
  private closeNow: () => void = () => {}
  readonly closed = new Promise<void>((resolve) => (this.closeNow = resolve))

  constructor(private readonly nextAcpId: string) {}

  async newSession(_cwd: string, mcpServers: McpServerConfig[]): Promise<OpenedAcpSession> {
    this.calls.push('newSession')
    this.mcpServers = mcpServers
    return {
      acpSessionId: this.nextAcpId,
      modes: [{ id: 'default', name: 'Default', description: null }],
      models: [],
      currentModeId: 'default',
      currentModelId: null
    }
  }

  async loadSession(acpSessionId: string, _cwd: string, mcpServers: McpServerConfig[]): Promise<AcpSessionState> {
    this.calls.push(`loadSession:${acpSessionId}`)
    this.mcpServers = mcpServers
    return { modes: [], models: [], currentModeId: null, currentModelId: null }
  }

  async prompt(_acpSessionId: string, blocks: ContentBlockDto[]): Promise<StopReason> {
    this.calls.push('prompt')
    this.prompts.push(blocks)
    await this.onPrompt()
    if (this.promptError) throw this.promptError
    return this.stopReason
  }

  async cancel(): Promise<void> {
    this.calls.push('cancel')
  }

  async setMode(_acpSessionId: string, modeId: string): Promise<void> {
    this.calls.push(`setMode:${modeId}`)
  }

  async setModel(_acpSessionId: string, modelId: string): Promise<void> {
    this.calls.push(`setModel:${modelId}`)
  }

  async dispose(): Promise<void> {
    this.disposed = true
    this.closeNow()
  }

  /** Simulates the agent process dying. */
  crash(): void {
    this.closeNow()
  }
}

export class FakeConnector implements AgentConnector {
  readonly launches: AgentLaunch[] = []
  readonly connections: FakeLiveConnection[] = []
  canLoadSession = false
  openError: Error | null = null

  async open(launch: AgentLaunch): Promise<LiveAgentConnection> {
    if (this.openError) throw this.openError
    this.launches.push(launch)
    const connection = new FakeLiveConnection(`acp-${this.connections.length + 1}`)
    connection.canLoadSession = this.canLoadSession
    this.connections.push(connection)
    return connection
  }
}

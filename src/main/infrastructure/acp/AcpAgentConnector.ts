import type { ContentBlockDto } from '@shared/models'
import type {
  AcpSessionState,
  AgentConnector,
  AgentLaunch,
  LiveAgentConnection,
  OpenedAcpSession,
  StopReason
} from '../../application/ports'
import type { McpServerConfig } from '../../domain/agent/McpServerConfig'
import { AcpAgentConnection } from './AcpAgentConnection'
import { AgentProcess, type AgentProcessExit } from './AgentProcess'
import { tapStream } from './tapStream'
import { TerminalManager } from './TerminalManager'

const describeExit = (exit: AgentProcessExit, stderr: string[]): string => {
  const reason = exit.error ? exit.error.message : `exit code ${exit.code ?? exit.signal ?? 'unknown'}`
  const tail = stderr.slice(-5).join('\n')
  return `The agent process ended before it was ready (${reason})${tail ? `:\n${tail}` : ''}`
}

class AcpLiveConnection implements LiveAgentConnection {
  constructor(
    private readonly proc: AgentProcess,
    private readonly connection: AcpAgentConnection,
    private readonly terminals: TerminalManager,
    readonly canLoadSession: boolean
  ) {}

  get pid(): number | null {
    return this.proc.pid ?? null
  }

  get closed(): Promise<void> {
    return Promise.race([this.connection.closed, this.proc.exited.then(() => undefined)])
  }

  newSession(cwd: string, mcpServers: McpServerConfig[], systemPrompt?: string | null): Promise<OpenedAcpSession> {
    return this.connection.newSession(cwd, mcpServers, systemPrompt)
  }

  loadSession(acpSessionId: string, cwd: string, mcpServers: McpServerConfig[], systemPrompt?: string | null): Promise<AcpSessionState> {
    return this.connection.loadSession(acpSessionId, cwd, mcpServers, systemPrompt)
  }

  prompt(acpSessionId: string, blocks: ContentBlockDto[]): Promise<StopReason> {
    return this.connection.prompt(acpSessionId, blocks)
  }

  cancel(acpSessionId: string): Promise<void> {
    return this.connection.cancel(acpSessionId)
  }

  setMode(acpSessionId: string, modeId: string): Promise<void> {
    return this.connection.setMode(acpSessionId, modeId)
  }

  setModel(acpSessionId: string, modelId: string): Promise<void> {
    return this.connection.setModel(acpSessionId, modelId)
  }

  async dispose(): Promise<void> {
    this.connection.dispose()
    await this.terminals.releaseAll()
    await this.proc.dispose()
  }
}

/** Spawns one agent process per call and speaks ACP to it. */
export class AcpAgentConnector implements AgentConnector {
  async open({ agent, cwd, handlers }: AgentLaunch): Promise<LiveAgentConnection> {
    const proc = new AgentProcess({ command: agent.command, args: agent.args, env: agent.env, cwd })
    const terminals = new TerminalManager((change) => handlers.onTerminalActivity(change))
    const connection = new AcpAgentConnection({
      stream: handlers.tap ? tapStream(proc.stream, handlers.tap) : proc.stream,
      sink: handlers.sink,
      permissions: handlers.permissions,
      files: handlers.files,
      gate: handlers.gate,
      terminals
    })
    const live = (canLoadSession: boolean): AcpLiveConnection =>
      new AcpLiveConnection(proc, connection, terminals, canLoadSession)
    try {
      const exitedEarly = proc.exited.then((exit) => {
        throw new Error(describeExit(exit, proc.stderrLog))
      })
      const info = await Promise.race([connection.initialize(), exitedEarly])
      return live(info.canLoadSession)
    } catch (error) {
      await live(false).dispose()
      throw error
    }
  }
}

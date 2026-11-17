import type { Id } from '@shared/models'
import type { McpServerDto, McpServerInput, McpTestResultDto } from '@shared/teams'
import type { McpServerConfig } from '../../domain/agent/McpServerConfig'
import type { McpServerRepository } from '../../domain/repositories/teams-repositories'
import { AppError, required } from '../errors'
import type { McpProber } from './ports'

const NAME = /^[A-Za-z0-9_-]+$/
/** Names the harness uses itself. */
const RESERVED = new Set(['agentxp', 'a2ui'])

/** What the agent is given for a saved server (the proxy that hides switched-off tools is added by `AgentCapabilities`). */
export function toMcpConfig(server: Pick<McpServerDto, 'name' | 'transport' | 'command' | 'args' | 'url' | 'vars'>): McpServerConfig {
  const vars = Object.fromEntries(server.vars.map((v) => [v.key, v.value]))
  return server.transport === 'stdio'
    ? { kind: 'stdio', name: server.name, command: server.command, args: server.args, env: vars }
    : { kind: 'http', name: server.name, url: server.url, headers: vars }
}

const clean = (input: McpServerInput): McpServerInput => {
  const name = input.name.trim()
  if (!name) throw new AppError('The server needs a name')
  if (!NAME.test(name)) throw new AppError('The name can only have letters, digits, - and _ (agents use it to tell servers apart).')
  if (RESERVED.has(name.toLowerCase())) throw new AppError(`"${name}" is used by AgentXP itself. Choose another name.`)
  const command = input.command.trim()
  const url = input.url.trim()
  if (input.transport === 'stdio' && !command) throw new AppError('The server needs a command')
  if (input.transport === 'http' && !/^https?:\/\/\S+$/i.test(url)) throw new AppError('The server needs an address that starts with http:// or https://')
  const keys = new Set<string>()
  const vars = input.vars
    .map((v) => ({ key: v.key.trim(), value: v.value, secret: v.secret }))
    .filter((v) => v.key !== '')
    .filter((v) => !keys.has(v.key) && keys.add(v.key))
  return { name, transport: input.transport, command: input.transport === 'stdio' ? command : '', args: input.transport === 'stdio' ? input.args : [], url: input.transport === 'http' ? url : '', vars }
}

/** MCP servers the user installed: add, edit, remove, switch, test and switch single tools. */
export class McpServerService {
  constructor(
    private readonly servers: McpServerRepository,
    private readonly prober: McpProber,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  list(): McpServerDto[] {
    return this.servers.list()
  }

  add(input: McpServerInput): McpServerDto {
    const data = clean(input)
    this.requireFreeName(data.name)
    return this.servers.create(data)
  }

  update(id: Id, input: McpServerInput): McpServerDto {
    required(this.servers.get(id), 'MCP server')
    const data = clean(input)
    this.requireFreeName(data.name, id)
    return required(this.servers.update(id, data), 'MCP server')
  }

  remove(id: Id): void {
    required(this.servers.remove(id) || null, 'MCP server')
  }

  setEnabled(id: Id, enabled: boolean): void {
    required(this.servers.setEnabled(id, enabled) || null, 'MCP server')
  }

  setToolEnabled(id: Id, tool: string, enabled: boolean): void {
    required(this.servers.setToolEnabled(id, tool, enabled) || null, 'Tool')
  }

  /** Connects with what a form holds (nothing is saved). */
  async probe(input: McpServerInput): Promise<McpTestResultDto> {
    const data = clean(input)
    return (await this.attempt(toMcpConfig({ ...data }))).result
  }

  /** Connects to a saved server and keeps what was found: the result of the test and its tools. */
  async test(id: Id): Promise<McpServerDto> {
    const server = required(this.servers.get(id), 'MCP server')
    const { result, tools } = await this.attempt(toMcpConfig(server))
    return required(this.servers.saveTest(id, result, tools), 'MCP server')
  }

  private async attempt(config: McpServerConfig): Promise<{ result: McpTestResultDto; tools: { name: string; description: string }[] | null }> {
    try {
      const tools = await this.prober.listTools(config)
      return { result: { ok: true, message: `Connected. ${tools.length} ${tools.length === 1 ? 'tool' : 'tools'}.`, at: this.now() }, tools }
    } catch (error) {
      return { result: { ok: false, message: `Could not connect: ${error instanceof Error ? error.message : String(error)}`, at: this.now() }, tools: null }
    }
  }

  private requireFreeName(name: string, except?: Id): void {
    const taken = this.servers.list().find((s) => s.name.toLowerCase() === name.toLowerCase() && s.id !== except)
    if (taken) throw new AppError(`A server named "${name}" is installed already.`)
  }
}

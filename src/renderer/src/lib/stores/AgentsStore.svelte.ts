import type { AgentInput, Agent7Api } from '@shared/ipc'
import type { AgentDto, Id } from '@shared/models'

/** The configured ACP agents. */
export class AgentsStore {
  items = $state.raw<AgentDto[]>([])
  private readonly api: Agent7Api['agents']

  constructor(api: Agent7Api['agents']) {
    this.api = api
  }

  /** The agent flagged as default, or the first one. */
  get defaultAgent(): AgentDto | null {
    return this.items.find((a) => a.isDefault) ?? this.items[0] ?? null
  }

  byId(id: Id | null | undefined): AgentDto | null {
    return id == null ? null : (this.items.find((a) => a.id === id) ?? null)
  }

  async load(): Promise<void> {
    this.items = await this.api.list()
  }

  async create(input: AgentInput): Promise<AgentDto> {
    const agent = await this.api.create(input)
    await this.load()
    return agent
  }

  async update(id: Id, input: AgentInput): Promise<void> {
    await this.api.update(id, input)
    await this.load()
  }

  async remove(id: Id): Promise<void> {
    await this.api.remove(id)
    await this.load()
  }

  async setDefault(id: Id): Promise<void> {
    await this.api.setDefault(id)
    await this.load()
  }
}

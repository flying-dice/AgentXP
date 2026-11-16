import type { AgentDto, Id } from '@shared/models'

export type NewAgent = Omit<AgentDto, 'id' | 'isDefault' | 'defaultModeId'> & { defaultModeId?: string | null }

export interface AgentRepository {
  list(): AgentDto[]
  get(id: Id): AgentDto | null
  getDefault(): AgentDto | null
  create(input: NewAgent): AgentDto
  update(id: Id, input: NewAgent): AgentDto | null
  /** Throws while sessions still reference the agent. Returns false when it does not exist. */
  remove(id: Id): boolean
  /** Makes exactly this agent the default. Returns false when it does not exist. */
  setDefault(id: Id): boolean
}

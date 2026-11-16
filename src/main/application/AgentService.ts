import type { AgentDto, Id } from '@shared/models'
import type { AgentInput } from '@shared/ipc'
import type { AgentRepository } from '../domain/repositories/agent-repository'
import { AppError, required } from './errors'

const clean = (input: AgentInput): AgentInput => {
  const name = input.name.trim()
  const command = input.command.trim()
  if (!name) throw new AppError('The agent needs a name')
  if (!command) throw new AppError('The agent needs a command')
  return { name, command, args: input.args, env: input.env }
}

export class AgentService {
  constructor(private readonly agents: AgentRepository) {}

  list(): AgentDto[] {
    return this.agents.list()
  }

  create(input: AgentInput): AgentDto {
    return this.agents.create(clean(input))
  }

  update(id: Id, input: AgentInput): AgentDto {
    return required(this.agents.update(id, clean(input)), 'Agent')
  }

  remove(id: Id): void {
    required(this.agents.remove(id) || null, 'Agent')
  }

  setDefault(id: Id): void {
    required(this.agents.setDefault(id) || null, 'Agent')
  }
}

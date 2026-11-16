import type { AgentDto, Id } from '@shared/models'
import type { AgentInput } from '@shared/ipc'
import type { AgentRepository } from '../domain/repositories/agent-repository'
import { AppError, required } from './errors'

/** Finds out whether a program can be started (looked up like the shell does). */
export interface CommandLocator {
  exists(command: string): Promise<boolean>
}

const clean = (input: AgentInput): AgentInput => {
  const command = input.command.trim()
  if (!command) throw new AppError('The agent needs a command')
  // The name is optional: without one the agent is listed by its command line ("node my-agent.js").
  const name = input.name.trim() || [command, ...input.args].join(' ')
  const defaultModeId = input.defaultModeId?.trim() || null
  return { name, command, args: input.args, env: input.env, defaultModeId }
}

export class AgentService {
  constructor(
    private readonly agents: AgentRepository,
    private readonly locator: CommandLocator = { exists: async () => false }
  ) {}

  /** True when `command` is a program that can be started ("Test" in the Add Agent dialog). */
  check(command: string): Promise<boolean> {
    return this.locator.exists(command)
  }

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

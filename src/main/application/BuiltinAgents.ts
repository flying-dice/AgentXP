import type { AgentRepository, NewAgent } from '../domain/repositories/agent-repository'

/** An agent that ships inside the app. Its command and script path depend on where the app is installed. */
export interface BuiltinAgent extends NewAgent {
  /** Identifies the row: the agent is found by name. */
  readonly name: string
}

/**
 * Makes sure the built-in agents exist (first run, and databases created before the agent shipped).
 * Idempotent: an existing row keeps what the user edited (extra args, other env, default flag) and only gets its
 * command, its first argument (the bundled entry file, which moves with the install) and its env defaults refreshed.
 */
export function ensureBuiltinAgents(agents: AgentRepository, builtins: readonly BuiltinAgent[]): void {
  for (const builtin of builtins) {
    const existing = agents.list().find((a) => a.name === builtin.name)
    if (!existing) {
      agents.create({ name: builtin.name, command: builtin.command, args: [...builtin.args], env: { ...builtin.env } })
      continue
    }
    const args = [...existing.args]
    if (builtin.args.length > 0) args[0] = builtin.args[0]
    const next: NewAgent = { name: existing.name, command: builtin.command, args, env: { ...builtin.env, ...existing.env } }
    const same =
      existing.command === next.command &&
      JSON.stringify(existing.args) === JSON.stringify(next.args) &&
      JSON.stringify(existing.env) === JSON.stringify(next.env)
    if (!same) agents.update(existing.id, next)
  }
}

/** Words and picks of the Agents page of Control Center (UX-149). Pure, so they are tested. */
import type { AgentDto, SessionDto } from '@shared/models'
import { describeAgent } from '../../app/options/agentForm'

/** The command line of an agent: "node my-agent.js". */
export const commandOf = (agent: Pick<AgentDto, 'command' | 'args'>): string => [agent.command, ...agent.args].join(' ')

/** Whether the program of an agent exists on this computer: `unknown` until the page has looked (UX-197). */
export type ProgramState = 'found' | 'missing' | 'unknown'

/** The word for an agent whose program is missing: "Not installed" for an agent AgentXP knows, "Not found" for one you added. */
export const missingWord = (agent: Pick<AgentDto, 'name' | 'command' | 'args'>): string => (describeAgent(agent) ? 'Not installed' : 'Not found')

/**
 * The About column: the state when the program is missing ("Not installed", "Not found"), else what the agent is, or, for an agent
 * you added, the command that starts it (never blank). The default agent shows the same words (UX-197).
 */
export const aboutOf = (agent: Pick<AgentDto, 'name' | 'command' | 'args'>, state: ProgramState = 'unknown'): string =>
  state === 'missing' ? missingWord(agent) : describeAgent(agent) || commandOf(agent)

/** What "Set as Default" asks for an agent whose program is missing. No is the default answer. */
export const MISSING_DEFAULT_QUESTION = 'This program was not found. Make it the default anyway?'

/**
 * Looks for the program of every agent (`check` is the `which` of the main process; no program starts). A command that several agents
 * share is looked up once. An agent whose check fails stays `unknown`, so a broken check never marks a good agent.
 */
export async function probePrograms(agents: readonly Pick<AgentDto, 'id' | 'command'>[], check: (command: string) => Promise<boolean>): Promise<Map<number, ProgramState>> {
  const found = new Map<string, Promise<ProgramState>>()
  const lookup = (command: string): Promise<ProgramState> => {
    const known = found.get(command)
    if (known) return known
    const state = check(command).then<ProgramState, ProgramState>((ok) => (ok ? 'found' : 'missing'), () => 'unknown')
    found.set(command, state)
    return state
  }
  const states = await Promise.all(agents.map(async (a) => [a.id, await lookup(a.command)] as const))
  return new Map(states)
}

/**
 * The agent to select when the page opens from a chat that could not use its agent ("Open Agents"): the agent of the
 * newest chat that has a problem. Null when no chat has one.
 */
export function agentToSelect(sessions: readonly Pick<SessionDto, 'agentId' | 'problem' | 'updatedAt'>[], agents: readonly Pick<AgentDto, 'id'>[]): number | null {
  const broken = sessions.filter((s) => s.problem && agents.some((a) => a.id === s.agentId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return broken[0]?.agentId ?? null
}

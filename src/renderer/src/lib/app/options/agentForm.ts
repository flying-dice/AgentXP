import type { AgentDto } from '@shared/models'
import type { AgentInput } from '@shared/ipc'

/** One argument per line; blank lines are dropped. */
export const parseArgs = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/, ''))
    .filter((line) => line.trim() !== '')

export const formatArgs = (args: string[]): string => args.join('\n')

export interface ParsedEnv {
  env: Record<string, string>
  /** Lines that are not `KEY=VALUE`. */
  invalid: string[]
}

/** `KEY=VALUE` per line; blank lines are ignored. */
export function parseEnv(text: string): ParsedEnv {
  const env: Record<string, string> = {}
  const invalid: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const at = line.indexOf('=')
    if (at < 1) invalid.push(line)
    else env[line.slice(0, at).trim()] = line.slice(at + 1)
  }
  return { env, invalid }
}

export const formatEnv = (env: Record<string, string>): string =>
  Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

export interface AgentFormValues {
  /** Optional: without one the agent is listed by its command line. */
  name: string
  command: string
  args: string
  env: string
  /** "Make this the default agent for new desktops and chats". */
  makeDefault: boolean
}

/** A new agent is the default unless the person unticks the box. */
export const emptyAgentForm = (): AgentFormValues => ({ name: '', command: '', args: '', env: '', makeDefault: true })

export const formFromAgent = (agent: AgentDto): AgentFormValues => ({
  name: agent.name,
  command: agent.command,
  args: formatArgs(agent.args),
  env: formatEnv(agent.env),
  makeDefault: agent.isDefault
})

/** The command line of a form ("node my-agent.js"): the name an agent gets when none is typed. */
export const commandLine = (values: Pick<AgentFormValues, 'command' | 'args'>): string =>
  [values.command.trim(), ...parseArgs(values.args)].filter(Boolean).join(' ')

/** Validation message, or null when the form can be submitted. */
export function validateAgentForm(values: AgentFormValues): string | null {
  if (!values.command.trim()) return 'Enter the program that starts the agent.'
  const { invalid } = parseEnv(values.env)
  return invalid.length ? `Environment lines must look like KEY=VALUE: ${invalid[0]}` : null
}

export const inputFromForm = (values: AgentFormValues): AgentInput => ({
  name: values.name.trim() || commandLine(values),
  command: values.command.trim(),
  args: parseArgs(values.args),
  env: parseEnv(values.env).env
})

/** The line under the Test button. */
export const checkMessage = (command: string, found: boolean): string => (found ? `Found '${command.trim()}'.` : `Could not find '${command.trim()}'.`)

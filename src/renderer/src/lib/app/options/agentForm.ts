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
  /** An ACP session mode id, '' for the agent's own default. */
  defaultModeId: string
}

/** The session modes Claude Code offers; other agents may name their own (the field is editable). */
export const COMMON_MODES: { value: string; label: string }[] = [
  { value: '', label: 'Agent default' },
  { value: 'default', label: 'Default (asks before risky actions)' },
  { value: 'acceptEdits', label: 'Accept Edits (no prompts for file edits)' },
  { value: 'plan', label: 'Plan (no tool execution)' },
  { value: 'dontAsk', label: "Don't Ask (deny what is not pre-approved)" },
  { value: 'bypassPermissions', label: 'Bypass Permissions (no prompts at all)' }
]

/** A new agent is the default unless the person unticks the box. */
export const emptyAgentForm = (): AgentFormValues => ({ name: '', command: '', args: '', env: '', makeDefault: true, defaultModeId: '' })

export const formFromAgent = (agent: AgentDto): AgentFormValues => ({
  name: agent.name,
  command: agent.command,
  args: formatArgs(agent.args),
  env: formatEnv(agent.env),
  makeDefault: agent.isDefault,
  defaultModeId: agent.defaultModeId ?? ''
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
  env: parseEnv(values.env).env,
  defaultModeId: values.defaultModeId.trim() || null
})

/** The line under the Test button. */
export const checkMessage = (command: string, found: boolean): string => (found ? `Found '${command.trim()}'.` : `Could not find '${command.trim()}'.`)

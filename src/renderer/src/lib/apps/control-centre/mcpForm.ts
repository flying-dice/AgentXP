import type { McpServerDto, McpServerInput, McpTransport, McpVarDto } from '@shared/teams'
import { formatArgs, parseArgs } from '../../app/options/agentForm'

export interface McpFormValues {
  name: string
  transport: McpTransport
  command: string
  /** One argument per line. */
  args: string
  url: string
  vars: McpVarDto[]
}

export const emptyMcpForm = (): McpFormValues => ({ name: '', transport: 'stdio', command: '', args: '', url: '', vars: [] })

export const formFromServer = (s: McpServerDto): McpFormValues => ({
  name: s.name,
  transport: s.transport,
  command: s.command,
  args: formatArgs(s.args),
  url: s.url,
  vars: s.vars.map((v) => ({ ...v }))
})

export const inputFromForm = (f: McpFormValues): McpServerInput => ({
  name: f.name.trim(),
  transport: f.transport,
  command: f.command.trim(),
  args: parseArgs(f.args),
  url: f.url.trim(),
  vars: f.vars.filter((v) => v.key.trim() !== '').map((v) => ({ key: v.key.trim(), value: v.value, secret: v.secret }))
})

/** Why the form cannot be saved yet, or null. The same rules main applies, so the dialog says it before the round trip. */
export function validateMcpForm(f: McpFormValues): string | null {
  const name = f.name.trim()
  if (!name) return 'Enter a name for the server.'
  if (!/^[A-Za-z0-9_-]+$/.test(name)) return 'The name can only have letters, digits, - and _.'
  if (f.transport === 'stdio' && !f.command.trim()) return 'Enter the program that starts the server.'
  if (f.transport === 'http' && !/^https?:\/\/\S+$/i.test(f.url.trim())) return 'Enter the address of the server, starting with http:// or https://.'
  return null
}

export const varsLabel = (transport: McpTransport): string => (transport === 'stdio' ? 'Environment:' : 'Headers:')

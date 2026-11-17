import type { McpServerDto, SkillDto } from '@shared/teams'
import type { ListRow } from '../../kit/organisms/ListView'

export const onOff = (on: boolean): string => (on ? 'On' : 'Off')

export const skillRows = (skills: readonly SkillDto[]): ListRow[] =>
  skills.map((s) => ({ id: String(s.id), icon: 'library', name: s.name, description: s.description, status: onOff(s.enabled) }))

/** "2 of 3 on", "3 on", or "Not tested yet" for a server whose tools are not known. */
export function toolsSummary(server: Pick<McpServerDto, 'tools' | 'lastTest'>): string {
  const total = server.tools.length
  if (total === 0) return server.lastTest ? 'None' : 'Not tested yet'
  const on = server.tools.filter((t) => t.enabled).length
  return on === total ? `${total} on` : `${on} of ${total} on`
}

/** What starts the server: the command line, or the address. */
export const serverTarget = (s: Pick<McpServerDto, 'transport' | 'command' | 'args' | 'url'>): string =>
  s.transport === 'stdio' ? [s.command, ...s.args].join(' ') : s.url

export const mcpRows = (servers: readonly McpServerDto[]): ListRow[] =>
  servers.map((s) => ({
    id: String(s.id),
    icon: 'options',
    name: s.name,
    type: s.transport === 'stdio' ? 'Program' : 'Web address',
    target: serverTarget(s),
    tools: toolsSummary(s),
    status: onOff(s.enabled)
  }))

/** The folder name of a path with either kind of separator ("C:\\skills\\pdf" is "pdf"). */
export const folderNameOf = (path: string): string => path.split(/[\\/]/).filter(Boolean).at(-1) ?? path

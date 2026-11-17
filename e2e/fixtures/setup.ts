/**
 * SETUP helpers. These are the ONLY place that talks to the backend through `window.agentxp`
 * (inside `page.evaluate`): they prepare data the UI cannot create (a registered agent, a temp
 * workspace, a plugged-in drive). Specs and page objects verify behaviour through test ids only.
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import type { Page } from 'playwright'
import type { ProtocolEventDto } from '../../src/shared/desktop'
import { projectRoot } from './launch'

export const fakeAgentScript = join(projectRoot, 'src/main/infrastructure/acp/__fixtures__/fake-agent.ts')

export interface Workspace {
  readonly path: string
  /** Folder name, as the app shows it in the "Projects" list. */
  readonly name: string
  remove(): Promise<void>
}

/** A temp project directory with the given files (relative path -> text). */
export async function createWorkspace(files: Record<string, string> = { 'README.md': '# Demo project\n', 'src/index.ts': 'export const answer = 42\n' }): Promise<Workspace> {
  const path = await mkdtemp(join(tmpdir(), 'a7-e2e-ws-'))
  for (const [relative, text] of Object.entries(files)) {
    const file = join(path, relative)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, text)
  }
  return { path, name: path.split(/[\\/]/).pop() ?? path, remove: () => rm(path, { recursive: true, force: true }) }
}

/** Registers the fixture ACP agent (`fake-agent.ts`) as the default agent. Returns its id. */
export async function registerFakeAgent(page: Page, name = 'Fake agent'): Promise<number> {
  return page.evaluate(
    async ({ name, script }) => {
      const api = (window as unknown as { agentxp: import('../../src/shared/ipc').AgentXPApi }).agentxp
      const agent = await api.agents.create({ name, command: 'node', args: ['--experimental-strip-types', '--no-warnings', script], env: { FAKE_AGENT_UNIQUE_SESSIONS: '1' } })
      await api.agents.setDefault(agent.id)
      return agent.id
    },
    { name, script: fakeAgentScript }
  )
}

/** Adds the workspace folder to the app (so it shows up in "New desktop"). Returns the folder id. */
export async function addProject(page: Page, workspace: Workspace): Promise<number> {
  return page.evaluate(async (path) => (await (window as unknown as { agentxp: import('../../src/shared/ipc').AgentXPApi }).agentxp.folders.add(path)).id, workspace.path)
}

/** Plugs the workspace into a RUNNING desktop as the next USB drive (what the Explorer's "Plug in a project" does). */
export async function plugWorkspaceIn(desktopPage: Page, desktopId: number, workspace: Workspace): Promise<string> {
  return desktopPage.evaluate(
    async ({ desktopId, path }) => {
      const api = (window as unknown as { agentxp: import('../../src/shared/ipc').AgentXPApi }).agentxp
      const folder = await api.folders.add(path)
      const drive = await api.drives.plugIn(desktopId, folder.id)
      if (!drive) throw new Error('the project was not plugged in')
      return drive.letter
    },
    { desktopId, path: workspace.path }
  )
}

/** Lets the agent run shell commands without a prompt (the fake agent also runs a terminal command). */
export async function allowTerminal(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const api = (window as unknown as { agentxp: import('../../src/shared/ipc').AgentXPApi }).agentxp
    const policy = await api.desktop.policy()
    await api.desktop.setPolicy({ ...policy, groups: { ...policy.groups, terminal: 'allow' } })
  })
}

/** Lets the agent write files without a prompt (a spec that only looks at the resulting changes). */
export async function allowFileWrites(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const api = (window as unknown as { agentxp: import('../../src/shared/ipc').AgentXPApi }).agentxp
    const policy = await api.desktop.policy()
    await api.desktop.setPolicy({ ...policy, groups: { ...policy.groups, 'fs.write': 'allow' } })
  })
}

/** The id of the desktop a window shows, read from its URL (`?desktop=<id>`). */
export const desktopIdOf = (page: Page): number => Number(new URL(page.url()).searchParams.get('desktop'))

/** Reads the id of a desktop by its title from the launcher (setup/read only). */
export async function desktopIdByTitle(launcherPage: Page, title: string): Promise<number> {
  return launcherPage.evaluate(async (title) => {
    const api = (window as unknown as { agentxp: import('../../src/shared/ipc').AgentXPApi }).agentxp
    const found = (await api.launcher.list()).find((d) => d.title === title)
    if (!found) throw new Error(`no desktop titled ${title}`)
    return found.id
  }, title)
}

/** Registers any ACP agent (name, command, args, env) and optionally makes it the default. Returns its id. */
export async function registerAgent(
  page: Page,
  agent: { name: string; command: string; args: string[]; env: Record<string, string> },
  options: { makeDefault?: boolean } = {}
): Promise<number> {
  return page.evaluate(
    async ({ agent, makeDefault }) => {
      const api = (window as unknown as { agentxp: import('../../src/shared/ipc').AgentXPApi }).agentxp
      const created = await api.agents.create(agent)
      if (makeDefault !== false) await api.agents.setDefault(created.id)
      return created.id
    },
    { agent, makeDefault: options.makeDefault }
  )
}

/** The registered agents as `{ name, command, args, env }` (read only; shows the built-in "Scripted Agent"). */
export async function listAgents(page: Page): Promise<{ name: string; command: string; args: string[]; env: Record<string, string>; isDefault: boolean }[]> {
  return page.evaluate(async () => (await (window as unknown as { agentxp: import('../../src/shared/ipc').AgentXPApi }).agentxp.agents.list()))
}

/**
 * TEST INSTRUMENTATION (read only). The raw protocol traffic the app records in its in-memory event log (the data
 * behind the Event Viewer): `source` 'acp' | 'ag-ui' | 'mcp', `name` = JSON-RPC method or AG-UI event type, oldest
 * first. Behaviour is asserted through the UI; this reader only lets a spec assert the ORDER of protocol messages,
 * which no screen shows completely. It never writes.
 */
export async function readProtocolEvents(page: Page, query: { source?: ProtocolEventDto['source']; sessionId?: number | null }): Promise<ProtocolEventDto[]> {
  const desktopId = desktopIdOf(page)
  return page.evaluate(
    async ({ desktopId, query }) => (await (window as unknown as { agentxp: import('../../src/shared/ipc').AgentXPApi }).agentxp.events.query({ desktopId, ...query, limit: 5000 })),
    { desktopId, query }
  )
}

/** Makes the registered agent with this name the default (used for the built-in "Scripted Agent"). */
export async function setDefaultAgentByName(page: Page, name: string): Promise<void> {
  await page.evaluate(async (name) => {
    const api = (window as unknown as { agentxp: import('../../src/shared/ipc').AgentXPApi }).agentxp
    const found = (await api.agents.list()).find((a) => a.name === name)
    if (!found) throw new Error(`no agent named ${name}`)
    await api.agents.setDefault(found.id)
  }, name)
}

/** An MCP server (not tested, so with no tools yet) and a profile that uses it: the choices of a scheduled action. Returns both ids. */
export async function addServerAndProfile(page: Page, serverName: string, profileName: string): Promise<{ serverId: number; profileId: number }> {
  return page.evaluate(
    async ({ serverName, profileName }) => {
      const api = (window as unknown as { agentxp: import('../../src/shared/ipc').AgentXPApi }).agentxp
      const server = await api.mcp.add({ name: serverName, transport: 'stdio', command: 'node', args: ['-e', ''], url: '', vars: [] })
      const profile = await api.profiles.create({ name: profileName, instructions: 'Review the change.', agentId: null, model: null, skillIds: [], mcpServerIds: [server.id] })
      return { serverId: server.id, profileId: profile.id }
    },
    { serverName, profileName }
  )
}

/** Removes an MCP server (Control Center does this with its Remove button). */
export async function removeServer(page: Page, serverId: number): Promise<void> {
  await page.evaluate(async (id) => (window as unknown as { agentxp: import('../../src/shared/ipc').AgentXPApi }).agentxp.mcp.remove(id), serverId)
}
